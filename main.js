// Chart.js se carga globalmente desde el CDN en index.html

const state = {
    estudiantes_matriculados: [],
    docentes: [],
    precios: [],
    loaded: false
};

function parseSplitData(json) {
    if (!json || !json.data || !json.columns) return [];
    return json.data.map(row => {
        let obj = {};
        json.columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

async function loadData() {
    try {
        const [matriculadosRes, docentesRes, preciosRes] = await Promise.all([
            fetch('./data/estudiantes_matriculados.json').catch(() => ({ json: () => null })),
            fetch('./data/docentes.json').catch(() => ({ json: () => null })),
            fetch('./data/precios_2026.json').catch(() => ({ json: () => null }))
        ]);

        state.estudiantes_matriculados = parseSplitData(await matriculadosRes.json());
        state.docentes = parseSplitData(await docentesRes.json());
        state.precios = parseSplitData(await preciosRes.json());
        
        state.loaded = true;
        renderView('dashboard');
    } catch (e) {
        console.error("Error cargando datos", e);
        document.getElementById('app-container').innerHTML = `<p style="color:red">Error cargando los datos. Asegúrate de ejecutar los scripts ETL.</p>`;
    }
}

// Navigation
document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        if (state.loaded) {
            renderView(li.dataset.view);
        }
    });
});

document.getElementById('refresh-data').addEventListener('click', () => {
    document.getElementById('app-container').innerHTML = `
        <div class="loader-container">
            <div class="spinner"></div>
            <p>Recargando datos...</p>
        </div>
    `;
    loadData();
});

function renderView(view) {
    const container = document.getElementById('app-container');
    const title = document.getElementById('page-title');
    
    if (view === 'dashboard') {
        title.innerText = 'Panorama General - Ciencia de Datos';
        renderDashboard(container);
    } else if (view === 'glosario') {
        title.innerText = 'Glosario SNIES';
        renderGlosario(container);
    } else {
        container.innerHTML = `<h2>Vista en construcción: ${view}</h2>`;
    }
}

function renderDashboard(container) {
    // Calculos basicos
    const m = state.estudiantes_matriculados || [];
    const totalMatriculados = m.reduce((acc, curr) => acc + (curr.MATRICULADOS_TOTAL || 0), 0);
    const programasUnicos = new Set(m.map(x => x.PROGRAMA_ACADEMICO)).size;
    const universidadesUnicas = new Set(m.map(x => x.IES)).size;
    
    let html = `
        <div class="grid-cards">
            <div class="kpi-card accent">
                <div class="kpi-title"><i class="fa-solid fa-users"></i> Matriculados (Histórico)</div>
                <div class="kpi-value">${totalMatriculados.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title"><i class="fa-solid fa-graduation-cap"></i> Programas SNIES</div>
                <div class="kpi-value">${programasUnicos}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title"><i class="fa-solid fa-building-columns"></i> Universidades</div>
                <div class="kpi-value">${universidadesUnicas}</div>
            </div>
        </div>

        <div class="chart-section">
            <div class="chart-card">
                <h3>Tendencia Anual de Matriculados</h3>
                <div class="chart-container">
                    <canvas id="tendenciaChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h3>Modalidad de Estudio</h3>
                <div class="chart-container">
                    <canvas id="modalidadChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;

    // Aggregations
    const porAno = {};
    const porModalidad = {};
    
    m.forEach(r => {
        const a = r.AÑO || 'N/A';
        const mod = r.METODOLOGIA || 'N/A';
        porAno[a] = (porAno[a] || 0) + (r.MATRICULADOS_TOTAL || 0);
        porModalidad[mod] = (porModalidad[mod] || 0) + (r.MATRICULADOS_TOTAL || 0);
    });

    const anos = Object.keys(porAno).sort();
    const anosData = anos.map(a => porAno[a]);

    new Chart(document.getElementById('tendenciaChart'), {
        type: 'line',
        data: {
            labels: anos,
            datasets: [{
                label: 'Matriculados Totales',
                data: anosData,
                borderColor: '#003865',
                backgroundColor: 'rgba(0, 56, 101, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    const mods = Object.keys(porModalidad);
    const modData = mods.map(m => porModalidad[m]);
    
    new Chart(document.getElementById('modalidadChart'), {
        type: 'doughnut',
        data: {
            labels: mods,
            datasets: [{
                data: modData,
                backgroundColor: ['#E85C0B', '#003865', '#64748b', '#cbd5e1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderGlosario(container) {
    container.innerHTML = `
        <div class="definition-card">
            <h4>Inscritos</h4>
            <p>Solicitudes de personas naturales para el ingreso a un programa académico en una Institución de Educación Superior, en calidad de estudiante.</p>
        </div>
        <div class="definition-card">
            <h4>Admitidos</h4>
            <p>Persona natural, que ha cumplido con los requisitos de ley y con el proceso de selección de la IES y es aceptado en calidad de estudiante en un programa académico.</p>
        </div>
        <div class="definition-card">
            <h4>Matriculados en Primer Curso</h4>
            <p>Persona natural que formaliza su matrícula en primer curso en el programa académico en la Institución que fue admitido.</p>
        </div>
        <div class="definition-card">
            <h4>Matriculados</h4>
            <p>Estudiantes de todas las cohorte en todos los programas académicos en educación Superior.</p>
        </div>
        <div class="definition-card">
            <h4>Graduados</h4>
            <p>Número total de los graduados del sistema de educación superior colombiano. Se puede analizar por nivel de formación, sector, sexo, metodología, departamento, área y Núcleo Básico de Conocimiento.</p>
        </div>
        <div class="definition-card">
            <h4>Docentes</h4>
            <p>Persona natural que orienta el proceso de formación, enseñanza y aprendizaje de los estudiantes de educación superior, acorde con el proyecto educativo institucional.</p>
        </div>
        <div class="definition-card">
            <h4>Administrativos</h4>
            <p>Representa a todas aquellas personas diferentes a los docentes, salvo aquellos que dentro de sus funciones también desarrollen actividades administrativas, que soportan las actividades organizacionales relacionadas con la prestación del servicio público educativo en las instituciones de educación superior.</p>
        </div>
    `;
}

// Inicializar
loadData();
