// FORZAR ACTUALIZACIÓN DEL SERVICE WORKER
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.update();
        }
    });
    navigator.serviceWorker.register('./sw.js?v=1.1')
      .then(() => console.log('Sistema offline en red.'))
      .catch(err => console.error('Error PWA:', err));
}

let appData = {
    fecha: new Date().toISOString().split('T')[0],
    kmSalida: '',
    kmLlegada: '',
    precioLitro: 23.99,
    cargaPesos: '',
    viajes: ['']
};

let historialCortes = [];

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
const listaHistorialContenedor = document.getElementById('listaHistorial');

function iniciarApp() {
    cargarEstructuraPersistente();
    renderizarSeccionViajes();
    renderizarHistorialVisual();
    enlazarEventosInteractivos();
    calcularResultadosFinancieros(false);
    actualizarFechaLargaFormato();
}

function guardarPersistencia() {
    localStorage.setItem('corteCajaPro_Activo', JSON.stringify(appData));
    localStorage.setItem('corteCajaPro_Historial', JSON.stringify(historialCortes));
}

function cargarEstructuraPersistente() {
    const activoGuardado = localStorage.getItem('corteCajaPro_Activo');
    const historialGuardado = localStorage.getItem('corteCajaPro_Historial');
    
    if (activoGuardado) appData = JSON.parse(activoGuardado);
    if (historialGuardado) historialCortes = JSON.parse(historialGuardado);
    
    inputs.fecha.value = appData.fecha;
    inputs.kmS.value = appData.kmSalida;
    inputs.kmL.value = appData.kmLlegada;
    inputs.precioL.value = appData.precioLitro;
    inputs.cargaP.value = appData.cargaPesos;
}

function sincronizarConHistorial() {
    const indiceExistente = historialCortes.findIndex(item => item.fecha === appData.fecha);
    const copiaCorte = JSON.parse(JSON.stringify(appData));
    
    if (indiceExistente !== -1) {
        historialCortes[indiceExistente] = copiaCorte;
    } else {
        historialCortes.push(copiaCorte);
    }
    
    historialCortes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    guardarPersistencia();
    renderizarHistorialVisual();
}

function calcularResultadosFinancieros(debeSincronizarHistorial = true) {
    let kSal = parseFloat(inputs.kmS.value) || 0;
    let kLleg = parseFloat(inputs.kmL.value) || 0;
    let recorridoTotal = Math.max(0, kLleg - kSal);
    displays.kmTotales.textContent = `${recorridoTotal} km`;

    let pLitro = parseFloat(inputs.precioL.value) || 0;
    let gasolinaDescontar = 0;

    // MATEMÁTICA CORREGIDA: ((Recorrido Total / 10) * Precio por Litro) + 10
    if (inputs.cargaP.value === '') {
        if (recorridoTotal > 0) {
            gasolinaDescontar = ((recorridoTotal / 10) * pLitro) + 10;
        }
    } else {
        let cargaManual = parseFloat(inputs.cargaP.value) || 0;
        if (cargaManual > 0) gasolinaDescontar = cargaManual + 10;
    }

    displays.gasTotal.textContent = `$${gasolinaDescontar.toFixed(2)}`;

    let sumaViajes = 0;
    appData.viajes.forEach(monto => {
        sumaViajes += parseFloat(monto) || 0;
    });
    displays.totalGen.textContent = `$${sumaViajes.toFixed(2)}`;

    let gananciaNetaFinal = sumaViajes - gasolinaDescontar;
    displays.neto.textContent = `$${gananciaNetaFinal.toFixed(2)}`;
    displays.mitad.textContent = `$${(gananciaNetaFinal / 2).toFixed(2)} c/u`;

    appData.kmSalida = inputs.kmS.value;
    appData.kmLlegada = inputs.kmL.value;
    appData.precioLitro = inputs.precioL.value;
    appData.cargaPesos = inputs.cargaP.value;
    
    if (debeSincronizarHistorial) sincronizarConHistorial();
    else guardarPersistencia();
}

function renderizarSeccionViajes() {
    contenedorViajes.innerHTML = '';
    appData.viajes.forEach((monto, idx) => {
        const fila = document.createElement('div');
        fila.className = 'input-group';
        fila.innerHTML = `
            <label>Viaje ${idx + 1}</label>
            <input type="number" class="input-viaje-dinamico" data-id="${idx}" value="${monto}" placeholder="0">
        `;
        contenedorViajes.appendChild(fila);
    });

    document.querySelectorAll('.input-viaje-dinamico').forEach(el => {
        el.addEventListener('input', (e) => {
            appData.viajes[e.target.getAttribute('data-id')] = e.target.value;
            calcularResultadosFinancieros(true);
        });
    });
}

