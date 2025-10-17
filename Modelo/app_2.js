// Datos del agente (simulación de API)
const AGENTE_DATA = {
    colombianismos: {
        informal: ["bacano", "chévere", "parce", "berraco", "mamagallismo", "parcero", "rumba", "chimba"],
        formal: ["cordialmente", "atentamente", "comedidamente", "nos permitimos informar"]
    },
    correcciones: {
        "estas": { texto: "estés", confianza: 0.95, tipo: "corrección" },
        "tambien": { texto: "también", confianza: 0.98, tipo: "corrección" },
        "analisis": { texto: "análisis", confianza: 0.92, tipo: "corrección" },
        "martinez": { texto: "Martínez", confianza: 0.89, tipo: "corrección" },
        "camion": { texto: "camión", confianza: 0.87, tipo: "corrección" },
        "como": { texto: "cómo", confianza: 0.91, tipo: "corrección" },
        "que": { texto: "qué", confianza: 0.88, tipo: "corrección" },
        "mas": { texto: "más", confianza: 0.94, tipo: "corrección" }
    },
    predicciones_contextuales: {
        informal: [
            { texto: "chévere", confianza: 0.88, tipo: "predicción" },
            { texto: "bacano", confianza: 0.82, tipo: "predicción" },
            { texto: "genial", confianza: 0.75, tipo: "predicción" }
        ],
        formal: [
            { texto: "cordialmente", confianza: 0.91, tipo: "completado" },
            { texto: "atentamente", confianza: 0.87, tipo: "completado" }
        ],
        academico: [
            { texto: "investigación", confianza: 0.84, tipo: "predicción" },
            { texto: "metodología", confianza: 0.79, tipo: "predicción" }
        ]
    },
    metricas: {
        precision: 89,
        latencia: 143,
        kss: 41,
        acceptance: 81
    }
};

// Estado de la aplicación
let estadoApp = {
    contextoActual: 'general',
    textoActual: '',
    sugerenciasActivas: [],
    metricas: { ...AGENTE_DATA.metricas },
    autoSugerenciasActivo: true,
    ultimaPosicionCursor: 0,
    estadisticas: {
        palabrasEscritas: 0,
        sugerenciasAceptadas: 0,
        tiempoInicio: Date.now()
    }
};

// Elementos del DOM
const elementos = {
    editor: null,
    listaSugerencias: null,
    contextoSelect: null,
    contadorPalabras: null,
    ultimaActualizacion: null,
    autoSugerenciasToggle: null,
    metricas: {},
    btnObtenerSugerencias: null,
    btnLimpiar: null,
    btnDemo: null,
    demoCases: null
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    inicializarElementos();
    configurarEventListeners();
    inicializarMetricas();
    mostrarMensajeBienvenida();
});

function inicializarElementos() {
    elementos.editor = document.getElementById('textoEditor');
    elementos.listaSugerencias = document.getElementById('listaSugerencias');
    elementos.contextoSelect = document.getElementById('contexto');
    elementos.contadorPalabras = document.getElementById('contadorPalabras');
    elementos.ultimaActualizacion = document.getElementById('ultimaActualizacion');
    elementos.autoSugerenciasToggle = document.getElementById('autoSugerencias');
    elementos.btnObtenerSugerencias = document.getElementById('btnObtenerSugerencias');
    elementos.btnLimpiar = document.getElementById('btnLimpiar');
    elementos.btnDemo = document.getElementById('btnDemo');
    elementos.demoCases = document.querySelectorAll('.demo-case');
    
    // Elementos de métricas
    elementos.metricas.precision = document.getElementById('metricaPrecision');
    elementos.metricas.latencia = document.getElementById('metricaLatencia');
    elementos.metricas.kss = document.getElementById('metricaKSS');
    elementos.metricas.aceptacion = document.getElementById('metricaAceptacion');
}

function configurarEventListeners() {
    // Editor de texto
    elementos.editor.addEventListener('input', manejarCambioTexto);
    elementos.editor.addEventListener('keyup', manejarTeclaLiberada);
    elementos.editor.addEventListener('selectionchange', manejarCambioCursor);
    
    // Controles
    elementos.contextoSelect.addEventListener('change', manejarCambioContexto);
    elementos.autoSugerenciasToggle.addEventListener('change', manejarToggleAutoSugerencias);
    elementos.btnObtenerSugerencias.addEventListener('click', obtenerSugerenciasManual);
    elementos.btnLimpiar.addEventListener('click', limpiarTexto);
    elementos.btnDemo.addEventListener('click', activarModoDemo);
    
    // Casos demo
    elementos.demoCases.forEach(caso => {
        caso.addEventListener('click', () => cargarCasoDemo(caso));
    });
}

