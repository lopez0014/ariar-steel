import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());

// 🔑 Conexión segura usando variables de entorno (Protegido contra bloqueos de GitHub)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const WHAPI_TOKEN = process.env.WHAPI_TOKEN; 
const PORT = process.env.PORT || 10000;

// Función para enviar mensajes a WhatsApp mediante Whapi
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
        console.error("❌ Error Whapi:", err.response?.data || err.message);
    }
}

app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); 

        // 🛑 CONFIGURACIÓN ANTIDUPLICADO: Responde inmediato a Whapi para evitar dobles mensajes
        res.sendStatus(200); 

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // 👑 CONTROL DE IDENTIDAD (Bypass de Oro para Edwin + Consulta a Base de Datos)
        let usuario = null;
        if (telefonoUsuario.includes('7373883909')) {
            // Te da el rango VIP directamente para que no dependas de cómo esté escrito el número
            usuario = { id: 1, nombre: "Edwin", rol: "admin", estado: "activo" };
        } else {
            // Para cualquier otro número, consulta a Supabase normalmente
            const { data } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();
            usuario = data;
        }

        // Si el número no pertenece a Edwin ni existe en Supabase
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

        // Si es un empleado en espera
        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
        }

        // 📍 1. MÓDULO DE CASOS DE EMERGENCIA (¿Dónde es la obra?) - CONSULTA REAL EN SUPABASE
        if (textoUsuario.toLowerCase().includes('obra') || textoUsuario.toLowerCase().includes('donde') || textoUsuario.toLowerCase().includes('dirección')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Información de la Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}\n\n*Indicaciones:* ${listaObras[0].specificaciones || listaObras[0].especificaciones || 'Sin notas adicionales.'}`);
            } else {
                await enviarMensajeWhatsApp(chatId, "Hola Edwin, no veo ninguna obra guardada en la tabla 'obras' de tu Supabase todavía. Agrega una para que pueda darte las direcciones.");
            }
            return;
        }

        // 🤖 2. MÓDULO INTELIGENTE (OpenAI) - Responde preguntas libres y analiza reportes de horas
        const promptSistema = `
        Eres el asistente e inteligencia artificial exclusiva de la empresa "Ariar Steel".
        El usuario que te escribe se llama ${usuario.nombre} y tiene el rol de ${usuario.rol}.
        
        Si te está saludando o haciendo preguntas generales sobre qué puedes hacer, responde de manera amigable, profesional y concisa.
        
        Si te está reportando horas trabajadas, DEBES responder de manera ESTRICTA con un objeto JSON válido que contenga la estructura abajo descrita.
        Estructura JSON requerida para reportes de horas:
        {
          "es_reporte_horas": true,
          "datos": [{"nombre_empleado": "Nombre detectado", "horas": 8, "obra": "Nombre de la obra"}],
          "respuesta_whatsapp": "Mensaje amigable confirmando que procesaste las horas de manera exitosa."
        }
        
        Si no es un reporte de horas, responde normal usando texto, dejando "es_reporte_horas": false en tu mente y devolviendo la respuesta directa en texto libre.
        `;

        const respuestaIA = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: promptSistema },
                { role: "user", content: textoUsuario }
            ]
        });

        const contenidoRespuesta = respuestaIA.choices[0].message.content.trim();

        // Verificamos si la IA intentó responder en formato JSON para un reporte de horas
        if (contenidoRespuesta.startsWith('{') && contenidoRespuesta.endsWith('}')) {
            const resultado = JSON.parse(contenidoRespuesta);

            if (resultado.es_reporte_horas && (usuario.rol === 'encargado' || usuario.rol === 'admin')) {
                for (const item of resultado.datos) {
                    // Busca dinámicamente la obra y el empleado en Supabase
                    const { data: obra } = await supabase.from('obras').select('id').ilike('nombre', `%${item.obra}%`).maybeSingle();
                    const { data: emp } = await supabase.from('empleados').select('id').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).maybeSingle();

                    if (obra && emp) {
                        // Inserta el registro automático de nómina
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
                await enviarMensajeWhatsApp(chatId, resultado.respuesta_whatsapp);
                return;
            }
        }

        // Si es una conversación normal (preguntas de qué hace, saludos, etc.) manda el texto directo de la IA
        await enviarMensajeWhatsApp(chatId, contenidoRespuesta);
        return;

    } catch (error) {
        console.error("❌ Error General en Webhook:", error);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo de Ariar Steel corriendo en el puerto ${PORT}`);
});