// =========================================================================
// CEREBRO CON CREW ACTUALIZADO (7 INTEGRANTES) - ARIAR STEEL LLC
// =========================================================================
import { historialCrew } from './horas.js';

// --- BASE DE DATOS LOCAL CON TU CREW OFICIAL (CONECTADA A HORAS.JS) ---
const crewAriar = [
    { nombre: "Melvin", telefono: "7377109064", pin: "9064", historialHoras: historialCrew["7377109064"] || [] },
    { nombre: "Edwin López", telefono: "7373883909", pin: "3909", historialHoras: historialCrew["7373883909"] || [] },
    { nombre: "Luis Alfaro", telefono: "7373988349", pin: "8349", historialHoras: historialCrew["7373988349"] || [] },
    { nombre: "Angel Hernández", telefono: "7262442545", pin: "2545", historialHoras: historialCrew["7262442545"] || [] },
    { nombre: "Mauricio Zavala", telefono: "7373932727", pin: "2727", historialHoras: historialCrew["7373932727"] || [] },
    { nombre: "Denis Mendoza", telefono: "5123590463", pin: "0463", historialHoras: historialCrew["5123590463"] || [] },
    { nombre: "Josué Muñoz", telefono: "7373786448", pin: "6448", historialHoras: historialCrew["7373786448"] || [] }
];

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

// --- OBTENER FECHA REAL DEL SISTEMA ---
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

// --- RENDERIZAR TABLA ADMINISTRACIÓN ---
function renderizarTablaAdmin() {
    const tablaRegistrosAdmin = document.getElementById('tabla-registros-admin');
    if (!tablaRegistrosAdmin) return;

    const fechaHoyString = obtenerFechaFormateada();
    
    if (crewAriar.length === 0) {
        tablaRegistrosAdmin.innerHTML = `
            <div style="text-align:center; padding: 30px; color: var(--texto-secundario); font-size: 0.85rem;">
                <i class="fa-solid fa-users-slash" style="font-size: 1.5rem; margin-bottom: 10px; display:block;"></i>
                No hay empleados en el crew todavía.
            </div>
        `;
        return;
    }

    let htmlTabla = `<div style="display:flex; flex-direction:column; gap:12px;">`;
    
    crewAriar.forEach((emp, idx) => {
        const registroHoy = emp.historialHoras.find(r => r.fecha === fechaHoyString);
        const valorHorasHoy = registroHoy ? registroHoy.cant : 0;
        const ubicacionHoy = registroHoy ? registroHoy.ubicacion : "Austin, Texas";
        const acumuladoTotal = emp.historialHoras.reduce((acc, o) => acc + o.cant, 0);

        htmlTabla += `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); padding: 12px; border-radius:10px;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span><i class="fa-solid fa-user-helmet-safety" style="color: var(--naranja-acero);"></i> <strong>${emp.nombre}</strong></span>
                    <button onclick="eliminarEmpleadoCrew(${idx})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-trash-can"></i> Eliminar
                    </button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.75rem; color:#64748b;">Credenciales de entrada:</span>
                    <span id="total-badge-${idx}" style="font-size:0.75rem; color:#10b981; font-weight:700;">Lleva: ${acumuladoTotal} hrs en total</span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
                    <input type="text" value="${emp.telefono}" placeholder="Usuario" oninput="modificarDatosBaseCrew(${idx}, 'telefono', this.value)" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#fff; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center;">
                    <input type="text" value="${emp.pin}" placeholder="PIN" oninput="modificarDatosBaseCrew(${idx}, 'pin', this.value)" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#f59e0b; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center; font-weight:700;">
                </div>

                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);"><i class="fa-solid fa-location-dot"></i> Proyecto / Obra:</span>
                        <select id="ubicacion-hoy-${idx}" onchange="inyectarDatosFechaHoy(${idx})" style="background:#000; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.78rem;">
                            <option value="Austin, Texas" ${ubicacionHoy === "Austin, Texas" ? "selected" : ""}>Austin, TX</option>
                            <option value="San Antonio, Texas" ${ubicacionHoy === "San Antonio, Texas" ? "selected" : ""}>San Antonio, TX</option>
                            <option value="Wichita, Texas" ${ubicacionHoy === "Wichita, Texas" ? "selected" : ""}>Wichita, TX</option>
                        </select>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);"><i class="fa-regular fa-clock"></i> Horas de Hoy:</span>
                        <input type="number" 
                               id="horas-hoy-${idx}"
                               value="${valorHorasHoy}" 
                               min="0" 
                               step="0.5" 
                               oninput="inyectarDatosFechaHoy(${idx})" 
                               style="width:80px; background: #000; border:1px solid rgba(255,255,255,0.1); color:#fff; text-align:center; padding:3px; border-radius:4px; font-weight:700;">
                    </div>
                </div>
            </div>
        `;
    });
    htmlTabla += `</div>`;
    tablaRegistrosAdmin.innerHTML = htmlTabla;
}