function manejarCambioTexto(event) {
    estadoApp.textoActual = event.target.value;
    actualizarContadorPalabras();
    actualizarUltimaModificacion();
    
    if (estadoApp.autoSugerenciasActivo) {
        debounce(procesarTextoParaSugerencias, 300)();
    }
}

function manejarTeclaLiberada(event) {
    estadoApp.ultimaPosicionCursor = event.target.selectionStart;
    
    // Procesar sugerencias en teclas específicas
    if ([' ', '.', ',', ';', ':', '?', '!'].includes(event.key)) {
        if (estadoApp.autoSugerenciasActivo) {
            procesarTextoParaSugerencias();
        }
    }
}

function manejarCambioCursor() {
    if (elementos.editor === document.activeElement) {
        estadoApp.ultimaPosicionCursor = elementos.editor.selectionStart;
    }
}

function manejarCambioContexto(event) {
    estadoApp.contextoActual = event.target.value;
    
    if (estadoApp.textoActual && estadoApp.autoSugerenciasActivo) {
        procesarTextoParaSugerencias();
    }
    
    mostrarNotificacion(`Contexto cambiado a: ${event.target.value}`, 'info');
}

function manejarToggleAutoSugerencias(event) {
    estadoApp.autoSugerenciasActivo = event.target.checked;
    
    if (!estadoApp.autoSugerenciasActivo) {
        limpiarSugerencias();
    } else if (estadoApp.textoActual) {
        procesarTextoParaSugerencias();
    }
}

function procesarTextoParaSugerencias() {
    if (!estadoApp.textoActual.trim()) {
        limpiarSugerencias();
        return;
    }
    
    const palabras = estadoApp.textoActual.toLowerCase().split(/\s+/);
    const ultimaPalabra = palabras[palabras.length - 1];
    const palabraAnterior = palabras.length > 1 ? palabras[palabras.length - 2] : '';
    
    const sugerencias = [];
    
    // 1. Verificar correcciones ortográficas
    const correccion = verificarCorrecciones(ultimaPalabra, palabraAnterior);
    if (correccion) {
        sugerencias.push(correccion);
    }
    
    // 2. Generar predicciones contextuales
    const predicciones = generarPredicciones(palabras, estadoApp.contextoActual);
    sugerencias.push(...predicciones);
    
    // 3. Sugerir colombianismos si es apropiado
    const colombianismos = sugerirColombianismos(palabras, estadoApp.contextoActual);
    sugerencias.push(...colombianismos);
    
    // Actualizar estado y UI
    estadoApp.sugerenciasActivas = sugerencias;
    mostrarSugerencias(sugerencias);
    actualizarMetricasEnTiempoReal();
}

function verificarCorrecciones(ultimaPalabra, palabraAnterior) {
    // Verificar la última palabra
    if (AGENTE_DATA.correcciones[ultimaPalabra]) {
        const correccion = AGENTE_DATA.correcciones[ultimaPalabra];
        return {
            ...correccion,
            palabraOriginal: ultimaPalabra,
            icono: '✓'
        };
    }
    
    // Verificar la palabra anterior si la actual está incompleta
    if (palabraAnterior && AGENTE_DATA.correcciones[palabraAnterior]) {
        const correccion = AGENTE_DATA.correcciones[palabraAnterior];
        return {
            ...correccion,
            palabraOriginal: palabraAnterior,
            icono: '✓'
        };
    }
    
    return null;
}

