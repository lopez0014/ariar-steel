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
        console.error("❌ Error Whapi:", err.response?.data || err.message);
    }
}

app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); 

        res.sendStatus(200); 

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        const textoUsuario = msg.text?.body || "";

        processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario);

    } catch (error) {
        console.error("❌ Error en Webhook:", error);
    }
});

async function processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario) {
    try {
        console.log(`✉️ Procesando para ${telefonoUsuario}: "${textoUsuario}"`);
        
        // Limpiamos el texto quitándole acentos raros para que el sistema no se confunda
        let textoNormalizado = textoUsuario.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quita acentos (número -> numero)

        // 👑 1. FILTRO ULTRA-TOLERANTE PARA EDWIN (AGREGAR EMPLEADOS)
        if (telefonoUsuario.includes('7373883909')) {
            if (textoNormalizado.startsWith('agregar a')) {
                try {
                    // Cortamos usando expresiones regulares para que acepte "con el numero", "numero", "num", o "con el numero"
                    const partes = textoUsuario.split(/con el numero|con el número|numero|número/i);
                    
                    if (partes.length >= 2) {
                        const nombreNuevo = partes[0].replace(/agregar a/i, '').trim();
                        let telefonoNuevo = partes[1].trim().replace(/[^0-9]/g, ''); // Deja SOLO los números

                        if (nombreNuevo && telefonoNuevo) {
                            // Si el número viene con el '1' de USA al inicio y es largo, se lo quitamos
                            if (telefonoNuevo.startsWith('1') && telefonoNuevo.length > 10) {
                                telefonoNuevo = telefonoNuevo.substring(1);
                            }

                            // Guardamos directo en Supabase como activo
                            const { error } = await supabase.from('empleados').insert([
                                { nombre: nombreNuevo, telefono: telefonoNuevo, rol: 'trabajador', estado: 'activo' }
                            ]);

                            if (error) throw error;

                            await enviarMensajeWhatsApp(chatId, `✅ *¡Listo Edwin!* He registrado a *${nombreNuevo}* con el número *${telefonoNuevo}* como trabajador activo en Supabase. Ya puede usar el sistema.`);
                            return; 
                        }
                    }
                } catch (err) {
                    console.error("❌ Error al registrar:", err);
                }
                
                // Si entra a "agregar a" pero no se procesó bien, le da un ejemplo masticadito
                await enviarMensajeWhatsApp(chatId, "❌ *Error de formato.*\n\nEscríbeme exactamente así (copia, pega y cambia los datos):\n\n_Agregar a Melvin Pop con el numero 7371112222_");
                return;
            }
        }

        // 👥 2. VALIDACIÓN DE USUARIOS
        let usuario = null;
        if (telefonoUsuario.includes('7373883909')) {
            usuario = { id: 1, nombre: "Edwin", rol: "admin", estado: "activo" };
        } else {
            const { data } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();
            usuario = data;
        }

        if (!usuario) {
            if (textoUsuario.trim().split(" ").length >= 2) {
                await supabase.from('empleados').insert([
                    { nombre: textoUsuario.trim(), telefono: telefonoUsuario, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                await enviarMensajeWhatsApp(chatId, `¡Hola! He registrado tu nombre: *${textoUsuario}*. Quedas en espera de aprobación.`);
                return;
            } else {
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en Ariar Steel. Por favor escribe tu *Nombre y Apellido* completo.");
                return;
            }
        }

        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
        }

        // 📍 3. CONSULTA DE OBRAS DIRECTA
        if (textoNormalizado.includes('obra') || textoNormalizado.includes('donde') || textoNormalizado.includes('direccion')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Información de la Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}\n\n*Indicaciones:* ${listaObras[0].especificaciones || 'Sin notas adicionales.'}`);
            } else {
                await enviarMensajeWhatsApp(chatId, "Hola Edwin, no veo ninguna obra guardada en tu Supabase todavía.");
            }
            return;
        }

        // 🤖 4. MÓDULO INTELIGENCIA ARTIFICIAL (OpenAI)
        const promptSistema = `
        Eres el asistente automatizado de la empresa "Ariar Steel".
        El usuario con el que hablas se llama ${usuario.nombre} y tiene el rango de ${usuario.rol}.
        
        REGLAS DE ORO DE TU COMPORTAMIENTO:
        1. Responde de forma directa, concisa y al grano. No uses rodeos.
        2. 🛑 PROHIBIDO: Jamás termines tus mensajes diciendo "cómo te puedo ayudar hoy", "¿en qué más te ayudo?", ni frases similares. Sé un asistente serio de construcción.
        3. Da la información solicitada en un solo bloque de texto corto y termina ahí. No agregues saludos extras al final.
        
        Si te reporta horas de trabajo, responde ESTRICTAMENTE con este formato JSON y nada más:
        {
          "es_reporte_horas": true,
          "datos": [{"nombre_empleado": "Nombre", "horas": 8, "obra": "Wichita"}],
          "respuesta_whatsapp": "Mensaje corto confirmando el registro."
        }
        `;

        const respuestaIA = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: promptSistema },
                { role: "user", content: textoUsuario }
            ]
        });

        const contenidoRespuesta = respuestaIA.choices[0].message.content.trim();

        if (contenidoRespuesta.startsWith('{') && contenidoRespuesta.endsWith('}')) {
            const resultado = JSON.parse(contenidoRespuesta);

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
                await enviarMensajeWhatsApp(chatId, resultado.respuesta_whatsapp);
                return; 
            }
        }

        await enviarMensajeWhatsApp(chatId, contenidoRespuesta);
        return; 

    } catch (error) {
        console.error("❌ Error en procesamiento de fondo:", error);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo de Ariar Steel corriendo en el puerto ${PORT}`);
});