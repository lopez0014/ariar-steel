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

// El token de Whapi lo va a leer de tus variables de Render
const WHAPI_TOKEN = process.env.WHAPI_TOKEN; 

const PORT = process.env.PORT || 3000;

// Función auxiliar para mandarte el mensaje real a tu celular
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

        const chatId = msg.chat_id; // Mantiene el formato con @c.us necesario para Whapi
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // 1. Identificar quién escribe
        const { data: usuario } = await supabase
            .from('empleados')
            .select('*')
            .eq('telefono', telefonoUsuario)
            .single();

        if (!usuario) {
            if (textoUsuario.trim().split(" ").length >= 2) {
                await supabase.from('empleados').insert([
                    { nombre: textoUsuario.trim(), telefono: telefonoUsuario, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                await enviarMensajeWhatsApp(chatId, `¡Hola! He registrado tu nombre: *${textoUsuario}*. Quedas en espera de que el administrador apruebe tu acceso.`);
                return res.sendStatus(200);
            } else {
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en el sistema de Ariar Steel.\n\nPor favor responde escribiendo tu *Nombre y Apellido* completo.");
                return res.sendStatus(200);
            }
        }

        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return res.sendStatus(200);
        }

        // 2. IA para perdidos
        if (textoUsuario.toLowerCase().includes('perdido') || textoUsuario.toLowerCase().includes('no encuentro') || textoUsuario.toLowerCase().includes('donde es')) {
            const hoy = new Date().toISOString().split('T')[0];
            const { data: registro } = await supabase
                .from('registro_horas')
                .select('obra_id(nombre, direccion, especificaciones)')
                .eq('empleado_id', usuario.id)
                .order('creado_el', { ascending: false })
                .limit(1);

            if (registro && registro.length > 0) {
                const obra = registro[0].obra_id;
                await enviarMensajeWhatsApp(chatId, `📍 *Indicaciones para tu obra (${obra.nombre}):*\n\n*Dirección:* ${obra.direccion}\n\n*Especificaciones:* ${obra.especificaciones}`);
            } else {
                const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
                if (listaObras && listaObras.length > 0) {
                    await enviarMensajeWhatsApp(chatId, `No veo una obra asignada hoy, pero si vas a *${listaObras[0].nombre}*:\n\n${listaObras[0].especificaciones}`);
                }
            }
            return res.sendStatus(200);
        }

        // 3. Procesamiento con OpenAI
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

        if (resultado.es_reporte_horas && (usuario.rol === 'encargado' || usuario.rol === 'admin')) {
            for (const item of resultado.datos) {
                const { data: obra } = await supabase.from('obras').select('id').ilike('nombre', `%${item.obra}%`).single();
                const { data: emp } = await supabase.from('empleados').select('id').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).single();

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
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});