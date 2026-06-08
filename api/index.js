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

// Función estándar para enviar mensajes de texto
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

// Ruta Web para el envío masivo
app.get('/enviar-bienvenida-masiva', async (req, res) => {
    try {
        const resultado = await ejecutarEnvioMasivo();
        if (!resultado.exito) return res.status(400).json({ mensaje: resultado.msg });
        res.json({ mensaje: `¡Éxito! Mensaje enviado a ${resultado.conteo} trabajadores.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook Principal
app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); 

        res.sendStatus(200); 

        const chatId = msg.chat_id; 
        const telefonoUsuario = chatId.split('@')[0]; 
        
        // Revisar si viene texto o es una foto/imagen
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
        // 1. Buscar al usuario en Supabase para validar permisos
        const { data: usuario } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();

        // Si no está registrado, flujo de auto-registro (solo texto)
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

        // Si está congelado
        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
        }

        // Validar si el usuario tiene permisos de jefe (admin o encargado)
        const tienePermisosJefe = usuario.rol === 'admin' || usuario.rol === 'encargado';

        // 📸 FLUJO SI EL USUARIO MANDA UNA FOTO
        if (esImagen && mediaUrl) {
            if (!tienePermisosJefe) {
                await enviarMensajeWhatsApp(chatId, `❌ Lo siento *${usuario.nombre}*, no tienes autorización para enviar reportes gráficos.`);
                return;
            }

            await enviarMensajeWhatsApp(chatId, "📸 He recibido tu foto. Estoy procesando y leyendo la hoja de horas con Inteligencia Artificial, dame unos segundos... ⏳");

            // Descargar la foto y pasarla a Base64
            const imagenBase64 = await descargarImagenBase64(mediaUrl);

            // Prompt especial de Visión para leer la lista
            const promptVision = `
            Estás viendo una fotografía de una hoja de reporte de horas manuscrita o impresa de la empresa "Ariar Steel".
            Tu trabajo es leer cuidadosamente la imagen, identificar los nombres de los trabajadores, las horas que hicieron y la obra (Wichita u otra).
            
            Devuelve ESTRICTAMENTE un JSON con este formato exacto, sin textos extras, sin bloques markdown de código:
            {
              "es_reporte_horas": true,
              "datos": [
                {"nombre_empleado": "Nombre Completo", "horas": 8, "obra": "Nombre de la Obra"}
              ],
              "respuesta_whatsapp": "✅ ¡Éxito! He procesado la foto correctamente y registré las horas de la lista."
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
            if (contenidoRespuesta.startsWith("```json")) {
                contenidoRespuesta = contenidoRespuesta.substring(7, contenidoRespuesta.length - 3).trim();
            }

            try {
                const resultado = JSON.parse(contenidoRespuesta);
                if (resultado.es_reporte_horas && resultado.datos.length > 0) {
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
                }
            } catch (err) {
                console.error("❌ Error al parsear JSON de Visión:", err);
                await enviarMensajeWhatsApp(chatId, "❌ Hubo un problema al interpretar los datos de la fotografía. Intenta tomarla con mejor luz o más cerca.");
                return;
            }
            return;
        }

        // 📝 FLUJO NORMAL SI EL USUARIO MANDA TEXTO
        let textoNormalizado = textoUsuario.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 

        // Comandos rápidos de Admin
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

        // Consultas de dirección de obra
        const tieneHorasNumeros = /\b\d+\b/.test(textoNormalizado); 
        if (!tieneHorasNumeros && (textoNormalizado.includes('donde es') || textoNormalizado.includes('direccion') || textoNormalizado.trim() === 'obra')) {
            const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
            if (listaObras && listaObras.length > 0) {
                await enviarMensajeWhatsApp(chatId, `📍 *Obra (${listaObras[0].nombre}):*\n\n*Dirección:* ${listaObras[0].direccion}`);
            }
            return;
        }

        // IA para procesar reportes de texto
        const promptSistema = `
        Eres el asistente de "Ariar Steel". Hablas con ${usuario.nombre} (Rol: ${usuario.role || usuario.rol}).
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