import express from 'express';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const app = express();
app.use(express.json());

// 🔑 Metemos tus llaves directas para que el bot NO tenga excusa de no leerlas
const openai = new OpenAI({ apiKey: 'sk-proj-tu-llave-de-openai-aqui' }); // <- Pon tu sk- de OpenAI aquí si te la sabes, si no déjala así
const supabase = createClient(
    'https://waxwqdefxhmcodfflnxv.supabase.co', 
    'sb_publishable_JF8spitq1F98IowUWoICyg_XBB8Igda'
);

const WHAPI_TOKEN = '84QHBugLbjKDEj19UbWO3qpWxXxil8op'; 
const PORT = process.env.PORT || 10000;

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

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // TRUCO MAESTRO: Si eres tú, te saltas la validación y te da acceso de ADMIN directo
        if (telefonoUsuario.includes('7373883909')) {
            if (textoUsuario.toLowerCase().includes('obra') || textoUsuario.toLowerCase().includes('donde')) {
                await enviarMensajeWhatsApp(chatId, "📍 *Obra: Wichita*\n*Dirección:* Detrás del edificio de ladrillo rojo.\n*Indicaciones:* Revisar material al llegar.");
                return res.sendStatus(200);
            }
            
            await enviarMensajeWhatsApp(chatId, "👑 ¡Hola Edwin! Ya te reconocí como Administrador. El sistema está listo para tus órdenes o reportes de horas.");
            return res.sendStatus(200);
        }

        // Para los demás trabajadores, se busca en Supabase normal
        const { data: usuario } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();

        if (!usuario) {
            await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en Ariar Steel. Por favor escribe tu Nombre y Apellido.");
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error:", error);
        return res.sendStatus(500);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor forzado en puerto ${PORT}`));