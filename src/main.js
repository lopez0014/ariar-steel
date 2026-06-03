// =========================================================================
// CONTROL TOTAL DE POSICIONAMIENTO SUPERIOR - ARIAR STEEL LLC
// =========================================================================
import { historialCrew } from './horas.js';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE CLIENTE SUPABASE DIRECTA ---
const supabaseUrl = "https://waxwqdefxhmcodfflnxv.supabase.co"; 

// Tu clave oficial integrada directamente
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHdxZGVmeGhtY29kZmZsbnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDY0NTIsImV4cCI6MjA5NjAyMjQ1Mn0.2YL7-1TR6mVd0kULSIfOpBVXnZszwZPjy-KQlU5z3Aw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLAVE_MAESTRA_SISTEMA = "ariar2026";

// --- CONFIGURACIÓN DE CONTACTO DE LA EMPRESA ---
const TELEFONO_ADMIN_WHATSAPP = "15127508621"; 

// --- BASE DE DATOS LOCAL VACÍA (SEGURIDAD COMPLETA EN GITHUB) ---
const crewInicial = []; 

let crewAriar = [];

// Función para descargar el crew desde Supabase en tiempo real
async function cargarCrewDesdeSupabase() {
    const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, telefono, pin, rol');

    if (error) {
        console.error("❌ Error al traer los empleados de Supabase:", error.message);
        crewAriar = crewInicial; // Respaldo local si falla la red
    } else {
        crewAriar = data.map(emp => ({
            nombre: emp.nombre,
            telefono: emp.telefono,
            pin: emp.pin,
            rol: emp.rol,
            historialHoras: [] 
        }));
    }
    
    if (document.getElementById('admin-desbloqueado')?.style.display === 'block') {
        renderTablaAdmin();
    }
}

// Inicializamos la carga al arrancar la app
cargarCrewDesdeSupabase();

function sincronizarBaseLocal() {
    localStorage.setItem('crewAriarData', JSON.stringify(crewAriar));
}

const links = {
    dash: document.getElementById('link-dash'),
    registro: document.getElementById('link-registro'),
    admin: document.getElementById('link-admin')
};

const secciones = {
    dash: document.getElementById('sec-dash'),
    registro: document.getElementById('sec-registro'),
    admin: document.getElementById('sec-admin')
};

const tituloModulo = document.getElementById('titulo-modulo');
const consolaHoras = document.getElementById('consola-horas');
const btnMarcar = document.getElementById('btn-marcar');

