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

async function ejecutarEnvioMasivo() {
    const { data: trabajadores, error } = await supabase
        .from('empleados')
        .select('nombre, telefono')
        .eq('estado', 'activo')
        .eq('role', 'trabajador'); // Nota: usa la columna exacta de tu DB, si es 'rol' o 'role'

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

        processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario);

    } catch (error) {
        console.error("❌ Error en Webhook:", error);
    }
});

async function processarMensajeDeFondo(chatId, telefonoUsuario, textoUsuario) {
    try {
        let textoNormalizado = textoUsuario.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 

        // 🔍 AHORA BUSCAMOS A TODO EL MUNDO DIRECTAMENTE EN SUPABASE (INCLUYÉNDOTE A TI)
        const { data: usuario } = await supabase.from('empleados').select('*').eq('telefono', telefonoUsuario).maybeSingle();

        // Si el número tiene comandos de administrador pero queremos validar su rol desde la DB
        if (usuario && (usuario.rol === 'admin' || usuario.rol === 'encargado')) {
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

        // Si no existe en la base de datos, flujo de auto-registro
        if (!usuario) {
            if (textoUsuario.trim().split(" ").length >= 2) {
                const promptRegistro = `
                Analiza el siguiente mensaje de un trabajador que intenta registrarse en el sistema.
                Tu tarea es extraer ÚNICAMENTE su Nombre y Apellido real. Quita saludos, introducciones o frases como "hola me quiero registrar".
                
                Mensaje: "${textoUsuario}"
                
                Responde ESTRICTAMENTE con el Nombre y Apellido limpio, capitalizado (ejemplo: "Denis Mendoza"). Nada de texto extra.
                `;

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
                await enviarMensajeWhatsApp(chatId, "¡Hola! No encuentro tu número registrado en Ariar Steel. Por favor escribe tu *Nombre y Apellido* completo.");
                return;
            }
        }

        if (usuario.estado === 'pendiente_aprobacion') {
            await enviarMensajeWhatsApp(chatId, `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación.`);
            return;
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
                if (usuario.rol === 'encargado' || usuario.rol === 'admin') {
                    for (const item of resultado.datos) {
                        const { data: obra } = await supabase.from('obras').select('id, nombre').ilike('nombre', `%${item.obra}%`).maybeSingle();
                        const { data: emp } = await supabase.from('empleados').select('id, nombre').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).maybeSingle();

                        if (obra) {
                            const empleadoIdFinal = emp ? emp.id : usuario.id;
                            const empleadoNombreFinal = emp ? emp.nombre : usuario.nombre;
                            const obraNombreFinal = obra ? obra.nombre : item.obra; 

                            await supabase.from('registro_horas').insert([
                                {
                                    empleado_id: empleadoIdFinal,
                                    nombre_empleado: empleadoNombreFinal, 
                                    obra_id: obra.id,
                                    nombre_obra: obraNombreFinal,
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