function generarPredicciones(palabras, contexto) {
    const ultimasPalabras = palabras.slice(-3).join(' ').toLowerCase();
    const predicciones = [];
    
    // Predicciones basadas en contexto
    if (contexto !== 'general' && AGENTE_DATA.predicciones_contextuales[contexto]) {
        const prediccionesContexto = AGENTE_DATA.predicciones_contextuales[contexto];
        predicciones.push(...prediccionesContexto.map(p => ({
            ...p,
            icono: '→'
        })));
    }
    
    // Predicciones específicas según el texto
    if (ultimasPalabras.includes('muy')) {
        predicciones.push(
            { texto: 'bueno', confianza: 0.78, tipo: 'predicción', icono: '→' },
            { texto: 'interesante', confianza: 0.71, tipo: 'predicción', icono: '→' }
        );
    }
    
    if (ultimasPalabras.includes('película estuvo')) {
        predicciones.push(
            { texto: 'chévere', confianza: 0.85, tipo: 'predicción', icono: '🇨🇴' },
            { texto: 'bacana', confianza: 0.79, tipo: 'predicción', icono: '🇨🇴' }
        );
    }
    
    return predicciones.slice(0, 3); // Máximo 3 predicciones
}

function sugerirColombianismos(palabras, contexto) {
    if (contexto === 'formal' || contexto === 'academico') {
        return []; // No sugerir colombianismos en contextos formales
    }
    
    const ultimasPalabras = palabras.slice(-2).join(' ').toLowerCase();
    const colombianismos = [];
    
    // Sugerencias específicas
    if (ultimasPalabras.includes('hola')) {
        colombianismos.push({
            texto: 'parce',
            confianza: 0.73,
            tipo: 'colombianismo',
            icono: '🇨🇴'
        });
    }
    
    if (ultimasPalabras.includes('muy') && contexto === 'informal') {
        AGENTE_DATA.colombianismos.informal.slice(0, 2).forEach(palabra => {
            colombianismos.push({
                texto: palabra,
                confianza: 0.70 + Math.random() * 0.15,
                tipo: 'colombianismo',
                icono: '🇨🇴'
            });
        });
    }
    
    return colombianismos;
}

function mostrarSugerencias(sugerencias) {
    if (!sugerencias || sugerencias.length === 0) {
        limpiarSugerencias();
        return;
    }
    
    // Ordenar por confianza
    sugerencias.sort((a, b) => b.confianza - a.confianza);
    
    const html = sugerencias.map(sugerencia => crearElementoSugerencia(sugerencia)).join('');
    elementos.listaSugerencias.innerHTML = html;
    
    // Agregar event listeners a las sugerencias
    elementos.listaSugerencias.querySelectorAll('.suggestion-item').forEach((item, index) => {
        item.addEventListener('click', () => aplicarSugerencia(sugerencias[index]));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                aplicarSugerencia(sugerencias[index]);
            }
        });
        item.setAttribute('tabindex', '0');
    });
}

function crearElementoSugerencia(sugerencia) {
    const porcentajeConfianza = Math.round(sugerencia.confianza * 100);
    const tipoClase = `suggestion-item__icon--${sugerencia.tipo === 'corrección' ? 'correction' : 
                      sugerencia.tipo === 'colombianismo' ? 'colombian' : 'prediction'}`;
    
    return `
        <div class="suggestion-item suggestion-item--new">
            <div class="suggestion-item__content">
                <div class="suggestion-item__text">${sugerencia.texto}</div>
                <div class="suggestion-item__type">${sugerencia.tipo}</div>
            </div>
            <div class="suggestion-item__confidence">
                <div class="suggestion-item__icon ${tipoClase}">${sugerencia.icono}</div>
                <div class="confidence-bar">
                    <div class="confidence-bar__fill" style="width: ${porcentajeConfianza}%"></div>
                </div>
                <small>${porcentajeConfianza}%</small>
            </div>
        </div>
    `;
}

