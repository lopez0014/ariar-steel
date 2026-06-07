import express from 'express';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const app = express();
app.use(express.json());

// 🔑 Conexión directa a tus servicios
const openai = new OpenAI({ apiKey: 'sk-proj-tu-llave-de-openai-aqui' }); // Pega tu llave sk- de OpenAI si la tienes
const supabase = createClient(
    'https://waxwqdefxhmcodfflnxv.supabase.co', 
    'sb_publishable_JF8spitq1F98IowUWoICyg_XBB8Igda'
);

const WHAPI_TOKEN = '84QHBugLbjKDEj19UbWO3qpWxXxil8op'; 
const PORT = process.env.PORT || 10000;

// Función para enviar mensajes de vuelta a WhatsApp
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
        console.log(`📤 Mensaje enviado a ${chatId}`);
    } catch (err) {
        console.error("❌ Error Whapi:", err.message);
    }
}

app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); 

        // 🛑 SOLUCIÓN AL DOBLE MENSAJE: Le avisamos a Whapi de inmediato que recibimos el texto
        res.sendStatus(200); 

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // 👑 ACCESO DIRECTO PARA EDWIN (ADMINISTRADOR)
        if (telefonoUsuario.includes('7373883909')) {
            if (textoUsuario.toLowerCase().includes('obra') || textoUsuario.toLowerCase().includes('donde')) {
                await enviarMensajeWhatsApp(chatId, "📍 *Obra: Wichita*\n*Dirección:* Detrás del edificio de ladrillo rojo.\n*Indicaciones:* Revisar material al llegar.");
                return; 
            }
            
            await enviarMensajeWhatsApp(chatId, "👑 ¡Hola Edwin! Ya te reconocí como Administrador. El sistema está listo para tus órdenes o reportes de horas.");
            return; 
        }

        // 👥 FILTRO PARA OTROS TRABAJADORES (CONSULTA A SUPABASE)
        const { data: usuario } = await supabase
            .from('empleados')
            .select('*')
            .eq('telefono', telefonoUsuario)
            .maybeSingle();

        if (!usuario) {
            if (textoUsuario.trim().split(" ").length >= 2) {
                await supabase.from('empleados').insert([
                    { nombre: textoUsuario.trim(), telefono: telefonoUsuario, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                await enviarMensajeWhatsApp(chatId, `¡Hola! He registrado tu nombre: *${textoUsuario}*. Quedas en espera de que el administrador apruebe tu acceso.`);
                return;
            } else {
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en Ariar Steel. Por favor responde escribiendo tu *Nombre y Apellido* completo.");
                return;
            }
        }

        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
        }

        // 🤖 PROCESAMIENTO CON INTELIGENCIA ARTIFICIAL (OPENAI) PARA REPORTES
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
        return;

    } catch (error) {
        console.error("❌ Error en el Webhook:", error);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo de Ariar Steel corriendo en el puerto ${PORT}`);
});