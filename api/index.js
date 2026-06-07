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

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // 👑 CONTROL DE IDENTIDAD (Bypass de Oro para Edwin)
        let usuario = null;
        let esEdwin = telefonoUsuario.includes('7373883909');

        if (esEdwin) {
            usuario = { id: 1, nombre: "Edwin", rol: "admin", estado: "activo" };
            
            // 🔥 FUNCIÓN SUPERADMIN: REGISTRAR EMPLEADOS DIRECTO DESDE WHATSAPP
            const textoLimpio = textoUsuario.toLowerCase();
            if (textoLimpio.startsWith('agregar a') && textoLimpio.includes('numero')) {
                try {
                    // Sintaxis: "Agregar a [Nombre] con el numero [Telefono]"
                    // Ejemplo: Agregar a Juan Perez con el numero 17371112222
                    const partes = textoUsuario.split(/con el numero|con el número/i);
                    const nombreNuevo = partes[0].replace(/agregar a/i, '').trim();
                    let telefonoNuevo = partes[1].trim().replace(/[^0-9]/g, ''); // Limpia espacios o guiones
                    
                    if (nombreNuevo && telefonoNuevo) {
                        // Si el número viene con el '1' de USA al inicio y mide más de 10 dígitos, se lo quitamos para estandarizar en Supabase
                        if (telefonoNuevo.startsWith('1') && telefonoNuevo.length > 10) {
                            telefonoNuevo = telefonoNuevo.substring(1);
                        }

                        // Insertamos directo como ACTIVO
                        const { error } = await supabase.from('empleados').insert([
                            { nombre: nombreNuevo, telefono: telefonoNuevo, rol: 'trabajador', estado: 'activo' }
                        ]);

                        if (error) throw error;

                        await enviarMensajeWhatsApp(chatId, `✅ *¡Entendido, Edwin!* He registrado a *${nombreNuevo}* con el número *${telefonoNuevo}* como trabajador activo. Ya puede usar el bot.`);
                        return;
                    }
                } catch (err) {
                    await enviarMensajeWhatsApp(chatId, "❌ *Error de formato.* Recuerda escribirme exactamente:\n_Agregar a Nombre Apellido con el numero 1234567890_");
                    return;
                }
            }
        } else {
            const { data } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();
            usuario = data;
        }

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

        // 📍 1. ¿Dónde es la obra?
        if (textoUsuario.toLowerCase().includes('obra') || textoUsuario.toLowerCase().includes('donde') || textoUsuario.toLowerCase().includes('dirección')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Información de la Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}\n\n*Indicaciones:* ${listaObras[0].especificaciones || 'Sin notas adicionales.'}`);
            } else {
                await enviarMensajeWhatsApp(chatId, "Hola Edwin, no veo ninguna obra guardada en la tabla 'obras' de tu Supabase todavía.");
            }
            return;
        }

        // 🤖 2. MÓDULO INTELIGENCIA ARTIFICIAL (OpenAI)
        const promptSistema = `
        Eres el asistente de la empresa "Ariar Steel".
        El usuario se llama ${usuario.nombre} y es ${usuario.rol}.
        Si te saluda o habla normal, responde amigable.
        Si te reporta horas, responde ESTRICTAMENTE con este JSON:
        {
          "es_reporte_horas": true,
          "datos": [{"nombre_empleado": "Nombre", "horas": 8, "obra": "Wichita"}],
          "respuesta_whatsapp": "Mensaje confirmando el registro."
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
        console.error("❌ Error General en Webhook:", error);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo de Ariar Steel corriendo en el puerto ${PORT}`);
});