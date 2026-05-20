// =========================================================================
// CEREBRO CON CORRECCIÓN EN PANEL DE ADMINISTRACIÓN - ARIAR STEEL LLC
// =========================================================================
import { historialCrew } from './horas.js';

const CLAVE_MAESTRA_SISTEMA = "ariar2026";

// --- CONFIGURACIÓN DE CONTACTO DE LA EMPRESA ---
const TELEFONO_ADMIN_WHATSAPP = "17373883909"; // Tu número de recepción

// --- BASE DE DATOS LOCAL CON TU CREW OFICIAL ---
const crewInicial = [
    { nombre: "Melvin", telefono: "7377109064", pin: "9064", historialHoras: historialCrew["7377109064"] || [] },
    { nombre: "Edwin López", telefono: "7373883909", pin: "3909", historialHoras: historialCrew["7373883909"] || [] },
    { nombre: "Luis Alfaro", telefono: "7373988349", pin: "8349", historialHoras: historialCrew["7373988349"] || [] },
    { nombre: "Angel Hernández", telefono: "7262442545", pin: "2545", historialHoras: historialCrew["7262442545"] || [] },
    { nombre: "Mauricio Zavala", telefono: "7373932727", pin: "2727", historialHoras: historialCrew["7373932727"] || [] },
    { nombre: "Denis Mendoza", telefono: "5123590463", pin: "0463", historialHoras: historialCrew["5123590463"] || [] },
    { nombre: "Josué Muñoz", telefono: "7373786448", pin: "6448", historialHoras: historialCrew["7373786448"] || [] },
    { nombre: "Hugo Hernández Rivera", telefono: "5127729112", pin: "9112", historialHoras: historialCrew["5127729112"] || [] }
];

let crewAriar = JSON.parse(localStorage.getItem('crewAriarData')) || crewInicial;

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

function obtenerFechaFormateada() {
    const opciones = { weekday: 'long', day: '2-digit', month: '2-digit' };
    const fecha = new Date();
    let resultado = fecha.toLocaleDateString('es-ES', opciones);
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
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
        renderizarTablaAdmin();
        inyectarBotonWhatsAppAdmin(); // Inyectamos tu botón en el panel máster inmediatamente
    } else {
        if (errorAdmin) errorAdmin.innerText = "❌ Clave Maestra de Seguridad Incorrecta.";
    }
});

// --- INYECTAR EL BOTÓN DIRECTAMENTE EN TU PANEL DE ADMINISTRACIÓN ---
function inyectarBotonWhatsAppAdmin() {
    // Buscamos el contenedor donde antes tenías la cámara o el historial del administrador
    const areaCargaAdmin = document.getElementById('contenedor-galeria-hojas') || document.getElementById('admin-desbloqueado');
    
    // Si existe el contenedor, le agregamos tu botón de WhatsApp al principio o final de la sección
    const idBotonExiste = document.getElementById('btn-whatsapp-admin-directo');
    if (!idBotonExiste && areaCargaAdmin) {
        const divContenedorBoton = document.createElement('div');
        divContenedorBoton.style.margin = "20px 0";
        divContenedorBoton.innerHTML = `
            <button id="btn-whatsapp-admin-directo" style="width:100%; max-width:400px; margin: 10px auto; padding:14px; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); border:none; border-radius:8px; color:#fff; font-weight:700; font-size:0.9rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow: 0 4px 12px rgba(37,211,102,0.2);">
                <i class="fa-brands fa-whatsapp" style="font-size:1.3rem;"></i> Subir Hoja de Turno a mi WhatsApp
            </button>
        `;
        areaCargaAdmin.appendChild(divContenedorBoton);
    }
}

// Escuchador global para activar la redirección cuando tú hagas clic en la administración
document.addEventListener('click', function(e) {
    const botonWhatsAppAdmin = e.target.closest('#btn-whatsapp-admin-directo');
    if (botonWhatsAppAdmin) {
        const fechaYHora = new Date().toLocaleString('es-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const textoMensaje = `Ariar Steel LLC - Control de Administración\nRecibiendo copia de Hoja de Turno Física.\nFecha de captura: ${fechaYHora}`;
        const urlWhatsApp = `https://wa.me/${TELEFONO_ADMIN_WHATSAPP}?text=${encodeURIComponent(textoMensaje)}`;
        window.open(urlWhatsApp, '_blank');
    }
});

function renderizarTablaAdmin() {
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
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px;">
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
            </div>
        `;
    });
    htmlTabla += `</div>`;
    tablaRegistrosAdmin.innerHTML = htmlTabla;

    document.querySelectorAll('.input-mod-horas').forEach(el => {
        el.addEventListener('input', (e) => inyectarHorasProceso(e.target.getAttribute('data-id'), parseFloat(e.target.value) || 0));
    });
    document.querySelectorAll('.select-mod-ubicacion').forEach(el => {
        el.addEventListener('change', (e) => inyectarUbicacionProceso(e.target.getAttribute('data-id'), e.target.value));
    });
    document.querySelectorAll('.input-mod-telefono').forEach(el => {
        el.addEventListener('input', (e) => { crewAriar[e.target.getAttribute('data-id')].telefono = e.target.value.trim(); sincronizarBaseLocal(); });
    });
    document.querySelectorAll('.input-mod-pin').forEach(el => {
        el.addEventListener('input', (e) => { crewAriar[e.target.getAttribute('data-id')].pin = e.target.value.trim(); sincronizarBaseLocal(); });
    });
    document.querySelectorAll('.btn-eliminar-dinamico').forEach(el => {
        el.addEventListener('click', (e) => { crewAriar.splice(e.target.closest('button').getAttribute('data-id'), 1); sincronizarBaseLocal(); renderizarTablaAdmin(); });
    });
}

function inyectarHorasProceso(idx, cantHoras) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    if (registro) { registro.cant = cantHoras; } 
    else { const obra = document.querySelector(`.select-mod-ubicacion[data-id="${idx}"]`).value; crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: obra, cant: cantHoras }); }
    sincronizarBaseLocal();
}

// (El resto de las funciones de navegación estructural se quedan exactamente igual)
function inyectarUbicacionProceso(idx, ubicacionTxt) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    if (registro) { registro.ubicacion = ubicacionTxt; } 
    else { const hrs = parseFloat(document.querySelector(`.input-mod-horas[data-id="${idx}"]`).value) || 0; crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: ubicacionTxt, cant: hrs }); }
    sincronizarBaseLocal();
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
        const saludoDinamico = obtenerSaludoSegunHora();
        const totalS