function aplicarSugerencia(sugerencia) {
    const cursorPos = estadoApp.ultimaPosicionCursor;
    const texto = estadoApp.textoActual;
    const palabras = texto.split(/\s+/);
    
    let nuevoTexto;
    
    if (sugerencia.tipo === 'corrección' && sugerencia.palabraOriginal) {
        // Reemplazar la palabra incorrecta
        nuevoTexto = texto.replace(
            new RegExp(`\\b${sugerencia.palabraOriginal}\\b`, 'gi'),
            sugerencia.texto
        );
    } else {
        // Agregar como predicción
        const ultimoEspacio = texto.lastIndexOf(' ');
        if (ultimoEspacio === -1) {
            nuevoTexto = sugerencia.texto + ' ';
        } else {
            nuevoTexto = texto.substring(0, ultimoEspacio + 1) + sugerencia.texto + ' ';
        }
    }
    
    elementos.editor.value = nuevoTexto;
    estadoApp.textoActual = nuevoTexto;
    
    // Actualizar cursor
    const nuevoCursorPos = nuevoTexto.length;
    elementos.editor.setSelectionRange(nuevoCursorPos, nuevoCursorPos);
    elementos.editor.focus();
    
    // Actualizar estadísticas
    estadoApp.estadisticas.sugerenciasAceptadas++;
    actualizarContadorPalabras();
    actualizarUltimaModificacion();
    
    // Limpiar sugerencias y procesar nuevamente
    limpiarSugerencias();
    setTimeout(() => {
        if (estadoApp.autoSugerenciasActivo) {
            procesarTextoParaSugerencias();
        }
    }, 100);
    
    // Mostrar feedback
    mostrarNotificacion(`Sugerencia aplicada: "${sugerencia.texto}"`, 'success');
}

function limpiarSugerencias() {
    elementos.listaSugerencias.innerHTML = `
        <div class="suggestions__empty">
            <div class="suggestions__empty-icon">💡</div>
            <p>Comienza a escribir para ver sugerencias personalizadas</p>
        </div>
    `;
    estadoApp.sugerenciasActivas = [];
}

function obtenerSugerenciasManual() {
    if (!estadoApp.textoActual.trim()) {
        mostrarNotificacion('Escribe algo de texto primero', 'warning');
        return;
    }
    
    mostrarNotificacion('Generando sugerencias...', 'info');
    
    // Simular latencia de API
    setTimeout(() => {
        procesarTextoParaSugerencias();
        mostrarNotificación('Sugerencias actualizadas', 'success');
    }, 200);
}

function limpiarTexto() {
    elementos.editor.value = '';
    estadoApp.textoActual = '';
    estadoApp.ultimaPosicionCursor = 0;
    limpiarSugerencias();
    actualizarContadorPalabras();
    actualizarUltimaModificacion();
    
    // Reiniciar estadísticas
    estadoApp.estadisticas = {
        palabrasEscritas: 0,
        sugerenciasAceptadas: 0,
        tiempoInicio: Date.now()
    };
    
    elementos.editor.focus();
    mostrarNotificacion('Texto limpiado', 'info');
}

function activarModoDemo() {
    const textosDemo = [
        "¡Hola parce! ¿Cómo estas? Espero que todo esté muy bien.",
        "Estimado señor Martinez, nos permitimos informar que el analisis está listo.",
        "La película estuvo muy interesante, realmente quedé sorprendido.",
        "El proyecto de investigacion requiere una metodologia más rigurosa."
    ];
    
    const textoAleatorio = textosDemo[Math.floor(Math.random() * textosDemo.length)];
    elementos.editor.value = textoAleatorio;
    estadoApp.textoActual = textoAleatorio;
    
    actualizarContadorPalabras();
    actualizarUltimaModificacion();
    
    if (estadoApp.autoSugerenciasActivo) {
        procesarTextoParaSugerencias();
    }
    
    mostrarNotificacion('Modo demo activado - Texto de ejemplo cargado', 'success');
}

function cargarCasoDemo(casoElement) {
    const texto = casoElement.dataset.texto;
    const contexto = casoElement.dataset.contexto;
    
    elementos.editor.value = texto;
    elementos.contextoSelect.value = contexto;
    estadoApp.textoActual = texto;
    estadoApp.contextoActual = contexto;
    
    actualizarContadorPalabras();
    actualizarUltimaModificacion();
    
    // Procesar sugerencias después de un breve delay
    setTimeout(() => {
        if (estadoApp.autoSugerenciasActivo) {
            procesarTextoParaSugerencias();
        }
    }, 300);
    
    elementos.editor.focus();
    mostrarNotificacion(`Caso demo cargado: ${contexto}`, 'success');
}

function actualizarContadorPalabras() {
    const palabras = estadoApp.textoActual.trim().split(/\s+/).filter(p => p.length > 0);
    estadoApp.estadisticas.palabrasEscritas = palabras.length;
    elementos.contadorPalabras.textContent = `${palabras.length} palabras`;
}

function actualizarUltimaModificacion() {
    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    elementos.ultimaActualizacion.textContent = `Última actualización: ${tiempo}`;
}

