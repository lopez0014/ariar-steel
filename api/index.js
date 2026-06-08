import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import cron from 'node-cron'; // ⏰ El reloj automático

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const WHAPI_TOKEN = process.env.WHAPI_TOKEN; 
const PORT = process.env.PORT || 10000;

// Función estándar para enviar mensajes de texto por WhatsApp
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

// Función para descargar la foto desde los servidores de Whapi y convertirla a Base64
async function descargarImagenBase64(mediaUrl) {
    try {
        const respuesta = await axios.get(mediaUrl, {
            headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` },
            responseType: 'arraybuffer'
        });
        return Buffer.from(respuesta.data, 'binary').toString('base64');
    } catch (err) {
        console.error("❌ Error al descargar imagen de Whapi:", err.message);
        throw err;
    }
}

// Función interna para el envío masivo de bienvenida
async function ejecutarEnvioMasivo() {
    const { data: trabajadores, error } = await supabase
        .from('empleados')
        .select('nombre, telefono')
        .eq('estado', 'activo')
        .eq('rol', 'trabajador');

    if (error) throw error;
    if (!trabajadores || trabajadores.length === 0) {
        return { exito: false, conteo: 0, msg: "No encontré trabajadores activos en Supabase." };
    }

    for (const t of trabajadores) {
        const chatId = `${t.telefono}@c.us`;
        const mensaje = `¡Hola *${t.nombre}*! 🛠️\n\nSoy el asistente virtual oficial de *Ariar Steel*. A partir de ahora, estaré encargado de llevar el control de tus horas de trabajo junto con tu encargado para que todo tu pago esté siempre en orden y al día.\n\nNo es necesario que respondas a este mensaje, ¡que tengas una excelente jornada laboral! 🦾🔥`;
        await enviarMensajeWhatsApp(chatId, mensaje);
    }

    return { exito: true, conteo: trabajadores.length };
}

// ==========================================
// ⏰ TAREAS AUTOMÁTICAS (CRON JOBS)
// ==========================================

// 🧪 1. CRON DE PRUEBA - Hoy a las 9:30 PM (Hora 21:30)
cron.schedule('30 21 * * *', async () => {
    console.log("⏰ Ejecutando prueba automatizada de las 9:30 PM...");
    try {
        const { data: trabajadores } = await supabase
            .from('empleados')
            .select('nombre, telefono')
            .eq('estado', 'activo')
            .eq('rol', 'trabajador');

        if (!trabajadores || trabajadores.length === 0) {
            console.log("⚠️ No se encontraron trabajadores activos para recibir la prueba.");
            return;
        }

        for (const t of trabajadores) {
            const chatId = `${t.telefono}@c.us`;
            const mensaje = `¡Buen día, *${t.nombre}*! ☀️ *(Prueba de control de horas de las 9:30 PM)*\n\nRecuerda reportar tus horas con tu encargado al finalizar la jornada de hoy para que todo tu pago quede registrado a tiempo.\n\n¡Que tengas un excelente día de trabajo! 🛠️ *Ariar Steel*`;
            await enviarMensajeWhatsApp(chatId, mensaje);
        }
    } catch (error) {
        console.error("❌ Error en la prueba de las 9:30 PM:", error);
    }
}, {
    scheduled: true,
    timezone: "America/Chicago"
});

// 2. Recordatorio real de la mañana - Todos los días a las 7:00 AM
cron.schedule('0 7 * * *', async () => {
    console.log("⏰ Ejecutando recordatorio automático de las 7:00 AM...");
    try {
        const { data: trabajadores } = await supabase
            .from('empleados')
            .select('nombre, telefono')
            .eq('estado', 'activo')
            .eq('rol', 'trabajador');

        if (!trabajadores || trabajadores.length === 0) return;

        for (const t of trabajadores) {
            const chatId = `${t.telefono}@c.us`;
            const mensaje = `¡Buen día, *${t.nombre}*! ☀️\n\nRecuerda reportar tus horas con tu encargado al finalizar la jornada de hoy para que todo tu pago quede registrado a tiempo.\n\n¡Que tengas un excelente día de trabajo! 🛠️ *Ariar Steel*`;
            await enviarMensajeWhatsApp(chatId, mensaje);
        }
    } catch (error) {
        console.error("❌ Error en cron de la mañana:", error);
    }
}, {
    scheduled: true,
    timezone: "America/Chicago"
});

// 3. Reporte real del final del día - Todos los días a las 6:00 PM
cron.schedule('0 18 * * *', async () => {
    console.log("⏰ Ejecutando reporte automático de las 6:00 PM...");
    try {
        const hoy = new Date().toISOString().split('T')[0];

        const { data: trabajadores } = await supabase
            .from('empleados')
            .select('id, Exton, nombre, telefono')
            .eq('estado', 'activo')
            .eq('rol', 'trabajador');

        if (!trabajadores || trabajadores.length === 0) return;

        for (const t of trabajadores) {
            const chatId = `${t.telefono}@c.us`;

            const { data: horasHoy } = await supabase
                .from('registro_horas')
                .select('horas, nombre_obra')
                .eq('empleado_id', t.id)
                .eq('fecha', hoy);

            if (horasHoy && horasHoy.length > 0) {
                let detalleHoras = "";
                horasHoy.forEach(reg => {
                    detalleHoras += `📍 *Obra:* ${reg.nombre_obra} | ⏱️ *Horas:* ${reg.horas} hrs.\n`;
                });

                const mensajeConHoras = `Hola *${t.nombre}*! 👍\n\nEste es el resumen de tus horas registradas el día de hoy (*${hoy}*):\n\n${detalleHoras}\nSi ves algún error o falta alguna obra, avísale de inmediato a tu encargado para corregirlo.`;
                await enviarMensajeWhatsApp(chatId, mensajeConHoras);
            } else {
                const mensajeSinHoras = `Hola *${t.nombre}*. ⚠️\n\nEl día de hoy no se encontraron horas registradas a tu nombre en el sistema.\n\nSi trabajaste hoy, por favor comunícate de inmediato con tu encargado para que agregue tus horas correctamente.`;
                await enviarMensajeWhatsApp(chatId, mensajeSinHoras);
            }
        }
    } catch (error) {
        console.error("❌ Error en cron de la tarde:", error);
    }
}, {
    scheduled: true,
    timezone: "America/Chicago"
});

// ==========================================
// 📡 WEBHOOKS Y ENRUTAMIENTO API
// ==========================================

app.get('/enviar-bienvenida-masiva', async (req, res) => {
    try {
        const resultado = await ejecutarEnvioMasivo();
        if (!resultado.exito) return res.status(400).json({ mensaje: resultado.msg });
        res.json({ mensaje: `¡Éxito! Mensaje enviado a ${resultado.conteo} trabajadores.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
        const esImagen = msg.type === 'image';
        const mediaUrl = esImagen ? msg.image?.link : null;

        processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario, esImagen, mediaUrl);

    } catch (error) {
        console.error("❌ Error en Webhook:", error);
    }
});

