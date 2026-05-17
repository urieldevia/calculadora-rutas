if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('PWA Offline Activa'))
      .catch(err => console.error('Error PWA:', err));
}


// ==========================================
// 1. ESTADO DE LA APLICACIÓN (MEMORIA)
// ==========================================
// Creamos un objeto que guardará todos nuestros datos.
let appData = {
    fecha: new Date().toISOString().split('T')[0], // ej: "2026-05-17"
    kmSalida: '',
    kmLlegada: '',
    precioLitro: 23.99,
    cargaPesos: '',
    viajes: [''] // Empezamos con 1 viaje vacío
};

// ==========================================
// 2. REFERENCIAS AL DOM (El HTML)
// ==========================================
// Capturamos los elementos del HTML para manipularlos con JS
const inputs = {
    fecha: document.getElementById('fechaCorteInput'),
    fechaDisplay: document.getElementById('fechaCorteDisplay'),
    kmS: document.getElementById('kmSalida'),
    kmL: document.getElementById('kmLlegada'),
    precioL: document.getElementById('precioLitro'),
    cargaP: document.getElementById('cargaPesos')
};

const displays = {
    kmTotales: document.getElementById('kmRecorridos'),
    gasTotal: document.getElementById('gasTotal'),
    totalGen: document.getElementById('totalGenerado'),
    neto: document.getElementById('gananciaNeta'),
    mitad: document.getElementById('gananciaDividida')
};

const contenedorViajes = document.getElementById('contenedorViajes');

// ==========================================
// 3. INICIALIZACIÓN Y LOCALSTORAGE
// ==========================================
// Esta función arranca cuando la página carga
function iniciarApp() {
    cargarDatosGuardados();
    renderizarViajes();
    asignarEventos();
    calcularTotales();
    formatearFechaLarga();
}

// LocalStorage es la base de datos del navegador. 
// JSON.stringify convierte nuestro objeto a texto para guardarlo.
// JSON.parse lo convierte de texto a objeto otra vez.
function guardarDatos() {
    localStorage.setItem('corteCajaPro', JSON.stringify(appData));
}

function cargarDatosGuardados() {
    const datosGuardados = localStorage.getItem('corteCajaPro');
    if (datosGuardados) {
        // Si hay datos guardados, sobrescribimos appData
        appData = JSON.parse(datosGuardados);
    }
    
    // Pasamos los datos de memoria a los inputs visuales
    inputs.fecha.value = appData.fecha;
    inputs.kmS.value = appData.kmSalida;
    inputs.kmL.value = appData.kmLlegada;
    inputs.precioL.value = appData.precioLitro;
    inputs.cargaP.value = appData.cargaPesos;
}

// ==========================================
// 4. LÓGICA DE CÁLCULOS
// ==========================================
function calcularTotales() {
    // 1. KM
    let sal = parseFloat(inputs.kmS.value) || 0; // || 0 significa "si está vacío o es NaN, usa 0"
    let lleg = parseFloat(inputs.kmL.value) || 0;
    let recorridos = Math.max(0, lleg - sal); // Evita números negativos
    displays.kmTotales.textContent = `${recorridos} km`;

    // 2. Gasolina (Regla de negocio: Sumar $10 fijos siempre)
    let cargaBase = parseFloat(inputs.cargaP.value) || 0;
    // ¡IMPORTANTE! Si hay carga base, sumamos 10. Si no hay nada, es 0.
    let gasTotalReal = cargaBase > 0 ? cargaBase + 10 : 0; 
    displays.gasTotal.textContent = `$${gasTotalReal.toFixed(2)}`;

    // 3. Viajes
    let totalIngresos = 0;
    appData.viajes.forEach(monto => {
        totalIngresos += parseFloat(monto) || 0;
    });
    displays.totalGen.textContent = `$${totalIngresos.toFixed(2)}`;

    // 4. Neta y División
    let neta = totalIngresos - gasTotalReal;
    displays.neto.textContent = `$${neta.toFixed(2)}`;
    displays.mitad.textContent = `$${(neta / 2).toFixed(2)} c/u`;

    // Actualizamos la memoria principal y guardamos en LocalStorage
    appData.kmSalida = inputs.kmS.value;
    appData.kmLlegada = inputs.kmL.value;
    appData.precioLitro = inputs.precioL.value;
    appData.cargaPesos = inputs.cargaP.value;
    guardarDatos();
}