function renderizarHistorialVisual() {
    listaHistorialContenedor.innerHTML = '';
    if (historialCortes.length === 0) {
        listaHistorialContenedor.innerHTML = `<div class="history-empty">No hay cortes registrados en el historial.</div>`;
        return;
    }
    
    historialCortes.forEach(corte => {
        let totalV = corte.viajes.reduce((a, b) => a + (parseFloat(b) || 0), 0);
        let rec = Math.max(0, (parseFloat(corte.kmLlegada) || 0) - (parseFloat(corte.kmSalida) || 0));
        let pLitro = parseFloat(corte.precioLitro) || 0;
        
        // MATEMÁTICA CORREGIDA PARA HISTORIAL
        let gas = 0;
        if (corte.cargaPesos === '') {
            if (rec > 0) gas = ((rec / 10) * pLitro) + 10;
        } else {
            let cargaManual = parseFloat(corte.cargaPesos) || 0;
            if (cargaManual > 0) gas = cargaManual + 10;
        }

        let neto = totalV - gas;

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <span class="history-date">${corte.fecha}</span>
                <span class="history-amount">Neta: $${neto.toFixed(2)}</span>
            </div>
            <div class="history-buttons">
                <button class="btn-history-action btn-history-load" data-fecha="${corte.fecha}">Abrir</button>
                <button class="btn-history-action btn-history-delete" data-fecha="${corte.fecha}">Borrar</button>
            </div>
        `;
        listaHistorialContenedor.appendChild(item);
    });

    document.querySelectorAll('.btn-history-load').forEach(btn => {
        btn.addEventListener('click', e => reabrirAntecedenteDia(e.target.getAttribute('data-fecha')));
    });

    document.querySelectorAll('.btn-history-delete').forEach(btn => {
        btn.addEventListener('click', e => eliminarRegistroHistorial(e.target.getAttribute('data-fecha')));
    });
}

function reabrirAntecedenteDia(fechaSeleccionada) {
    const registro = historialCortes.find(item => item.fecha === fechaSeleccionada);
    if (registro) {
        appData = JSON.parse(JSON.stringify(registro));
        inputs.fecha.value = appData.fecha;
        inputs.kmS.value = appData.kmSalida;
        inputs.kmL.value = appData.kmLlegada;
        inputs.precioL.value = appData.precioLitro;
        inputs.cargaP.value = appData.cargaPesos;
        
        renderizarSeccionViajes();
        calcularResultadosFinancieros(false);
        actualizarFechaLargaFormato();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function eliminarRegistroHistorial(fechaSeleccionada) {
    if (confirm(`¿Eliminar permanentemente el corte del día ${fechaSeleccionada}?`)) {
        historialCortes = historialCortes.filter(item => item.fecha !== fechaSeleccionada);
        guardarPersistencia();
        renderizarHistorialVisual();
        if (appData.fecha === fechaSeleccionada) ejecutarLimpiezaNuevoDia();
    }
}

function actualizarFechaLargaFormato() {
    const conversionFecha = new Date(appData.fecha + 'T12:00:00');
    let textoResultado = conversionFecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    textoResultado = textoResultado.replace(/de ([a-z])/g, (m, p1) => 'de ' + p1.toUpperCase());
    displays.fechaDisplay.textContent = textoResultado.charAt(0).toUpperCase() + textoResultado.slice(1);
}

function ejecutarLimpiezaNuevoDia() {
    appData = {
        fecha: new Date().toISOString().split('T')[0],
        kmSalida: appData.kmLlegada, // Pasa el de llegada de ayer al de salida de hoy
        kmLlegada: '',
        precioLitro: appData.precioLitro,
        cargaPesos: '',
        viajes: ['']
    };
    inputs.fecha.value = appData.fecha;
    inputs.kmS.value = appData.kmSalida;
    inputs.kmL.value = appData.kmLlegada;
    inputs.cargaP.value = appData.cargaPesos;
    
    renderizarSeccionViajes();
    calcularResultadosFinancieros(true);
    actualizarFechaLargaFormato();
}

function enlazarEventosInteractivos() {
    [inputs.kmS, inputs.kmL, inputs.precioL, inputs.cargaP].forEach(entrada => {
        entrada.addEventListener('input', () => calcularResultadosFinancieros(true));
    });

    inputs.fecha.addEventListener('change', (e) => {
        appData.fecha = e.target.value;
        actualizarFechaLargaFormato();
        const registroExistente = historialCortes.find(item => item.fecha === appData.fecha);
        if (registroExistente) reabrirAntecedenteDia(appData.fecha);
        else calcularResultadosFinancieros(true);
    });

    document.getElementById('btnAgregarViaje').addEventListener('click', () => {
        appData.viajes.push('');
        renderizarSeccionViajes();
        calcularResultadosFinancieros(true);
    });

    document.getElementById('btnNuevoDia').addEventListener('click', () => {
        if (confirm('¿Iniciar un nuevo día de trabajo?')) ejecutarLimpiezaNuevoDia();
    });

    document.getElementById('btnCompartirImg').addEventListener('click', ejecutarProtocoloCompartir);
}

function ejecutarProtocoloCompartir() {
    const zonaCaptura = document.getElementById('contenedorReporte');
    const botonViaje = document.getElementById('btnAgregarViaje');
    const selectorFechaInput = document.getElementById('fechaCorteInput');

    botonViaje.classList.add('hidden-capture');
    selectorFechaInput.classList.add('hidden-capture');

    html2canvas(zonaCaptura, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }).then(canvas => {
        botonViaje.classList.remove('hidden-capture');
        selectorFechaInput.classList.remove('hidden-capture');

        canvas.toBlob(blob => {
            if (!blob) return alert("Error al procesar la imagen.");
            const archivoImagen = new File([blob], `Corte_${appData.fecha}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [archivoImagen] })) {
                navigator.share({
                    files: [archivoImagen],
                    title: 'Reporte Asistencia Vial RM',
                    text: `Corte de Caja de la fecha: ${appData.fecha}`
                }).catch(err => console.log('Compartición cancelada:', err));
            } else {
                let enlaceDescarga = document.createElement('a');
                enlaceDescarga.download = `Corte_${appData.fecha}.png`;
                enlaceDescarga.href = URL.createObjectURL(blob);
                enlaceDescarga.click();
                alert("Imagen descargada a tus archivos. Abre WhatsApp para enviarla.");
            }
        }, 'image/png');
    });
}

window.addEventListener('DOMContentLoaded', iniciarApp);