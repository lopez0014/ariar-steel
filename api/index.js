import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

// Conexiones seguras usando las variables de entorno de Render
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const PORT = process.env.PORT || 3000;

// Webhook principal para recibir mensajes de WhatsApp (Whapi)
app.post('/webhook', async (req, res) => {
    try {
        const mensajes = req.body.messages;
        if (!mensajes || mensajes.length === 0) return res.sendStatus(200);

        const msg = mensajes[0];
        if (msg.from_me) return res.sendStatus(200); // Ignorar mensajes del propio bot

        const telefonoUsuario = msg.chat_id.split('@')[0]; // Extrae el número sin el @c.us
        const textoUsuario = msg.text?.body || "";

        console.log(`✉️ Mensaje recibido de ${telefonoUsuario}: "${textoUsuario}"`);

        // 1. Identificar quién escribe consultando Supabase
        const { data: usuario, error: errorUsuario } = await supabase
            .from('empleados')
            .select('*')
            .eq('telefono', telefonoUsuario)
            .single();

        // Si el usuario no existe, activar el flujo de Auto-Registro para nuevos
        if (!usuario) {
            // Si el texto parece un nombre, lo registramos en espera de aprobación
            if (textoUsuario.trim().split(" ").length >= 2) {
                await supabase.from('empleados').insert([
                    { nombre: textoUsuario.trim(), telefono: telefonoUsuario, rol: 'trabajador', estado: 'pendiente_aprobacion' }
                ]);
                return res.json({ text: `¡Hola! He registrado tu nombre: *${textoUsuario}*. Quedas en espera de que el administrador apruebe tu acceso al sistema de nómina de Ariar Steel.` });
            } else {
                return res.json({ text: "¡Hola! No encuentro tu número registrado en el sistema de Ariar Steel.\n\nSi eres un *trabajador nuevo*, por favor responde a este mensaje escribiendo tu *Nombre y Apellido* completo para darte de alta." });
            }
        }

        // Si está registrado pero no ha sido aprobado por el jefe
        if (usuario.estado === 'pendiente_aprobacion') {
            return res.json({ text: `Hola *${usuario.nombre}*, tu perfil sigue en espera de aprobación por parte del administrador. Te avisaremos en cuanto estés activo.` });
        }

        // 2. IA para entender si el trabajador está perdido (Paso de navegación de obras)
        if (textoUsuario.toLowerCase().includes('perdido') || textoUsuario.toLowerCase().includes('no encuentro') || textoUsuario.toLowerCase().includes('donde es')) {
            // Buscamos la última obra asignada en su registro de horas de hoy
            const hoy = new Date().toISOString().split('T')[0];
            const { data: registro } = await supabase
                .from('registro_horas')
                .select('obra_id(nombre, direccion, especificaciones)')
                .eq('empleado_id', usuario.id)
                .eq('fecha', hoy)
                .order('creado_el', { ascending: false })
                .limit(1);

            if (registro && registro.length > 0) {
                const obra = registro[0].obra_id;
                return res.json({
                    text: `📍 *Indicaciones para tu obra de hoy (${obra.nombre}):*\n\n*Dirección:* ${obra.direccion}\n\n*Especificaciones del sitio:* ${obra.especificaciones}`
                });
            } else {
                // Si no tiene obra hoy, le damos una por defecto o la lista de obras
                const { data: listaObras } = await supabase.from('obras').select('nombre, direccion, especificaciones').limit(1);
                if (listaObras && listaObras.length > 0) {
                    return res.json({ text: `No veo una obra asignada para ti hoy, pero si vas a *${listaObras[0].nombre}*, las especificaciones son:\n\n${listaObras[0].especificaciones}` });
                }
            }
        }

        // 3. Procesamiento de horas mediante Inteligencia Artificial (Prompt del Sistema)
        const promptSistema = `
        Eres el auditor inteligente de nómina de Ariar Steel. Tu trabajo es interpretar los mensajes de asistencia.
        El usuario que te escribe se llama ${usuario.nombre} y tiene el rol de ${usuario.rol}.
        
        REGLAS DE NEGOCIO:
        - Si el usuario es un 'encargado' o 'admin', puede reportar horas suyas o de otros empleados.
        - Entiende desgloses complejos, notas abajo en la hoja, o movimientos multi-obra en el mismo día (Ej: "Melvin 5 Wichita, 4 Austin"). Separarás esto de forma inteligente.
        - Responde SIEMPRE en formato JSON plano con la siguiente estructura exacta:
          {
            "es_reporte_horas": true o false,
            "datos": [
               {"nombre_empleado": "Nombre", "horas": 8, "obra": "Wichita"}
            ],
            "respuesta_whatsapp": "Mensaje amigable confirmando lo que procesaste para que el usuario lo verifique."
          }
        `;

        const respuestaIA = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Modelo rápido e inteligente con visión
            messages: [
                { role: "system", content: promptSistema },
                { role: "user", content: textoUsuario }
            ],
            response_format: { type: "json_object" }
        });

        const resultado = JSON.parse(respuestaIA.choices[0].message.content);

        // 4. Si la IA detectó que es un reporte de horas válido, guardarlo en Supabase
        if (resultado.es_reporte_horas && (usuario.rol === 'encargado' || usuario.rol === 'admin')) {
            for (const item of resultado.datos) {
                // Buscar el ID de la obra por nombre en Supabase
                const { data: obra } = await supabase.from('obras').select('id').ilike('nombre', `%${item.obra}%`).single();
                // Buscar el ID del empleado por nombre
                const { data: emp } = await supabase.from('empleados').select('id').ilike('nombre', `%${item.nombre_empleado}%`).limit(1).single();

                if (obra && emp) {
                    await supabase.from('registro_horas').insert([
                        {
                            empleado_id: emp.id,
                            obra_id: obra.id,
                            fecha: new Date().toISOString().split('T')[0], // Fecha de hoy
                            horas: item.horas,
                            estado_pago: 'fondo', // Sello automático de Semana de Fondo
                            estado_confirmacion: 'en_espera' // Semáforo Amarillo para la Secretaria
                        }
                    ]);
                }
            }
        }

        // Enviar la respuesta de regreso a WhatsApp a través de Whapi
        return res.json({ text: resultado.respuesta_whatsapp || "Entendido, lo tengo registrado." });

    } catch (error) {
        console.error("❌ Error en el Webhook:", error);
        return res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});