// Mantenemos la fecha legible para la pantalla de los muchachos
function obtenerFechaFormateada() {
    const opciones = { weekday: 'long', day: '2-digit', month: '2-digit' };
    const fecha = new Date();
    let resultado = fecha.toLocaleDateString('es-ES', opciones);
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

// NUEVA FUNCIÓN: Obtiene la fecha exacta en formato calendario YYYY-MM-DD exigido por registro_horas
function obtenerFechaCalendarioSQL() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

function actualizarFechaEncabezadoAdmin() {
    const contenedorFecha = document.getElementById('fecha-actual-admin');
    if (contenedorFecha) {
        contenedorFecha.innerText = obtenerFechaFormateada();
    }
}

function obtenerSaludoSegunHora() {
    const horaActual = new Date().getHours();
    return (horaActual >= 5 && horaActual < 12) ? "7 de la mañana. ¡Buenos días!" : "Buen descanso, excelente trabajo hoy.";
}

function cambiarVista(vistaSeleccionada, titulo) {
    Object.keys(secciones).forEach(key => {
        secciones[key]?.classList.remove('active');
        links[key]?.classList.remove('active');
    });
    secciones[vistaSeleccionada]?.classList.add('active');
    links[vistaSeleccionada]?.classList.add('active');
    if (tituloModulo) tituloModulo.innerText = titulo;
}

function armarLoginUI() {
    if (!consolaHoras) return;
    consolaHoras.innerHTML = `
        <div style="width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: left;">
                <label style="font-size: 0.75rem; color: #64748b; font-weight:600;">Número de Teléfono (Usuario)</label>
                <input type="number" id="login-telefono" placeholder="Solo números, sin guiones" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; color: #fff; box-sizing: border-box; font-size: 0.85rem;">
            </div>
            <div style="text-align: left;">
                <label style="font-size: 0.75rem; color: #64748b; font-weight:600;">Contraseña PIN</label>
                <input type="password" id="login-pin" placeholder="Tu contraseña de 4 dígitos" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; color: #fff; box-sizing: border-box; font-size: 0.85rem;">
            </div>
            <div id="login-error-msg" style="color: #ef4444; font-size: 0.78rem; font-weight: 600; text-align: center; margin-top: 5px;"></div>
        </div>
    `;
    if (btnMarcar) {
        btnMarcar.innerHTML = `<i class="fa-solid fa-lock-open"></i> Consultar mis Horas Oficiales`;
        btnMarcar.style.background = "linear-gradient(135px, #f59e0b 0%, #d97706 100%)";
        btnMarcar.style.color = "#0d131f";
    }
}

// --- AUTENTICACIÓN PANEL DE CONTROL MÁSTER ---
document.getElementById('btn-autenticar')?.addEventListener('click', () => {
    const passMaestra = document.getElementById('pass-maestra')?.value;
    const errorAdmin = document.getElementById('msg-error-admin');
    
    if (passMaestra === CLAVE_MAESTRA_SISTEMA) {
        document.getElementById('admin-bloqueado').style.display = 'none';
        document.getElementById('admin-desbloqueado').style.display = 'block';
        actualizarFechaEncabezadoAdmin();
        inyectarBotonWhatsAppAdminArriba(); 
        renderTablaAdmin();
    } else {
        if (errorAdmin) errorAdmin.innerText = "❌ Clave Maestra de Seguridad Incorrecta.";
    }
});

function inyectarBotonWhatsAppAdminArriba() {
    const panelDesbloqueado = document.getElementById('admin-desbloqueado');
    const idBotonExiste = document.getElementById('bloque-whatsapp-top');
    
    if (idBotonExiste) { idBotonExiste.remove(); }

    if (panelDesbloqueado) {
        const divContenedorBoton = document.createElement('div');
        divContenedorBoton.id = "bloque-whatsapp-top";
        divContenedorBoton.style.background = "rgba(255, 255, 255, 0.02)";
        divContenedorBoton.style.border = "1px solid rgba(255, 255, 255, 0.05)";
        divContenedorBoton.style.padding = "16px";
        divContenedorBoton.style.borderRadius = "12px";
        divContenedorBoton.style.marginBottom = "20px";
        divContenedorBoton.style.textAlign = "center";
        
        divContenedorBoton.innerHTML = `
            <p style="font-size: 0.85rem; color: #94a3b8; font-weight: 600; margin: 0 0 12px 0; line-height: 1.4;">
                📸 Captura o selecciona la foto de la hoja firmada por el encargado del frente del trabajo:
            </p>
            <button id="btn-subir-horas-whatsapp" style="width:100%; max-width:380px; margin: 0 auto; padding:14px; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); border:none; border-radius:8px; color:#fff; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow: 0 4px 14px rgba(37,211,102,0.25);">
                <i class="fa-brands fa-whatsapp" style="font-size:1.3rem;"></i> Subir horas
            </button>
        `;
        panelDesbloqueado.prepend(divContenedorBoton);
    }

    const contenedorViejo = document.getElementById('contenedor-galeria-hojas');
    if (contenedorViejo) { contenedorViejo.innerHTML = ''; }
}

document.addEventListener('click', function(e) {
    const btnSubirHoras = e.target.closest('#btn-subir-horas-whatsapp');
    if (btnSubirHoras) {
        const fechaYHora = new Date().toLocaleString('es-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const textoMensaje = `Ariar Steel LLC - Envío de Hoja de Asistencia\nFecha de reporte: ${fechaYHora}\n\n[Adjunta aquí la foto de la hoja de turno firmada]`;
        const urlWhatsApp = `https://wa.me/${TELEFONO_ADMIN_WHATSAPP}?text=${encodeURIComponent(textoMensaje)}`;
        window.open(urlWhatsApp, '_blank');
    }
});

function renderTablaAdmin() {
    const tablaRegistrosAdmin = document.getElementById('tabla-registros-admin');
    if (!tablaRegistrosAdmin) return;

    const fechaHoyString = obtenerFechaFormateada();
    if (crewAriar.length === 0) {
        tablaRegistrosAdmin.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--texto-secundario); font-size: 0.85rem;">No hay empleados en el crew todavía.</div>`;
        return;
    }

    let htmlTabla = `<div style="display:flex; flex-direction:column; gap:12px;">`;
    crewAriar.forEach((emp, idx) => {
        const registroHoy = emp.historialHoras.find(r => r.fecha === fechaHoyString);
        const valorHorasHoy = registroHoy ? registroHoy.cant : 0;
        const ubicacionHoy = registroHoy ? registroHoy.ubicacion : "Austin, Texas";

        htmlTabla += `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); padding: 12px; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span><i class="fa-solid fa-user-helmet-safety" style="color: var(--naranja-acero);"></i> <strong>${emp.nombre}</strong></span>
                    <button class="btn-eliminar-dinamico" data-id="${idx}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight:700; cursor:pointer;">Eliminar</button>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
                    <input type="text" value="${emp.telefono}" class="input-mod-telefono" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#fff; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center;">
                    <input type="text" value="${emp.pin}" class="input-mod-pin" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#f59e0b; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center; font-weight:700;">
                </div>
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);">Proyecto / Obra:</span>
                        <select class="select-mod-ubicacion" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.78rem;">
                            <option value="Austin, Texas" ${ubicacionHoy === "Austin, Texas" ? "selected" : ""}>Austin, TX</option>
                            <option value="San Antonio, Texas" ${ubicacionHoy === "San Antonio, Texas" ? "selected" : ""}>San Antonio, TX</option>
                            <option value="Wichita, Texas" ${ubicacionHoy === "Wichita, Texas" ? "selected" : ""}>Wichita, TX</option>
                        </select>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);">Horas de Hoy:</span>
                        <input type="number" class="input-mod-horas" data-id="${idx}" value="${valorHorasHoy}" min="0" step="0.5" style="width:80px; background: #000; border:1px solid rgba(255,255,255,0.1); color:#fff; text-align:center; padding:3px; border-radius:4px; font-weight:700;">
                    </div>
                </div>
                <button class="btn-guardar-horas-manual" data-id="${idx}" style="width:100%; padding:8px; background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:#0d131f; border:none; border-radius:6px; font-weight:700; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Horas de ${emp.nombre}
                </button>
                <div class="msg-status-guardado" data-id="${idx}" style="font-size:0.72rem; font-weight:700; text-align:center; margin-top:4px; height:14px;"></div>
            </div>
        `;
    });
    htmlTabla += `</div>`;
    tablaRegistrosAdmin.innerHTML = htmlTabla;

    document.querySelectorAll('.input-mod-horas').forEach(el => {
        el.addEventListener('input', (e) => actualizarMemoriaHorasLocal(e.target.getAttribute('data-id'), parseFloat(e.target.value) || 0));
    });
    document.querySelectorAll('.select-mod-ubicacion').forEach(el => {
        el.addEventListener('change', (e) => actualizarMemoriaUbicacionLocal(e.target.getAttribute('data-id'), e.target.value));
    });
    document.querySelectorAll('.input-mod-telefono').forEach(el => {
        el.addEventListener('input', (e) => { crewAriar[e.target.getAttribute('data-id')].telefono = e.target.value.trim(); sincronizarBaseLocal(); });
    });
    document.querySelectorAll('.input-mod-pin').forEach(el => {
        el.addEventListener('input', (e) => { crewAriar[e.target.getAttribute('data-id')].pin = e.target.value.trim(); sincronizarBaseLocal(); });
    });
    document.querySelectorAll('.btn-eliminar-dinamico').forEach(el => {
        el.addEventListener('click', (e) => { crewAriar.splice(e.target.closest('button').getAttribute('data-id'), 1); sincronizarBaseLocal(); renderTablaAdmin(); });
    });

    document.querySelectorAll('.btn-guardar-horas-manual').forEach(el => {
        el.addEventListener('click', async (e) => {
            const idx = e.target.closest('button').getAttribute('data-id');
            await procesarGuardadoManualSupabase(idx);
        });
    });
}

function actualizarMemoriaHorasLocal(idx, cantHoras) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    if (registro) { registro.cant = cantHoras; } 
    else { const obra = document.querySelector(`.select-mod-ubicacion[data-id="${idx}"]`).value; crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: obra, cant: cantHoras }); }
    sincronizarBaseLocal();
}