// ==========================================
// 5. MANEJO DE VIAJES DINÁMICOS
// ==========================================
function renderizarViajes() {
    contenedorViajes.innerHTML = ''; // Limpiamos la caja
    
    appData.viajes.forEach((monto, index) => {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label>Viaje ${index + 1}</label>
            <input type="number" class="input-viaje" data-index="${index}" value="${monto}" placeholder="0">
        `;
        contenedorViajes.appendChild(div);
    });

    // Reasignamos el evento de escuchar a los nuevos inputs
    document.querySelectorAll('.input-viaje').forEach(input => {
        input.addEventListener('input', (e) => {
            let idx = e.target.getAttribute('data-index');
            appData.viajes[idx] = e.target.value;
            calcularTotales();
        });
    });
}

// ==========================================
// 6. FECHA LARGA Y EVENTOS
// ==========================================
function formatearFechaLarga() {
    // Usamos la API de Internacionalización de JS para formato profesional
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    // Añadimos 'T12:00:00' para evitar desfases de zona horaria (bugs de 1 día antes)
    const fechaObj = new Date(appData.fecha + 'T12:00:00');
    let texto = fechaObj.toLocaleDateString('es-MX', opciones);
    
    // Capitalizamos la primera letra
    texto = texto.charAt(0).toUpperCase() + texto.slice(1);
    displays.fechaDisplay.textContent = texto;
}

function asignarEventos() {
    // Cada vez que un usuario escribe en un input, recalculamos
    [inputs.kmS, inputs.kmL, inputs.precioL, inputs.cargaP].forEach(input => {
        input.addEventListener('input', calcularTotales);
    });

    // Evento de cambio de fecha
    inputs.fecha.addEventListener('change', (e) => {
        appData.fecha = e.target.value;
        formatearFechaLarga();
        guardarDatos();
    });

    // Agregar viaje
    document.getElementById('btnAgregarViaje').addEventListener('click', () => {
        appData.viajes.push('');
        renderizarViajes();
        guardarDatos();
    });

    // ==========================================
    // 7. BOTÓN NUEVO DÍA
    // ==========================================
    document.getElementById('btnNuevoDia').addEventListener('click', () => {
        if(confirm('¿Iniciar un nuevo día? Los datos actuales se borrarán.')) {
            // El kilometraje de llegada de ayer, es el de salida de hoy
            let kmLlegadaAyer = appData.kmLlegada;
            
            appData = {
                fecha: new Date().toISOString().split('T')[0], // Fecha de hoy
                kmSalida: kmLlegadaAyer,
                kmLlegada: '',
                precioLitro: appData.precioLitro, // Conservamos el precio de gasolina
                cargaPesos: '',
                viajes: ['']
            };
            
            cargarDatosGuardados(); // Resetea visualmente
            renderizarViajes();
            calcularTotales();
            formatearFechaLarga();
        }
    });

    // Eventos para Exportación (se conectan a las otras librerías)
    document.getElementById('btnCompartirImg').addEventListener('click', generarImagen);
    document.getElementById('btnExportarPDF').addEventListener('click', generarPDF);
}

// INICIAR AL CARGAR
window.addEventListener('DOMContentLoaded', iniciarApp);

// ==========================================
// 8. FUNCIONES DE EXPORTACIÓN (html2canvas y html2pdf)
// ==========================================
function generarImagen() {
    const elemento = document.getElementById('reporteCaja');
    // html2canvas "toma una foto" del HTML
    html2canvas(elemento, { scale: 2, useCORS: true }).then(canvas => {
        // Convertimos el canvas a imagen PNG
        let enlace = document.createElement('a');
        enlace.download = `Corte_${appData.fecha}.png`;
        enlace.href = canvas.toDataURL("image/png");
        enlace.click(); // Forzamos la descarga
    });
}

function generarPDF() {
    const elemento = document.getElementById('reporteCaja');
    const opt = {
        margin:       10,
        filename:     `Corte_${appData.fecha}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // html2pdf procesa el elemento usando la configuración
    html2pdf().set(opt).from(elemento).save();
}