async function processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario, esImagen, mediaUrl) {
    try {
        const { data: usuario } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();

        if (!usuario) {
            if (!esImagen && textoUsuario.trim().split(" ").length >= 2) {
                const promptRegistro = `Analiza el mensaje y extrae SOLO el Nombre y Apellido real limpio: "${textoUsuario}"`;
                const respuestaRegistro = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: promptRegistro }]
                });
                const nombreLimpio = respuestaRegistro.choices[0].message.content.trim();

                await supabase.from('empleados').insert([
                    { nombre: nombreLimpio, telefono: telefonoUsuario, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                await enviarMensajeWhatsApp(chatId, `¡Hola! He registrado tu nombre: *${nombreLimpio}*. Quedas en espera de aprobación.`);
                return;
            } else {
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en Ariar Steel. Escribe tu *Nombre y Apellido* completo.");
                return;
            }
        }

        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
        }

        const tienePermisosJefe = usuario.rol === 'admin' || usuario.rol === 'encargado';

        if (esImagen && mediaUrl) {
            if (!tienePermisosJefe) {
                await enviarMensajeWhatsApp(chatId, `❌ Lo siento *${usuario.nombre}*, no tienes autorización para enviar reportes gráficos.`);
                return;
            }

            await enviarMensajeWhatsApp(chatId, "📸 He recibido tu foto. Estoy procesando y leyendo la hoja de horas con Inteligencia Artificial, dame unos segundos... ⏳");
            const imagenBase64 = await descargarImagenBase64(mediaUrl);

            const promptVision = `
            Estás viendo una fotografía de un reporte de horas para la empresa "Ariar Steel". Extrae el nombre de cada trabajador, sus horas y la obra mencionada.
            Responde UNICAMENTE con un objeto JSON válido, sin textos extras, sin bloques markdown de código:
            {
              "es_reporte_horas": true,
              "datos": [{"nombre_empleado": "Nombre", "horas": 8, "obra": "Wichita"}],
              "respuesta_whatsapp": "✅ ¡Éxito! He procesado la fotografía correctamente."
            }
            `;

            const respuestaVision = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptVision },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imagenBase64}` } }
                        ]
                    }
                ]
            });

            let contenidoRespuesta = respuestaVision.choices[0].message.content.trim();
            if (contenidoRespuesta.includes("{")) {
                contenidoRespuesta = contenidoRespuesta.substring(contenidoRespuesta.indexOf("{"), contenidoRespuesta.lastIndexOf("}") + 1);
            }

            try {
                const resultado = JSON.parse(contenidoRespuesta);
                if (resultado.es_reporte_horas && resultado.datos && resultado.datos.length > 0) {
                    let registrosExitosos = 0;
                    for (const item of resultado.datos) {
                        const { data: obra } = await supabase.from('obras').select('id, nombre').ilike('nombre', `%${item.obra}%`).maybeSingle();
                        const { data: emp } = await supabase.from('empleados').select('id, nombre').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).maybeSingle();

                        if (obra) {
                            await supabase.from('registro_horas').insert([
                                {
                                    empleado_id: emp ? emp.id : usuario.id,
                                    nombre_empleado: emp ? emp.nombre : item.nombre_empleado, 
                                    obra_id: obra.id,
                                    nombre_obra: obra.nombre,
                                    fecha: new Date().toISOString().split('T')[0],
                                    horas: parseFloat(item.horas) || 0,
                                    estado_pago: 'fondo',
                                    estado_confirmacion: 'en_espera'
                                }
                            ]);
                            registrosExitosos++;
                        }
                    }
                    if (registrosExitosos > 0) {
                        await enviarMensajeWhatsApp(chatId, `✅ ¡Éxito! He procesado la foto y registré las horas de *${registrosExitosos} trabajadores* en Supabase.`);
                    } else {
                        await enviarMensajeWhatsApp(chatId, "⚠️ Pude leer la foto, pero la obra mencionada no coincide con las de Supabase.");
                    }
                    return;
                }
            } catch (err) {
                console.error(err);
            }
            await enviarMensajeWhatsApp(chatId, "❌ No se pudo extraer la información de la imagen de forma limpia.");
            return;
        }

        let textoNormalizado = textoUsuario.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 

        if (tienePermisosJefe) {
            if (textoNormalizado === 'disparar bienvenida masiva') {
                await enviarMensajeWhatsApp(chatId, "⏳ Iniciando el envío de mensajes de bienvenida...");
                const resultado = await ejecutarEnvioMasivo();
                if (resultado.exito) {
                    await enviarMensajeWhatsApp(chatId, `✅ ¡Éxito! Mensajes enviados a ${resultado.conteo} trabajadores.`);
                } else {
                    await enviarMensajeWhatsApp(chatId, `⚠️ Nota: ${resultado.msg}`);
                }
                return;
            }

            if (textoNormalizado.startsWith('agregar a')) {
                try {
                    const partes = textoUsuario.split(/con el numero|con el número|numero|número/i);
                    if (partes.length >= 2) {
                        const nombreNuevo = partes[0].replace(/agregar a/i, '').trim();
                        let telefonoNuevo = partes[1].trim().replace(/[^0-9]/g, ''); 
                        if (telefonoNuevo.startsWith('1') && telefonoNuevo.length > 10) {
                            telefonoNuevo = telefonoNuevo.substring(1);
                        }
                        const { error } = await supabase.from('empleados').insert([
                            { nombre: nombreNuevo, telefono: telefonoNuevo, rol: 'trabajador', estado: 'activo' }
                        ]);
                        if (error) throw error;
                        await enviarMensajeWhatsApp(chatId, `✅ *¡Listo!* He registrado a *${nombreNuevo}* con el número *${telefonoNuevo}* en Supabase.`);
                        return;
                    }
                } catch (err) {
                    console.error(err);
                }
                await enviarMensajeWhatsApp(chatId, "❌ Formato incorrecto.");
                return;
            }
        }

        const tieneHorasNumeros = /\b\d+\b/.test(textoNormalizado); 
        if (!tieneHorasNumeros && (textoNormalizado.includes('donde es') || textoNormalizado.includes('direccion') || textoNormalizado.trim() === 'obra')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}`);
            }
            return;
        }

        const promptSistema = `
        Eres el asistente de "Ariar Steel". Hablas con ${usuario.nombre} (Rol: ${usuario.rol}).
        Si reporta horas, responde estrictamente en este formato JSON:
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

        let contenidoRespuesta = respuestaIA.choices[0].message.content.trim();
        if (contenidoRespuesta.startsWith("```json")) {
            contenidoRespuesta = contenidoRespuesta.substring(7, contenidoRespuesta.length - 3).trim();
        }

        if (contenidoRespuesta.startsWith('{') && contenidoRespuesta.endsWith('}')) {
            const resultado = JSON.parse(contenidoRespuesta);
            if (resultado.es_reporte_horas) {
                if (tienePermisosJefe) {
                    for (const item of resultado.datos) {
                        const { data: obra } = await supabase.from('obras').select('id, nombre').ilike('nombre', `%${item.obra}%`).maybeSingle();
                        const { data: emp } = await supabase.from('empleados').select('id, nombre').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).maybeSingle();

                        if (obra) {
                            await supabase.from('registro_horas').insert([
                                {
                                    empleado_id: emp ? emp.id : usuario.id,
                                    nombre_empleado: emp ? emp.nombre : item.nombre_empleado, 
                                    obra_id: obra.id,
                                    nombre_obra: obra.nombre,
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
                } else {
                    await enviarMensajeWhatsApp(chatId, `❌ Lo siento *${usuario.nombre}*, los trabajadores no tienen autorización para registrar horas en el sistema.`);
                    return;
                }
            }
        }

        await enviarMensajeWhatsApp(chatId, contenidoRespuesta);
        return; 

    } catch (error) {
        console.error("❌ Error en procesamiento:", error);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});