function actualizarMemoriaUbicacionLocal(idx, ubicacionTxt) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    if (registro) { registro.ubicacion = ubicacionTxt; } 
    else { const hrs = parseFloat(document.querySelector(`.input-mod-horas[data-id="${idx}"]`).value) || 0; crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: ubicacionTxt, cant: hrs }); }
    sincronizarBaseLocal();
}

// --- ENVÍO DE DATOS ADAPTADO A LA TABLA PROFESIONAL "REGISTRO_HORAS" ---
async function procesarGuardadoManualSupabase(idx) {
    const fechaSQL = obtenerFechaCalendarioSQL(); // Formato YYYY-MM-DD exigido por la base de datos
    const emp = crewAriar[idx];
    const horasInput = parseFloat(document.querySelector(`.input-mod-horas[data-id="${idx}"]`).value) || 0;
    const msgContenedor = document.querySelector(`.msg-status-guardado[data-id="${idx}"]`);

    if (msgContenedor) {
        msgContenedor.style.color = "#f59e0b";
        msgContenedor.innerText = "⏳ Guardando en registro_horas...";
    }

    // Inserción directa en la tabla 'registro_horas' amarrada al teléfono del empleado
    const { error } = await supabase
        .from('registro_horas')
        .insert([{ 
            telefono_empleado: emp.telefono, 
            fecha: fechaSQL, 
            horas_regulares: horasInput,
            horas_overtime: 0.00, // Lo dejamos listo para configurar OT después
            notas: "Registro desde Panel Administrador"
        }]);

    if (error) {
        console.error("❌ Error devuelto por Supabase:", error.message);
        if (msgContenedor) {
            msgContenedor.style.color = "#ef4444";
            msgContenedor.innerText = "❌ Falló el guardado en internet.";
        }
    } else {
        console.log(`⚡ Horas en la tabla registro_horas para ${emp.nombre} listas.`);
        if (msgContenedor) {
            msgContenedor.style.color = "#10b981";
            msgContenedor.innerText = "✅ ¡Guardado con éxito en la nube!";
            setTimeout(() => { msgContenedor.innerText = ""; }, 3000);
        }
    }
}

