import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const WHAPI_TOKEN = process.env.WHAPI_TOKEN; 
const PORT = process.env.PORT || 10000; // Ajustado al puerto nativo de Render

// Función para responder a WhatsApp
async function enviarMensajeWhatsApp(chatId, texto) {
    try {
        await axios.post('https://gate.whapi.cloud/messages/text', {
            to: chatId,
            body: texto
        }, {
            headers: {
                'Authorization': `Bearer ${WHAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`📤 Mensaje enviado con éxito a ${chatId}`);
    } catch (err) {
        console.error("❌ Error al enviar mensaje por Whapi:", err.response?.data || err.message);
    }
}

app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); 

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // --- SOLUCIÓN DE NÚMERO MAESTRA ---
        // Generamos las dos versiones: con "1" y sin "1" para buscar en Supabase
        let numeroConUno = telefonoUsuario.startsWith('1') ? telefonoUsuario : '1' + telefonoUsuario;
        let numeroSinUno = telefonoUsuario.startsWith('1') ? telefonoUsuario.substring(1) : telefonoUsuario;

        // Buscamos al usuario intentando ambos formatos
        const { data: usuario } = await supabase
            .from('empleados')
            .select('*')
            .or(`telefono.eq.${numeroConUno},telefono.eq.${numeroSinUno}`)
            .maybeSingle(); // Evita que explote si hay duplicados temporales

        // Si no existe el usuario en ningún formato
        if (!usuario) {
            if (textoUsuario.trim().split(" ").length >= 2) {
                await supabase.from('empleados').insert([
                    { nombre: textoUsuario.trim(), telefono: numeroSinUno, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                await enviarMensajeWhatsApp(chatId, `¡Hola! He registrado tu nombre: *${textoUsuario}*. Quedas en espera de que el administrador apruebe tu acceso.`);
                return res.sendStatus(200);
            } else {
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en el sistema de Ariar Steel.\n\nPor favor responde escribiendo tu *Nombre y Apellido* completo.");
                return res.sendStatus(200);
            }
        }

        // Si el usuario está registrado pero no ha sido aprobado por ti
        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación por el administrador.`);
            return res.sendStatus(200);
        }

        // 2. IA para perdidos (Se activa con palabras clave)
        if (textoUsuario.toLowerCase().includes('perdido') || textoUsuario.toLowerCase().includes('no encuentro') || textoUsuario.toLowerCase().includes('donde es') || textoUsuario.toLowerCase().includes('obra')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Información de la Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}\n\n*Indicaciones:* ${listaObras[0].especificaciones}`);
            } else {
                await enviarMensajeWhatsApp(chatId, "No tengo obras registradas en el sistema en este momento.");
            }
            return res.sendStatus(200);
        }

        // 3. Procesamiento inteligente de Nómina / Reporte de Horas con OpenAI
        const promptSistema = `
        Eres el auditor inteligente de nómina de Ariar Steel.
        El usuario que te escribe se llama ${usuario.nombre} y es ${usuario.rol}.
        Responde SIEMPRE en formato JSON con esta estructura exacta:
        {
          "es_reporte_horas": true o false,
          "datos": [{"nombre_empleado": "Nombre", "horas": 8, "obra": "Wichita"}],
          "respuesta_whatsapp": "Mensaje amigable confirmando lo que procesaste."
        }
        `;

        const respuestaIA = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: promptSistema },
                { role: "user", content: textoUsuario }
            ],
            response_format: { type: "json_object" }
        });

        const resultado = JSON.parse(respuestaIA.choices[0].message.content);

        // Si es un reporte válido y quien escribe es admin o encargado, lo guarda en Supabase
        if (resultado.es_reporte_horas && (usuario.rol === 'encargado' || usuario.rol === 'admin')) {
            for (const item of resultado.datos) {
                const { data: obra } = await supabase.from('obras').select('id').ilike('nombre', `%${item.obra}%`).maybeSingle();
                const { data: emp } = await supabase.from('empleados').select('id').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).maybeSingle();

                if (obra && emp) {
                    await supabase.from('registro_horas').insert([
                        {
                            empleado_id: emp.id,
                            obra_id: obra.id,
                            fecha: new Date().toISOString().split('T')[0],
                            horas: item.horas,
                            estado_pago: 'fondo',
                            estado_confirmacion: 'en_espera'
                        }
                    ]);
                }
            }
        }

        await enviarMensajeWhatsApp(chatId, resultado.respuesta_whatsapp || "Entendido, lo tengo registrado.");
        return res.sendStatus(200);

    } catch (error) {
        console.error("❌ Error en el Webhook:", error);
        return res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor de Ariar Steel corriendo en el puerto ${PORT}`);
});