// --- EVENTOS DEL MENÚ ---
links.dash?.addEventListener('click', () => cambiarVista('dash', 'Entrar a mis horas'));
links.registro?.addEventListener('click', () => cambiarVista('registro', 'Registro de empleado'));
links.admin?.addEventListener('click', () => {
    cambiarVista('admin', 'Administración');
    actualizarFechaEncabezadoAdmin();
    renderizarTablaAdmin();
});

// Inicializar UI y renderizar el saludo dinámico desde el arranque
armarLoginUI();
const contenedorSaludo = document.getElementById('saludo-pantalla');
if (contenedorSaludo) {
    contenedorSaludo.innerText = obtenerSaludoSegunHora();
}

// Actualizar el encabezado con el emoji de grúa
const brandSpan = document.querySelector('.brand span');
if (brandSpan) {
    brandSpan.innerHTML = 'STEEL LLC &#127959;'; 
}

// --- CONSULTA EN TIEMPO REAL PARA EL EMPLEADO ---
btnMarcar?.addEventListener('click', () => {
    if (btnMarcar.innerText.includes("Cerrar Consulta")) {
        armarLoginUI();
        return;
    }

    const telefonoInput = document.getElementById('login-telefono')?.value.trim();
    const pinInput = document.getElementById('login-pin')?.value.trim();
    const errorMsg = document.getElementById('login-error-msg');

    if (!telefonoInput || !pinInput) {
        if (errorMsg) errorMsg.innerText = "⚠️ Por favor ingresa tu usuario y PIN.";
        return;
    }

    const emp = crewAriar.find(e => e.telefono === telefonoInput && e.pin === pinInput);

    if (emp) {
        const saludoDinamico = obtenerSaludoSegunHora();
        const totalSemanales = emp.historialHoras.reduce((acc, obj) => acc + obj.cant, 0);

        let filasTablaHTML = "";
        if (emp.historialHoras.length === 0) {
            filasTablaHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; font-size:0.8rem; padding: 15px 0;">No tienes horas capturadas en este periodo.</td></tr>`;
        } else {
            emp.historialHoras.forEach(registro => {
                filasTablaHTML += `
                    <tr>
                        <td style="font-weight:600; color:#fff;">${registro.fecha}</td>
                        <td style="color:#64748b;">${registro.ubicacion}</td>
                        <td style="text-align:right; font-weight:700; color:var(--texto-principal);">${registro.cant} hrs</td>
                    </tr>
                `;
            });
        }

        consolaHoras.innerHTML = `
            <div class="bloque-cita-animado" style="width:100%; text-align:left;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 6px; border-radius: 6px; font-weight:700; color:#10b981; text-align:center; margin-bottom:8px; font-size:0.8rem;">
                    <i class="fa-solid fa-user-shield"></i> Reporte Oficial de: ${emp.nombre}
                </div>
                <div style="color: #f59e0b; font-size:0.8rem; font-weight:700; text-align:center; margin-bottom:10px;">
                    ${saludoDinamico}
                </div>
                
                <table class="tabla-semanal-obrero">
                    <thead>
                        <tr>
                            <th>Fecha del Día</th>
                            <th>Proyecto / Obra</th>
                            <th style="text-align:right;">Horas Aprobadas</th>
                        </tr>
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
        if (errorMsg) errorMsg.innerText = "❌ Usuario o PIN incorrectos o empleado inexistente.";
    }
});

// --- REGISTRO DE NUEVO TRABAJADOR ADICIONAL ---
const btnGuardarEmpleado = document.getElementById('btn-guardar-empleado');
const msgFeedback = document.getElementById('msg-feedback-registro');

btnGuardarEmpleado?.addEventListener('click', () => {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim().replace(/\D/g,'');
    const pass = document.getElementById('reg-pass').value.trim();

    if(nombre === "" || telefono === "" || pass === "") {
        if (msgFeedback) {
            msgFeedback.style.color = "#ef4444";
            msgFeedback.innerText = "⚠️ Completa todos los campos obligatorios.";
        }
        return;
    }

    const existe = crewAriar.find(e => e.telefono === telefono);
    if (existe) {
        if (msgFeedback) {
            msgFeedback.style.color = "#ef4444";
            msgFeedback.innerText = "⚠️ Este número de teléfono ya está registrado.";
        }
        return;
    }

    crewAriar.push({ 
        nombre: nombre, 
        telefono: telefono, 
        pin: pass, 
        historialHoras: [] 
    });
    
    if (msgFeedback) {
        msgFeedback.style.color = "#10b981";
        msgFeedback.innerText = `✅ ¡${nombre} añadido! Ya puede usar su ID: ${telefono}`;
    }
    document.getElementById('form-alta-empleado')?.reset();
    renderizarTablaAdmin();
});

// --- PANEL DE ADMINISTRACIÓN ---
const btnAutenticar = document.getElementById('btn-autenticar');
const passMaestraInput = document.getElementById('pass-maestra');
const adminBloqueado = document.getElementById('admin-bloqueado');
const adminDesbloqueado = document.getElementById('admin-desbloqueado');
const msgErrorAdmin = document.getElementById('msg-error-admin');

if (adminDesbloqueado) adminDesbloqueado.style.display = "none";

btnAutenticar?.addEventListener('click', () => {
    if (passMaestraInput?.value === "Ariar 2026") {
        if (adminBloqueado) adminBloqueado.style.display = "none";
        if (adminDesbloqueado) adminDesbloqueado.style.display = "block";
        actualizarFechaEncabezadoAdmin();
        renderizarTablaAdmin();
    } else {
        if (msgErrorAdmin) msgErrorAdmin.innerText = "❌ Clave incorrecta. Acceso Denegado.";
        if (passMaestraInput) passMaestraInput.value = "";
    }
});

// --- FUNCIONES GLOBALES ASIGNADAS A WINDOW ---
window.modificarDatosBaseCrew = function(index, campo, valor) {
    if(crewAriar[index]) {
        crewAriar[index][campo] = valor.trim();
    }
};

window.inyectarDatosFechaHoy = function(index) {
    if(!crewAriar[index]) return;
    
    const horasInput = document.getElementById(`horas-hoy-${index}`);
    const ubicacionSelect = document.getElementById(`ubicacion-hoy-${index}`);
    
    if (!horasInput || !ubicacionSelect) return;

    let cantHoras = parseFloat(horasInput.value);
    if (isNaN(cantHoras) || cantHoras < 0) cantHoras = 0;
    
    const ubicacionActual = ubicacionSelect.value;
    const fechaHoyString = obtenerFechaFormateada();

    const registroExistente = crewAriar[index].historialHoras.find(r => r.fecha === fechaHoyString);

    if (registroExistente) {
        if (cantHoras === 0) {
            crewAriar[index].historialHoras = crewAriar[index].historialHoras.filter(r => r.fecha !== fechaHoyString);
        } else {
            registroExistente.cant = cantHoras;
            registroExistente.ubicacion = ubicacionActual;
        }
    } else if (cantHoras > 0) {
        crewAriar[index].historialHoras.push({
            fecha: fechaHoyString,
            ubicacion: ubicacionActual,
            cant: cantHoras
        });
    }

    const acumuladoTotal = crewAriar[index].historialHoras.reduce((acc, o) => acc + o.cant, 0);
    const badge = document.getElementById(`total-badge-${index}`);
    if(badge) badge.innerText = `${acumuladoTotal} hrs en total`;
};

window.eliminarEmpleadoCrew = function(index) {
    const empleado = crewAriar[index];
    if (confirm(`¿Estás seguro de eliminar a ${empleado.nombre} del sistema?`)) {
        crewAriar.splice(index, 1);
        renderizarTablaAdmin();
    }
};