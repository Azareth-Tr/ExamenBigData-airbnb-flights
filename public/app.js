const queries = {
    reviews: [
        ['precio-medio-propiedad', 'Precio por propiedad', 'Compara el precio medio por tipo de alojamiento.'],
        ['anuncios-mas-comodidades', 'Comodidades y calidad', 'Alojamientos con más de 5 comodidades y calificación desde 90.'],
        ['mejores-revisores', 'Mejores revisores', 'Los 5 revisores con mayor cantidad de reseñas.'],
        ['anuncios-great-location', 'Great Location', 'Reseñas que destacan la ubicación del alojamiento.']
    ],
    flights: [
        ['aeropuertos-origen', 'Orígenes hacia Alemania', 'Los 3 orígenes con más pasajeros reservados.'],
        ['desempeno-mensual', 'Desempeño mensual', 'Vuelos, pasajeros e ingresos por aerolínea y mes.'],
        ['rutas-mas-rentables', 'Rutas más rentables', 'Las 50 rutas con más ingresos y más de 70 vuelos.'],
        ['clasificacion-aerolineas', 'Top de aerolíneas', 'Las 5 aerolíneas con más ingresos por mes y año.']
    ]
};
const $ = id => document.getElementById(id);
let apiPrefix;
let session = null;
let currentGroup = 'reviews';
let currentQuery = null;
let controller = null;
let expiryTimer;

