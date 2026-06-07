import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

const app = express();
app.use(express.json());

// --- CONFIGURACIÓN DE APIS ENLAZADAS ---
const supabaseUrl = "https://waxwqdefxhmcodfflnxv.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHdxZGVmeGhtY29kZmZsbnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDY0NTIsImV4cCI6MjA9NjAyMjQ1Mn0.2YL7-1TR6mVd0kULSIfOpBVXnZszwZPjy-KQlU5z3Aw";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WHAPI_TOKEN = "84QHBugLbjKDEj19UbWO3qpWxXxil8op";
const WHAPI_URL = "https://gate.whapi.cloud/messages/text";

const OPENAI_API_KEY = "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";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- FUNCIÓN PARA ENVIAR MENSAJES DE WHATSAPP ---
async function enviarMensajeWhatsApp(telefono, texto) {
    try {
        await fetch(WHAPI_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to: telefono, body: texto })
        });
    } catch (err) {
        console.error("❌ Error enviando WhatsApp:", err.message);
    }
}

// --- WEBHOOK PRINCIPAL (EL RECEPTOR DEL BOT) ---
app.post('/webhook-whatsapp', async (req, res) => {
    res.sendStatus(200); 
    
    const mensajes = req.body.messages;
    if (!mensajes || mensajes.length === 0) return;

    const msg = mensajes[0];
    const deTelefono = msg.from; 
    const tipoMensaje = msg.type; 

    // PERSONALIDAD ANTI-GROSERÍAS PARA LOS MUCHACHOS
    if (tipoMensaje === 'text') {
        const textoUsuario = msg.text.body;

        try {
            const respuestaIA = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Eres el Asistente Virtual y Auditor de Ariar Steel LLC. 
                        Hablas un español muy natural, atento, educado pero firme. 
                        REGLA DE ORO DE PERSONALIDAD: Si el usuario te insulta, usa malas palabras, quejas duras (como "la verga", "no mamen", "pinche bot"), IGNORA POR COMPLETO LAS GROSERÍAS. No te enganches en peleas ni te disculpes en exceso. Mantén la calma absoluta y respóndele de forma sumamente profesional y enfocada en solucionar su dinero. Explícale que estás para asegurarte de que reciba cada dólar y pídele amablemente los datos que faltan (Qué día fue, en qué ciudad trabajó y quién era tu encargado).`
                    },
                    { role: "user", content: textoUsuario }
                ]
            });

            const textoBot = respuestaIA.choices[0].message.content;
            await enviarMensajeWhatsApp(deTelefono, textoBot);

        } catch (error) {
            console.error("Error en OpenAI:", error);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor de Ariar Steel listo en puerto ${PORT}`));
