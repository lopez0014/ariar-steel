// =========================================================================
// CEREBRO CON CREW ACTUALIZADO Y PERSISTENCIA LOCAL - ARIAR STEEL LLC
// =========================================================================
import { historialCrew } from './horas.js';

const CLAVE_MAESTRA_SISTEMA = "ariar2026";

// --- BASE DE DATOS LOCAL CON TU CREW OFICIAL (CON PERSISTENCIA) ---
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

// Cargar del localStorage si ya existen datos modificados, sino usar la base de arriba
let crewAriar = JSON.parse(localStorage.getItem('crewAriarData')) || crewInicial;
let historialHojasFotos = JSON.parse(localStorage.getItem('historialHojasFotos')) || [];

function sincronizarBaseLocal() {
    localStorage.setItem('crewAriarData', JSON.stringify(crewAriar));
}

function sincronizarFotosLocal() {
    localStorage.setItem('historialHojasFotos', JSON.stringify(historialHojasFotos));
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

// --- AUTENTICACIÓN PANEL DE CONTROL MÁSTER ---
document.getElementById('btn-autenticar')?.addEventListener('click', () => {
    const passMaestra = document.getElementById('pass-maestra')?.value;
    const errorAdmin = document.getElementById('msg-error-admin');
    
    if (passMaestra === CLAVE_MAESTRA_SISTEMA) {
        document.getElementById('admin-bloqueado').style.display = 'none';
        document.getElementById('admin-desbloqueado').style.display = 'block';
        actualizarFechaEncabezadoAdmin();
        renderizarTablaAdmin();
        renderizarGaleriaHojas();
    } else {
        if (errorAdmin) errorAdmin.innerText = "❌ Clave Maestra de Seguridad Incorrecta.";
    }
});

// --- RENDERIZAR TABLA ADMINISTRACIÓN CON LOS ESCUCHADORES AUTO-GUARDABLES ---
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
                    <button class="btn-eliminar-dinamico" data-id="${idx}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-trash-can"></i> Eliminar
                    </button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.75rem; color:#64748b;">Credenciales de entrada:</span>
                    <span id="total-badge-${idx}" style="font-size:0.75rem; color:#10b981; font-weight:700;">Lleva: ${acumuladoTotal} hrs en total</span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
                    <input type="text" value="${emp.telefono}" placeholder="Usuario" class="input-mod-telefono" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#fff; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center;">
                    <input type="text" value="${emp.pin}" placeholder="PIN" class="input-mod-pin" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.06); color:#f59e0b; padding:5px; border-radius:4px; font-size:0.78rem; text-align:center; font-weight:700;">
                </div>

                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);"><i class="fa-solid fa-location-dot"></i> Proyecto / Obra:</span>
                        <select class="select-mod-ubicacion" data-id="${idx}" style="background:#000; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.78rem;">
                            <option value="Austin, Texas" ${ubicacionHoy === "Austin, Texas" ? "selected" : ""}>Austin, TX</option>
                            <option value="San Antonio, Texas" ${ubicacionHoy === "San Antonio, Texas" ? "selected" : ""}>San Antonio, TX</option>
                            <option value="Wichita, Texas" ${ubicacionHoy === "Wichita, Texas" ? "selected" : ""}>Wichita, TX</option>
                        </select>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--texto-secundario);"><i class="fa-regular fa-clock"></i> Horas de Hoy:</span>
                        <input type="number" 
                               class="input-mod-horas"
                               data-id="${idx}"
                               value="${valorHorasHoy}" 
                               min="0" 
                               step="0.5" 
                               style="width:80px; background: #000; border:1px solid rgba(255,255,255,0.1); color:#fff; text-align:center; padding:3px; border-radius:4px; font-weight:700;">
                    </div>
                </div>
            </div>
        `;
    });
    htmlTabla += `</div>`;
    tablaRegistrosAdmin.innerHTML = htmlTabla;

    // --- CAPTURA DE EVENTOS DINÁMICOS PARA MODIFICACIÓN DIRECTA ---
    document.querySelectorAll('.input-mod-horas').forEach(element => {
        element.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-id');
            const numHoras = parseFloat(e.target.value) || 0;
            inyectarHorasProceso(index, numHoras);
        });
    });

    document.querySelectorAll('.select-mod-ubicacion').forEach(element => {
        element.addEventListener('change', (e) => {
            const index = e.target.getAttribute('data-id');
            const txtUbicacion = e.target.value;
            inyectarUbicacionProceso(index, txtUbicacion);
        });
    });

    document.querySelectorAll('.input-mod-telefono').forEach(element => {
        element.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-id');
            crewAriar[index].telefono = e.target.value.trim();
            sincronizarBaseLocal();
        });
    });

    document.querySelectorAll('.input-mod-pin').forEach(element => {
        element.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-id');
            crewAriar[index].pin = e.target.value.trim();
            sincronizarBaseLocal();
        });
    });

    document.querySelectorAll('.btn-eliminar-dinamico').forEach(element => {
        element.addEventListener('click', (e) => {
            const index = e.target.closest('button').getAttribute('data-id');
            crewAriar.splice(index, 1);
            sincronizarBaseLocal();
            renderizarTablaAdmin();
        });
    });
}

// Lógica interna para inyectar datos y actualizar acumulados sin recargar
function inyectarHorasProceso(idx, cantHoras) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    
    if (registro) {
        registro.cant = cantHoras;
    } else {
        const obraActual = document.querySelector(`.select-mod-ubicacion[data-id="${idx}"]`).value;
        crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: obraActual, cant: cantHoras });
    }
    sincronizarBaseLocal();
    
    // Actualizar badge de acumulado total visible en tiempo real
    const acumuladoTotal = crewAriar[idx].historialHoras.reduce((acc, o) => acc + o.cant, 0);
    const badge = document.getElementById(`total-badge-${idx}`);
    if (badge) badge.innerText = `Lleva: ${acumuladoTotal} hrs en total`;
}

function inyectarUbicacionProceso(idx, ubicacionTxt) {
    const fechaHoy = obtenerFechaFormateada();
    let registro = crewAriar[idx].historialHoras.find(r => r.fecha === fechaHoy);
    
    if (registro) {
        registro.ubicacion = ubicacionTxt;
    } else {
        const horasActuales = parseFloat(document.querySelector(`.input-mod-horas[data-id="${idx}"]`).value) || 0;
        crewAriar[idx].historialHoras.push({ fecha: fechaHoy, ubicacion: ubicacionTxt, cant: horasActuales });
    }
    sincronizarBaseLocal();
}

// --- LÓGICA DE CAPTURA DE FOTOS (HOJAS DEL ENCARGADO) ---
const btnActivarCamara = document.getElementById('btn-activar-camara');
const inputCamara = document.getElementById('input-camara');
const txtEstadoFoto = document.getElementById('txt-estado-foto');

btnActivarCamara?.addEventListener('click', () => {
    inputCamara?.click();
});

inputCamara?.addEventListener('change', (e) => {
    const fichero = e.target.files[0];
    if (fichero) {
        if (txtEstadoFoto) txtEstadoFoto.innerText = "Guardando archivo...";
        
        const lectorArchivo = new FileReader();
        lectorArchivo.onload = function(eventoCarga) {
            const base64Str = eventoCarga.target.result;
            const nuevaHojaFoto = {
                fecha: obtenerFechaFormateada() + " - " + new Date().toLocaleTimeString('es-US', { hour: '2-digit', minute: '2-digit' }),
                imagen: base64Str
            };
            historialHojasFotos.unshift(nuevaHojaFoto);
            sincronizarFotosLocal();
            if (txtEstadoFoto) txtEstadoFoto.innerText = "✔️ Copia archivada exitosamente";
            renderizarGaleriaHojas();
        };
        lectorArchivo.readAsDataURL(fichero);
    }
});

function renderizarGaleriaHojas() {
    const contenedor = document.getElementById('contenedor-galeria-hojas');
    if (!contenedor) return;

    if (historialHojasFotos.length === 0) {
        contenedor.innerHTML = `<p style="font-size:0.8rem; color:var(--texto-secundario); grid-column:1/-1;">No se han subido registros físicos en esta sesión.</p>`;
        return;
    }

    contenedor.innerHTML = historialHojasFotos.map((hoja, index) => `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center;">
            <img src="${hoja.imagen}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; cursor: pointer;" onclick="window.open('${hoja.imagen}')">
            <span style="font-size: 0.68rem; color: var(--texto-secundario); display: block; margin-top: 6px; font-weight:600;">${hoja.fecha}</span>
            <button class="btn-borrar-foto" data-img-id="${index}" style="background:none; border:none; color:var(--rojo-error); font-size:0.72rem; margin-top:5px; cursor:pointer; font-weight:700;">
                <i class="fa-solid fa-trash"></i> Eliminar
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.btn-borrar-foto').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const imgIdx = e.target.closest('button').getAttribute('data-img-id');
            historialHojasFotos.splice(imgIdx, 1);
            sincronizarFotosLocal();
            renderizarGaleriaHojas();
        });
    });
}