function message(id, text) {
    $(id).textContent = text;
    $(id).hidden = !text;
}
function setSession(value) {
    session = value;
    clearTimeout(expiryTimer);
    if (value) {
        // Se guarda sólo en esta pestaña. Nunca se guarda la contraseña.
        sessionStorage.setItem('atlas-session', JSON.stringify(value));
        expiryTimer = setTimeout(() => logout('Tu sesión expiró. Inicia sesión nuevamente.'), Math.min(value.expiresAt - Date.now(), 2147483647));
    } else {
        sessionStorage.removeItem('atlas-session');
    }
    $('login-view').hidden = Boolean(value);
    $('dashboard-view').hidden = !value;
    $('user-email').textContent = value?.user || '';
}
function tokenExpiry(token) {
    // Sólo para el reloj de la interfaz; el servidor siempre valida la firma.
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp * 1000;
}
function logout(reason = '') {
    controller?.abort();
    controller = null;
    setSession(null);
    currentQuery = null;
    $('table-container').hidden = true;
    $('table-head').replaceChildren();
    $('table-body').replaceChildren();
    $('result-title').textContent = 'Resultados';
    $('result-description').textContent = 'Elige una consulta para comenzar.';
    message('result-status', 'Los resultados aparecerán aquí.');
    $('refresh-button').hidden = true;
    $('password').value = '';
    message('login-error', reason);
    renderCards();
    $('email').focus();
}
async function request(path, options = {}) {
    const response = await fetch(`${apiPrefix}${path}`, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    if (!response.ok) {
        const error = new Error(data?.error || 'No se pudo completar la consulta.');
        error.status = response.status;
        throw error;
    }
    return data;
}
function renderCards() {
    for (const group of ['reviews', 'flights']) {
        const selected = group === currentGroup;
        $(`${group}-tab`).setAttribute('aria-pressed', String(selected));
        $(`${group}-tab`).className = `rounded-lg px-5 py-2 font-semibold ${selected ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`;
    }
    $('query-cards').replaceChildren();
    for (const query of queries[currentGroup]) {
        const selected = currentQuery?.[0] === query[0];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `text-left p-5 rounded-xl border transition-colors ${selected ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-500'}`;
        button.setAttribute('aria-pressed', String(selected));
        const title = document.createElement('h3');
        title.className = 'font-semibold mb-2';
        title.textContent = query[1];
        const description = document.createElement('p');
        description.className = 'text-sm text-slate-500 leading-relaxed';
        description.textContent = query[2];
        button.append(title, description);
        button.addEventListener('click', () => loadQuery(query));
        $('query-cards').append(button);
    }
}
const labels = {
    property_type: 'Tipo de propiedad', avg_price: 'Precio medio', listings: 'Alojamientos',
    name: 'Alojamiento', amenities: 'Comodidades', review_scores_rating: 'Calificación',
    reviewer_name: 'Revisor', total_reviews: 'Reseñas', comments: 'Comentario',
    pais_origen: 'País de origen', aeropuerto_origen: 'Aeropuerto de origen',
    total_visitantes: 'Pasajeros reservados', total_vuelos: 'Vuelos',
    departure_year: 'Año', departure_month: 'Mes', airlinename: 'Aerolínea',
    total_flights: 'Vuelos', total_passengers: 'Pasajeros', total_earns: 'Ingresos',
    average_load_factor: 'Ocupación media (%)', origin_airport: 'Aeropuerto de origen',
    destination_airport: 'Aeropuerto de destino', avg_earns: 'Ingreso medio',
    airline: 'Aerolínea', month: 'Mes', year: 'Año', position: 'Posición'
};
function format(value) {
    if (value == null) return '—';
    if (Array.isArray(value)) return value.map(format).join(', ');
    if (typeof value === 'object') {
        if ('$numberDecimal' in value) return value.$numberDecimal;
        return JSON.stringify(value);
    }
    if (typeof value === 'number') return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);
    return String(value);
}
function renderTable(rows) {
    $('table-head').replaceChildren();
    $('table-body').replaceChildren();
    if (!rows.length) {
        message('result-status', 'No hay resultados para esta consulta.');
        return;
    }
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(key => key !== '_id');
    const header = document.createElement('tr');
    for (const key of columns) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = labels[key] || key;
        header.append(th);
    }
    $('table-head').append(header);
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        for (const key of columns) {
            const td = document.createElement('td');
            td.textContent = format(row[key]); // Evitar interpretar reseñas como HTML.
            tr.append(td);
        }
        fragment.append(tr);
    }
    $('table-body').append(fragment);
    $('table-container').hidden = false;
    message('result-status', '');
}
async function loadQuery(query) {
    if (!session) return;
    if (session.expiresAt <= Date.now()) return logout('Tu sesión expiró. Inicia sesión nuevamente.');
    controller?.abort();
    const pending = new AbortController();
    controller = pending;
    currentQuery = query;
    renderCards();
    $('result-title').textContent = query[1];
    $('result-description').textContent = query[2];
    $('table-container').hidden = true;
    $('refresh-button').hidden = false;
    $('refresh-button').disabled = true;
    message('result-status', 'Consultando los datos…');
    try {
        const data = await request(`/${currentGroup}/${query[0]}`, {
            headers: { Authorization: `Bearer ${session.token}` }, signal: pending.signal
        });
        if (controller !== pending) return;
        if (!Array.isArray(data)) throw new Error('La consulta devolvió un formato inesperado.');
        $('result-description').textContent = `${data.length} resultado${data.length === 1 ? '' : 's'} · ${query[2]}`;
        renderTable(data);
    } catch (error) {
        if (error.name === 'AbortError' || controller !== pending) return;
        if (error.status === 401) logout('Tu sesión no es válida o expiró. Inicia sesión nuevamente.');
        else message('result-status', error instanceof TypeError ? 'No se pudo conectar con el servidor. Intenta nuevamente.' : error.message);
    } finally {
        if (controller === pending) $('refresh-button').disabled = false;
    }
}
$('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('login-button').disabled = true;
    $('login-button').textContent = 'Iniciando sesión…';
    message('login-error', '');
    try {
        const data = await request('/users/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value })
        });
        const expiresAt = tokenExpiry(data.token);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('El servidor devolvió una sesión inválida.');
        setSession({ token: data.token, user: data.user, expiresAt });
        $('password').value = '';
        renderCards();
    } catch (error) {
        message('login-error', error instanceof TypeError ? 'No se pudo conectar con el servidor.' : error.message);
    } finally {
        $('login-button').disabled = false;
        $('login-button').textContent = 'Iniciar sesión →';
    }
});
$('logout-button').addEventListener('click', () => logout());
$('refresh-button').addEventListener('click', () => currentQuery && loadQuery(currentQuery));
for (const group of ['reviews', 'flights']) {
    $(`${group}-tab`).addEventListener('click', () => {
        controller?.abort();
        controller = null;
        currentGroup = group;
        currentQuery = null;
        $('table-container').hidden = true;
        $('refresh-button').hidden = true;
        $('result-title').textContent = 'Resultados';
        $('result-description').textContent = 'Elige una consulta para comenzar.';
        message('result-status', 'Los resultados aparecerán aquí.');
        renderCards();
    });
}
async function init() {
    try {
        const response = await fetch('/config.json');
        if (!response.ok) throw new Error();
        const config = await response.json();
        apiPrefix = config.apiPrefix;
        if (typeof apiPrefix !== 'string' || !apiPrefix.startsWith('/')) throw new Error();
        try {
            const saved = JSON.parse(sessionStorage.getItem('atlas-session'));
            if (saved?.token && tokenExpiry(saved.token) > Date.now()) {
                setSession({ ...saved, expiresAt: tokenExpiry(saved.token) });
            } else setSession(null);
        } catch { setSession(null); }
        renderCards();
        $('login-button').disabled = false;
        $('login-button').textContent = 'Iniciar sesión →';
    } catch {
        message('login-error', 'No se pudo cargar la configuración. Abre esta página desde el servidor y recarga.');
        $('login-button').textContent = 'Conexión no disponible';
    }
}
init();