links.dash?.addEventListener('click', () => { cambiarVista('dash', 'Entrar a mis horas'); armarLoginUI(); });
links.registro?.addEventListener('click', () => cambiarVista('registro', 'Registro de empleado'));
links.admin?.addEventListener('click', () => { cambiarVista('admin', 'Administración'); actualizarFechaEncabezadoAdmin(); });

armarLoginUI();
const contenedorSaludo = document.getElementById('saludo-pantalla');
if (contenedorSaludo) contenedorSaludo.innerText = obtenerSaludoSegunHora();

const brandSpan = document.querySelector('.brand span');
if (brandSpan) brandSpan.innerHTML = 'STEEL LLC &#127959;'; 

btnMarcar?.addEventListener('click', () => {
    if (btnMarcar.innerText.includes("Cerrar Consulta")) { armarLoginUI(); return; }
    const telefonoInput = document.getElementById('login-telefono')?.value.trim();
    const pinInput = document.getElementById('login-pin')?.value.trim();
    const errorMsg = document.getElementById('login-error-msg');
    if (!telefonoInput || !pinInput) { if (errorMsg) errorMsg.innerText = "⚠️ Por favor ingresa tu usuario y PIN."; return; }
    const emp = crewAriar.find(e => e.telefono === telefonoInput && e.pin === pinInput);

    if (emp) {
        const totalSemanales = emp.historialHoras.reduce((acc, obj) => acc + obj.cant, 0);
        let filasTablaHTML = "";
        if (emp.historialHoras.length === 0) {
            filasTablaHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; font-size:0.8rem; padding: 15px 0;">No tienes horas capturadas en este periodo.</td></tr>`;
        } else {
            emp.historialHoras.forEach(registro => {
                filasTablaHTML += `<tr><td style="font-weight:600; color:#fff;">${registro.fecha}</td><td style="color:#64748b;">${registro.ubicacion}</td><td style="text-align:right; font-weight:700; color:var(--texto-principal);">${registro.cant} hrs</td></tr>`;
            });
        }

        consolaHoras.innerHTML = `
            <div class="bloque-cita-animado" style="width:100%; text-align:left;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 6px; border-radius: 6px; font-weight:700; color:#10b981; text-align:center; margin-bottom:8px; font-size:0.8rem;">
                    <i class="fa-solid fa-user-shield"></i> Reporte Oficial de: ${emp.nombre}
                </div>
                <table class="tabla-semanal-obrero" style="margin-bottom: 15px;">
                    <thead>
                        <tr><th>Fecha del Día</th><th>Proyecto / Obra</th><th style="text-align:right;">Horas Aprobadas</th></tr>
                    </thead>
                    <tbody>
                        ${filasTablaHTML}
                        <tr style="border-top:2px solid var(--naranja-acero);">
                            <td colspan="2" style="font-weight:800; color:#fff; padding-top:10px;">TOTAL ACUMULADO:</td>
                            <td style="text-align:right; font-weight:800; color:#10b981; font-size:1rem; padding-top:10px;">${totalSemanales} hrs</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        btnMarcar.innerHTML = `<i class="fa-solid fa-arrow-left-long"></i> Cerrar Consulta Privada`;
        btnMarcar.style.background = "linear-gradient(135px, #4b5563 0%, #1f2937 100%)";
        btnMarcar.style.color = "#fff";
    } else {
        if (errorMsg) errorMsg.innerText = "❌ Usuario o PIN incorrectos.";
    }
});

btnGuardarEmpleado?.addEventListener('click', async () => {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim();
    const pin = document.getElementById('reg-pass').value.trim();

    if (!nombre || !telefono || !pin) return;

    if (msgFeedback) {
        msgFeedback.style.color = "#f59e0b";
        msgFeedback.innerText = "⏳ Guardando en la base de datos...";
    }

    const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nombre: nombre, telefono: telefono, pin: pin, rol: 'empleado' }]);

    if (error) {
        if (msgFeedback) { 
            msgFeedback.style.color = "var(--rojo-error)"; 
            msgFeedback.innerText = error.code === '23505' 
                ? "❌ Este número de teléfono ya está registrado." 
                : "❌ Error al guardar: " + error.message; 
        }
        return;
    }

    await cargarCrewDesdeSupabase();

    if (msgFeedback) { 
        msgFeedback.style.color = "var(--verde-dinero)"; 
        msgFeedback.innerText = `¡${nombre} registrado con éxito en la nube!`; 
    }
    document.getElementById('form-alta-empleado').reset();
});