// --- EVENTOS DEL MENÚ LATERAL ---
links.dash?.addEventListener('click', () => cambiarVista('dash', 'Entrar a mis horas'));
links.registro?.addEventListener('click', () => cambiarVista('registro', 'Registro de empleado'));
links.admin?.addEventListener('click', () => {
    cambiarVista('admin', 'Administración');
    actualizarFechaEncabezadoAdmin();
});

// Inicializar UI y renderizar el saludo dinámico desde el arranque
armarLoginUI();
const contenedorSaludo = document.getElementById('saludo-pantalla');
if (contenedorSaludo) {
    contenedorSaludo.innerText = obtenerSaludoSegunHora();
}

// Actualizar el encabezado con el emoji de grúa original
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
    const telefono = document.getElementById('reg-telefono').value.trim();
    const pin = document.getElementById('reg-pass').value.trim();

    if (!nombre || !telefono || !pin) return;

    const existe = crewAriar.some(e => e.telefono === telefono);
    if (existe) {
        if (msgFeedback) {
            msgFeedback.style.color = "var(--rojo-error)";
            msgFeedback.innerText = "❌ Este número de teléfono ya está registrado.";
        }
        return;
    }

    crewAriar.push({ nombre, telefono, pin, historialHoras: [] });
    sincronizarBaseLocal();

    if (msgFeedback) {
        msgFeedback.style.color = "var(--verde-dinero)";
        msgFeedback.innerText = `¡${nombre} registrado con éxito en el Crew!`;
    }
    document.getElementById('form-alta-empleado').reset();
});