function inicializarMetricas() {
    actualizarMetricas(estadoApp.metricas);
}

function actualizarMetricas(metricas) {
    // Formatear métricas con precisión apropiada
    elementos.metricas.precision.textContent = `${Math.round(metricas.precision * 10) / 10}%`;
    elementos.metricas.latencia.textContent = `${Math.round(metricas.latencia)}ms`;
    elementos.metricas.kss.textContent = `${Math.round(metricas.kss * 10) / 10}%`;
    elementos.metricas.aceptacion.textContent = `${Math.round(metricas.acceptance * 10) / 10}%`;
    
    // Actualizar barras de progreso
    const precision = Math.round(metricas.precision);
    const latencia = Math.max(20, 100 - (metricas.latencia / 10));
    const kss = Math.round(metricas.kss);
    const acceptance = Math.round(metricas.acceptance);
    
    document.querySelector('.metric-card:nth-child(1) .progress-bar__fill').style.width = `${precision}%`;
    document.querySelector('.metric-card:nth-child(2) .progress-bar__fill').style.width = `${latencia}%`;
    document.querySelector('.metric-card:nth-child(3) .progress-bar__fill').style.width = `${kss}%`;
    document.querySelector('.metric-card:nth-child(4) .progress-bar__fill').style.width = `${acceptance}%`;
}

function actualizarMetricasEnTiempoReal() {
    // Simular variaciones realistas en las métricas con redondeo apropiado
    const variacion = () => -2 + Math.random() * 4; // -2 a +2
    
    const nuevasMetricas = {
        precision: Math.max(75, Math.min(95, estadoApp.metricas.precision + variacion())),
        latencia: Math.max(100, Math.min(200, estadoApp.metricas.latencia + variacion() * 5)),
        kss: Math.max(30, Math.min(50, estadoApp.metricas.kss + variacion())),
        acceptance: Math.max(70, Math.min(90, estadoApp.metricas.acceptance + variacion()))
    };
    
    // Calcular KSS basado en sugerencias aceptadas
    if (estadoApp.estadisticas.palabrasEscritas > 0) {
        const tasaAceptacion = estadoApp.estadisticas.sugerenciasAceptadas / estadoApp.estadisticas.palabrasEscritas;
        nuevasMetricas.kss = Math.round(tasaAceptacion * 100 * 10) / 10; // Redondear a 1 decimal
    }
    
    // Redondear todas las métricas para evitar decimales excesivos
    nuevasMetricas.precision = Math.round(nuevasMetricas.precision * 10) / 10;
    nuevasMetricas.latencia = Math.round(nuevasMetricas.latencia);
    nuevasMetricas.kss = Math.round(nuevasMetricas.kss * 10) / 10;
    nuevasMetricas.acceptance = Math.round(nuevasMetricas.acceptance * 10) / 10;
    
    estadoApp.metricas = nuevasMetricas;
    actualizarMetricas(nuevasMetricas);
}

function mostrarMensajeBienvenida() {
    setTimeout(() => {
        mostrarNotificacion('¡Bienvenido al Agente de Texto Predictivo! Comienza a escribir o prueba los casos demo.', 'info');
    }, 1000);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification--${tipo}`;
    notificacion.innerHTML = `
        <div class="notification__content">
            <span class="notification__icon">${getIconoNotificacion(tipo)}</span>
            <span class="notification__message">${mensaje}</span>
        </div>
        <button class="notification__close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Estilos para la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-base);
        padding: var(--space-12) var(--space-16);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notificacion);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        if (notificacion.parentElement) {
            notificacion.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notificacion.remove(), 300);
        }
    }, 4000);
}

function getIconoNotificacion(tipo) {
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return iconos[tipo] || 'ℹ️';
}

// Función debounce para optimizar rendimiento
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Agregar estilos CSS para las notificaciones
const estilosNotificacion = document.createElement('style');
estilosNotificacion.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification__content {
        display: flex;
        align-items: center;
        gap: var(--space-8);
    }
    
    .notification__close {
        background: none;
        border: none;
        font-size: var(--font-size-lg);
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 0;
        margin-left: var(--space-8);
    }
    
    .notification__close:hover {
        color: var(--color-text);
    }
`;
document.head.appendChild(estilosNotificacion);