document.getElementById('current-year').textContent = new Date().getFullYear();

const state = {
    estudiantes_matriculados: [],
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

// Global UI State that existed in original script
let datosGlobales = [];
let filtrosCruzados = {};
let geojsonData = null;

const coordsDeptos = {
    "bogota": { lat: 4.6097, lon: -74.0817 }, "antioquia": { lat: 6.2518, lon: -75.5636 },
    "valle del cauca": { lat: 3.4516, lon: -76.5320 }, "atlantico": { lat: 10.9685, lon: -74.7813 },
    "bolivar": { lat: 10.3910, lon: -75.4794 }, "santander": { lat: 7.1193, lon: -73.1227 },
    "norte de santander": { lat: 7.8939, lon: -72.5078 }, "cundinamarca": { lat: 4.6678, lon: -74.0820 },
    "boyaca": { lat: 5.5353, lon: -73.3678 }, "tolima": { lat: 4.4389, lon: -75.2322 },
    "huila": { lat: 2.9273, lon: -75.2819 }, "cauca": { lat: 2.4382, lon: -76.6132 },
    "narino": { lat: 1.2136, lon: -77.2811 }, "magdalena": { lat: 11.2408, lon: -74.1990 },
    "cesar": { lat: 10.4631, lon: -73.2532 }, "cordoba": { lat: 8.7480, lon: -75.8814 },
    "sucre": { lat: 9.3047, lon: -75.3978 }, "caldas": { lat: 5.0689, lon: -75.5174 },
    "risaralda": { lat: 4.8133, lon: -75.6961 }, "quindio": { lat: 4.5339, lon: -75.6811 },
    "meta": { lat: 4.1420, lon: -73.6266 }, "choco": { lat: 5.6919, lon: -76.6583 },
    "la guajira": { lat: 11.5444, lon: -72.9069 }, "putumayo": { lat: 1.1511, lon: -76.6531 },
    "caqueta": { lat: 1.6135, lon: -75.6040 }, "casanare": { lat: 5.3378, lon: -72.3959 },
    "arauca": { lat: 7.0847, lon: -70.7591 }, "san andres": { lat: 12.5847, lon: -81.7006 }
};

const coloresVisuales = {
    SEXO: { 'Hombres': '#3b82f6', 'Mujeres': '#ec4899' },
    METOD: { 'Presencial': '#10b981', 'Virtual/Dist.': '#8b5cf6', 'Distancia (virtual)': '#8b5cf6' },
    SEMESTRE: { '1': '#8b5cf6', '2': '#f59e0b', '3': '#14b8a6', '4': '#06b6d4', '5': '#ef4444', '6': '#eab308' },
    SECTOR: { 'OFICIAL': '#0ea5e9', 'PRIVADA': '#f43f5e', 'PÚBLICA': '#0ea5e9', 'OFICIAL ESPECIAL': '#6366f1' },
    NIVEL: { 
        'Universitaria': '#6366f1', 
        'Especialización': '#a5b4fc', 
        'Maestría': '#818cf8', 
        'Doctorado': '#c7d2fe',
        'Tecnológica': '#4f46e5',
        'Técnica Profesional': '#3730a3',
        'Especialización Médico Quirúrgica': '#8b5cf6'
    }
};
const coloresFallback = ['#8b5cf6', '#f59e0b', '#14b8a6', '#06b6d4', '#f43f5e', '#3b82f6', '#10b981'];

function normDepto(n) {
    if (!n) return '';
    let str = n.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
    if (str.includes("BOGOTA")) return "BOGOTA";
    if (str.includes("VALLE")) return "VALLE DEL CAUCA";
    if (str.includes("ANDRES") || str.includes("PROVIDENCIA")) return "SAN ANDRES";
    if (str.includes("NARI")) return "NARINO";
    if (str.includes("GUAJIRA")) return "LA GUAJIRA";
    return str;
}

window.onload = async function () {
    // Inicialización segura de VirtualSelect
    VirtualSelect.init({
        ele: '.filtro-multiselect',
        multiple: true,
        search: true,
        placeholder: 'Todos',
        selectAllText: 'Seleccionar Todos',
        searchPlaceholderText: 'Buscar...',
        optionsSelectedText: 'selec.',
        allOptionsSelectedText: 'Todos',
        noOptionsText: 'Sin datos...',
        noSearchResultsText: 'No hay resultados',
        clearButtonText: 'Limpiar',
        hideClearButton: false,
        position: 'bottom left',
        dropboxWrapper: 'body', 
        zIndex: 99999,
        showSelectedOptionsFirst: true
    });

    document.querySelectorAll('.filtro-multiselect').forEach(el => {
        el.addEventListener('change', () => {
            if (!window.isUpdatingFilters) aplicarFiltros();
        });
    });

    try {
        const geoRes = await fetch('https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json');
        geojsonData = await geoRes.json();
    } catch (e) { console.warn("Fallo carga de GeoJSON de Colombia."); }

    // Ya no usamos dataset selector real, forzamos la carga del unico json
    const selector = document.getElementById('selector-dataset');
    if(selector) {
        let opcion = document.createElement('option');
        opcion.value = 0; opcion.text = "Ciencia de Datos e IA (JSON)"; selector.appendChild(opcion);
    }

    // Load data from JSON instead of Excel
    cambiarDataset(0);

    window.addEventListener('resize', () => {
        redimensionarGraficos();
    });
};

function redimensionarGraficos() {
    const charts = ['mapa-colombia', 'grafico-evolucion', 'grafico-instituciones', 'grafico-programas', 'grafico-municipios', 'grafico-departamentos', 'grafico-sector', 'grafico-nivel', 'grafico-metodologia', 'grafico-sexo', 'grafico-semestre', 'grafico-parcats'];
    charts.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.data) {
            Plotly.Plots.resize(el);
        }
    });
}

async function cambiarDataset(indice) {
    document.getElementById('dashboard-content').classList.remove('opacity-100');
    document.getElementById('dashboard-content').classList.add('opacity-0');
    document.getElementById('indicador-carga').innerHTML = `⏳ Conectando Datamart...`;

    filtrosCruzados = {};
    document.getElementById('indicador-filtros-graficos').classList.add('hidden');
    
    ['año', 'semestre', 'depto', 'ies', 'programa', 'sexo', 'nivel', 'sector'].forEach(id => {
        const el = document.getElementById(`filtro-${id}`);
        if (el && typeof el.setValue === 'function') el.setValue([], true);
    });

    try {
        const [matriculadosRes, preciosRes] = await Promise.all([
            fetch('./public/data/estudiantes_matriculados.json').catch(() => ({ json: () => null })),
            fetch('./public/data/precios_2026.json').catch(() => ({ json: () => null }))
        ]);

        let mJson = await matriculadosRes.json();
        let pJson = await preciosRes.json();
        
        state.estudiantes_matriculados = parseSplitData(mJson);
        state.precios = pJson;

        // Hacemos el Join
        const preciosMap = {};
        state.precios.forEach(p => {
            if(p.IES && p.Precio) {
                preciosMap[p.IES.trim().toUpperCase()] = p.Precio;
            }
        });

        // Parse data in the shape SNIES_Analytics expects
        datosGlobales = state.estudiantes_matriculados.map(f => {
            let sexoRaw = f.SEXO ? String(f.SEXO).trim() : 'Sin dato';
            let strSexo = sexoRaw.toUpperCase();
            let sexoLimpio = (strSexo.includes('MASC') || strSexo === 'HOMBRE' || strSexo === 'M') ? 'Hombres' : 
                             (strSexo.includes('FEM') || strSexo === 'MUJER' || strSexo === 'F') ? 'Mujeres' : sexoRaw;

            let metodRaw = f.METODOLOGIA ? String(f.METODOLOGIA).trim() : 'Sin dato';
            let metodLimpia = metodRaw.toUpperCase().includes('PRESENCIAL') ? 'Presencial' : 'Virtual/Dist.';
            
            let programaTrim = f.PROGRAMA_ACADEMICO ? String(f.PROGRAMA_ACADEMICO).trim() : 'Sin dato';
            
            let precioEncontrado = preciosMap[f.IES ? String(f.IES).trim().toUpperCase() : ""] || 0;

            return {
                programa: programaTrim,
                año: f.AÑO ? String(f.AÑO).trim() : 'Sin dato',
                semestre: f.SEMESTRE ? String(f.SEMESTRE).trim() : 'Sin dato',
                nivel: f.NIVEL_ACADEMICO ? String(f.NIVEL_ACADEMICO).trim() : 'Sin dato',
                depto: f.DEPARTAMENTO_IES ? String(f.DEPARTAMENTO_IES).trim() : 'Sin dato',
                ies: f.IES ? String(f.IES).trim() : 'Sin dato',
                sector: f.SECTOR ? String(f.SECTOR).trim().toUpperCase() : 'Sin dato',
                municipio: f.MUNICIPIO_IES ? String(f.MUNICIPIO_IES).trim() : 'Sin dato',
                sexo: sexoLimpio,
                metodologia: metodLimpia,
                matriculados: f.MATRICULADOS_TOTAL ? parseInt(f.MATRICULADOS_TOTAL) : 0,
                precio: precioEncontrado,
                url: ''
            };
        });

        document.getElementById('indicador-carga').innerHTML = `✅ Datos listos`;
        document.getElementById('dashboard-content').classList.remove('opacity-0');
        document.getElementById('dashboard-content').classList.add('opacity-100');

        aplicarFiltros();
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 600);
        
    } catch (error) { 
        console.error(error);
        alert("Error de red cargando JSON."); 
    }
}

function toggleFiltroCruzado(tipo, valor, isMulti) {
            if (!filtrosCruzados[tipo]) filtrosCruzados[tipo] = [];
            const index = filtrosCruzados[tipo].indexOf(valor);

            if (isMulti) {
                if (index > -1) filtrosCruzados[tipo].splice(index, 1);
                else filtrosCruzados[tipo].push(valor);
            } else {
                if (index > -1 && filtrosCruzados[tipo].length === 1) filtrosCruzados[tipo] = [];
                else filtrosCruzados[tipo] = [valor];
            }
            if (filtrosCruzados[tipo].length === 0) delete filtrosCruzados[tipo];
            aplicarFiltros();
        }

        function limpiarFiltrosCruzados() { filtrosCruzados = {}; aplicarFiltros(); }

        function aplicarFiltros() {
            if (window.isUpdatingFilters) return;
            window.isUpdatingFilters = true;

            try {
                const getFiltroVal = (id) => {
                    const el = document.getElementById(id);
                    if (!el) return 'TODOS';
                    let val = el.value;
                    if (val === undefined || val === null || val === '') return 'TODOS';
                    if (Array.isArray(val) && val.length === 0) return 'TODOS';
                    return val;
                };

                const f = {
                    año: getFiltroVal('filtro-año'),
                    semestre: getFiltroVal('filtro-semestre'),
                    depto: getFiltroVal('filtro-depto'),
                    ies: getFiltroVal('filtro-ies'),
                    programa: getFiltroVal('filtro-programa'),
                    sexo: getFiltroVal('filtro-sexo'),
                    nivel: getFiltroVal('filtro-nivel'),
                    sector: getFiltroVal('filtro-sector')
                };

                const tipos = ['año', 'semestre', 'depto', 'ies', 'programa', 'sexo', 'nivel', 'sector'];
                tipos.forEach(tipoActual => {
                    const datosParciales = datosGlobales.filter(d => {
                        let pasa = true;
                        for (let k in f) {
                            if (k !== tipoActual && f[k] !== 'TODOS') {
                                if (Array.isArray(f[k])) {
                                    if (!f[k].includes(d[k])) pasa = false;
                                } else {
                                    if (d[k] !== f[k]) pasa = false;
                                }
                            }
                        }
                        for (let k in filtrosCruzados) {
                            if (k !== tipoActual && filtrosCruzados[k].length > 0 && !filtrosCruzados[k].includes(d[k])) pasa = false;
                        }
                        return pasa;
                    });

                    let unicos = [...new Set(datosParciales.map(d => d[tipoActual]))].filter(o => o !== 'Sin dato').sort();
                    if (tipoActual === 'año' || tipoActual === 'semestre') unicos.reverse();
                    
                    const el = document.getElementById(`filtro-${tipoActual}`);
                    if (el && el.setOptions) {
                        const currentSelected = Array.isArray(f[tipoActual]) ? f[tipoActual] : [];
                        const formatOptions = unicos.map(op => ({ label: String(op), value: String(op) }));
                        
                        el.setOptions(formatOptions);
                        
                        if (formatOptions.length > 0) {
                            if (typeof el.enable === 'function') el.enable();
                            el.classList.remove('vscomp-disabled');
                        } else {
                            if (typeof el.disable === 'function') el.disable();
                        }
                        
                        const validSelected = currentSelected.filter(v => unicos.includes(v));
                        if (validSelected.length !== currentSelected.length) {
                            f[tipoActual] = validSelected.length > 0 ? validSelected : 'TODOS';
                        }
                        
                        if (validSelected.length > 0) {
                            el.setValue(validSelected, true); 
                        } else {
                            el.setValue([], true); 
                        }
                    }
                });

                const datosFiltrados = datosGlobales.filter(d => {
                    let pasa = true;
                    for (let k in f) {
                        if (f[k] !== 'TODOS') {
                            if (Array.isArray(f[k])) {
                                if (!f[k].includes(d[k])) pasa = false;
                            } else {
                                if (d[k] !== f[k]) pasa = false;
                            }
                        }
                    }
                    for (let k in filtrosCruzados) {
                        if (filtrosCruzados[k].length > 0 && !filtrosCruzados[k].includes(d[k])) pasa = false;
                    }
                    return pasa;
                });

                let activosHTML = [];
                Object.entries(filtrosCruzados).forEach(([k, valores]) => {
                    if (valores.length > 0) {
                        let txt = valores.length <= 2 ? valores.join(', ') : `${valores.length} selec.`;
                        activosHTML.push(`<span class="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-medium shadow-sm text-[0.7rem]">${k.toUpperCase()}: ${txt}</span>`);
                    }
                });

                const divFiltros = document.getElementById('indicador-filtros-graficos');
                if (activosHTML.length) { document.getElementById('texto-filtros-graficos').innerHTML = activosHTML.join(''); divFiltros.classList.remove('hidden'); }
                else divFiltros.classList.add('hidden');

                dibujarDashboard(datosFiltrados);
                
            } catch(e) {
                console.error("Error aplicando filtros:", e);
            } finally {
                setTimeout(() => { window.isUpdatingFilters = false; }, 50);
            }
        }

        function bindPlotlyClick(id, tipoFiltro, extractFn) {
            const div = document.getElementById(id);
            if (div.removeAllListeners) div.removeAllListeners('plotly_click');
            div.on('plotly_click', d => {
                const v = extractFn(d);
                if (v) toggleFiltroCruzado(tipoFiltro, v, d.event.ctrlKey || d.event.shiftKey || d.event.metaKey);
            });
        }

        function crearTracesApilados(objetoDetalle, topKeys, variableCruce) {
            let subkeys = new Set();
            topKeys.forEach(k => {
                if (objetoDetalle[k] && objetoDetalle[k][variableCruce]) {
                    Object.keys(objetoDetalle[k][variableCruce]).forEach(sk => subkeys.add(sk));
                }
            });

            let traces = [];
            let paleta = coloresVisuales[variableCruce.toUpperCase()] || {};
            let isMobile = window.innerWidth < 768;
            const truncar = str => isMobile && str.length > 25 ? str.substring(0, 23) + '...' : str;

            Array.from(subkeys).sort().forEach((sk, idx) => {
                let xVals = topKeys.map(k => (objetoDetalle[k] && objetoDetalle[k][variableCruce][sk]) ? objetoDetalle[k][variableCruce][sk] : 0);
                let color = paleta[sk] || coloresFallback[idx % coloresFallback.length];
                traces.push({
                    y: topKeys.map(truncar),
                    customdata: topKeys,
                    x: xVals,
                    name: sk,
                    type: 'bar',
                    orientation: 'h',
                    marker: { color: color, line: { width: 0.5, color: 'white' } },
                    text: xVals.map(v => v > 0 ? v.toLocaleString() : ''),
                    textposition: 'inside',
                    insidetextanchor: 'middle',
                    textfont: { family: "'Inter', sans-serif" },
                    hoverinfo: 'name+x+text'
                });
            });
            return traces;
        }

        function dibujarDashboard(datos) {
            let tMatriculados = 0, hombres = 0, mujeres = 0, sumPrecio = 0, countPrecio = 0;
            let agg = { depto: {}, prog: {}, ies: {}, año: {}, semestre: {}, nivel: {}, sexo: {}, metod: {}, municipio: {}, sector: {} };

            let aggMap = {};
            let parcatsAgg = {};
            let datosTabla = {};

            let aggEvolDetalle = {};
            let aggIesDetalle = {};
            let aggProgDetalle = {};
            let aggMuniDetalle = {};
            let aggDeptoDetalle = {};

            datos.forEach(d => {
                tMatriculados += d.matriculados;

                let valSexo = d.sexo;
                let valMetod = d.metodologia;
                let valSem = d.semestre;

                if (valSexo === 'Hombres') hombres += d.matriculados;
                if (valSexo === 'Mujeres') mujeres += d.matriculados;
                let esPresencial = valMetod === 'Presencial';

                if (d.precio > 0 && !isNaN(d.precio)) { sumPrecio += d.precio; countPrecio++; }

                ['depto', 'programa', 'ies', 'año', 'semestre', 'nivel', 'sexo', 'metodologia', 'municipio', 'sector'].forEach(k => {
                    const prop = k === 'programa' ? 'prog' : k === 'metodologia' ? 'metod' : k;
                    agg[prop][d[k]] = (agg[prop][d[k]] || 0) + d.matriculados;
                });

                if (!aggEvolDetalle[d.año]) aggEvolDetalle[d.año] = { total: 0, sexo: {}, metod: {}, semestre: {}, depto: {}, nivel: {} };
                aggEvolDetalle[d.año].total += d.matriculados;
                aggEvolDetalle[d.año].sexo[valSexo] = (aggEvolDetalle[d.año].sexo[valSexo] || 0) + d.matriculados;
                aggEvolDetalle[d.año].metod[valMetod] = (aggEvolDetalle[d.año].metod[valMetod] || 0) + d.matriculados;
                aggEvolDetalle[d.año].semestre[valSem] = (aggEvolDetalle[d.año].semestre[valSem] || 0) + d.matriculados;
                aggEvolDetalle[d.año].depto[d.depto] = (aggEvolDetalle[d.año].depto[d.depto] || 0) + d.matriculados;
                aggEvolDetalle[d.año].nivel[d.nivel] = (aggEvolDetalle[d.año].nivel[d.nivel] || 0) + d.matriculados;

                if (!aggIesDetalle[d.ies]) aggIesDetalle[d.ies] = { total: 0, sexo: {}, metod: {}, semestre: {} };
                aggIesDetalle[d.ies].total += d.matriculados;
                aggIesDetalle[d.ies].sexo[valSexo] = (aggIesDetalle[d.ies].sexo[valSexo] || 0) + d.matriculados;
                aggIesDetalle[d.ies].metod[valMetod] = (aggIesDetalle[d.ies].metod[valMetod] || 0) + d.matriculados;
                aggIesDetalle[d.ies].semestre[valSem] = (aggIesDetalle[d.ies].semestre[valSem] || 0) + d.matriculados;

                if (!aggProgDetalle[d.programa]) aggProgDetalle[d.programa] = { total: 0, sexo: {}, metod: {}, semestre: {} };
                aggProgDetalle[d.programa].total += d.matriculados;
                aggProgDetalle[d.programa].sexo[valSexo] = (aggProgDetalle[d.programa].sexo[valSexo] || 0) + d.matriculados;
                aggProgDetalle[d.programa].metod[valMetod] = (aggProgDetalle[d.programa].metod[valMetod] || 0) + d.matriculados;
                aggProgDetalle[d.programa].semestre[valSem] = (aggProgDetalle[d.programa].semestre[valSem] || 0) + d.matriculados;

                if (!aggMuniDetalle[d.municipio]) aggMuniDetalle[d.municipio] = { total: 0, sexo: {}, metod: {}, semestre: {} };
                aggMuniDetalle[d.municipio].total += d.matriculados;
                aggMuniDetalle[d.municipio].sexo[valSexo] = (aggMuniDetalle[d.municipio].sexo[valSexo] || 0) + d.matriculados;
                aggMuniDetalle[d.municipio].metod[valMetod] = (aggMuniDetalle[d.municipio].metod[valMetod] || 0) + d.matriculados;
                aggMuniDetalle[d.municipio].semestre[valSem] = (aggMuniDetalle[d.municipio].semestre[valSem] || 0) + d.matriculados;

                if (!aggDeptoDetalle[d.depto]) aggDeptoDetalle[d.depto] = { total: 0, sexo: {}, metod: {}, semestre: {} };
                aggDeptoDetalle[d.depto].total += d.matriculados;
                aggDeptoDetalle[d.depto].sexo[valSexo] = (aggDeptoDetalle[d.depto].sexo[valSexo] || 0) + d.matriculados;
                aggDeptoDetalle[d.depto].metod[valMetod] = (aggDeptoDetalle[d.depto].metod[valMetod] || 0) + d.matriculados;
                aggDeptoDetalle[d.depto].semestre[valSem] = (aggDeptoDetalle[d.depto].semestre[valSem] || 0) + d.matriculados;

                if (!aggMap[d.depto]) aggMap[d.depto] = { total: 0, hombres: 0, mujeres: 0, presencial: 0, virtual: 0, sem1: 0, sem2: 0 };
                aggMap[d.depto].total += d.matriculados;
                if (valSexo === 'Hombres') aggMap[d.depto].hombres += d.matriculados;
                if (valSexo === 'Mujeres') aggMap[d.depto].mujeres += d.matriculados;
                if (esPresencial) aggMap[d.depto].presencial += d.matriculados;
                else aggMap[d.depto].virtual += d.matriculados;
                if (valSem === '1') aggMap[d.depto].sem1 += d.matriculados;
                if (valSem === '2') aggMap[d.depto].sem2 += d.matriculados;

                let nLimpio = d.nivel.length > 25 ? d.nivel.substring(0, 22) + '...' : d.nivel;
                let mLimpio = d.metodologia.length > 20 ? d.metodologia.substring(0, 17) + '...' : d.metodologia;
                let sLimpio = d.sexo;
                let pk = `${nLimpio}|${mLimpio}|${sLimpio}`;
                parcatsAgg[pk] = (parcatsAgg[pk] || 0) + d.matriculados;

                let keyTabla = `${d.ies}|${d.programa}|${d.depto}`;
                if (!datosTabla[keyTabla]) datosTabla[keyTabla] = { ies: d.ies, prog: d.programa, depto: d.depto, matr: 0, precio: d.precio, url: d.url };
                datosTabla[keyTabla].matr += d.matriculados;
            });

            document.getElementById('kpi-matriculados').innerText = tMatriculados.toLocaleString('es-CO');
            document.getElementById('kpi-ies').innerText = Object.keys(agg.ies).filter(k => k !== 'Sin dato').length.toLocaleString('es-CO');
            document.getElementById('kpi-paridad').innerText = hombres > 0 ? ((mujeres / hombres) * 100).toFixed(1) : 0;
            let precioPromedio = countPrecio > 0 ? (sumPrecio / countPrecio) : 0;
            document.getElementById('kpi-precio').innerText = precioPromedio > 0 ? `$ ${Math.round(precioPromedio).toLocaleString('es-CO')}` : 'N/D';

            let htmlTabla = Object.values(datosTabla).sort((a, b) => b.matr - a.matr).slice(0, 50).map(row => `
                <tr><td class="font-medium text-[0.75rem] max-w-[150px] truncate" title="${row.ies}">${row.ies}</td><td class="text-[0.75rem] max-w-[150px] truncate" title="${row.prog}">${row.prog}</td><td class="text-[0.75rem]">${row.depto}</td><td class="text-right font-bold text-[0.75rem]">${row.matr.toLocaleString()}</td><td class="text-right text-[0.75rem] text-emerald-600">${row.precio > 0 ? '$' + row.precio.toLocaleString('es-CO') : '-'}</td><td class="text-center">${row.url ? `<a href="${row.url.startsWith('http') ? row.url : 'https://' + row.url}" target="_blank" class="text-blue-600 font-bold text-[0.7rem]">Ver</a>` : '-'}</td></tr>
            `).join('');
            document.getElementById('tabla-detalles').innerHTML = htmlTabla || '<tr><td colspan="6" class="text-center py-4 text-slate-500">No hay datos disponibles para esta selección</td></tr>';

            const isMobile = window.innerWidth < 768;
            
            // --- ACTUALIZACIÓN DE ESTILOS Y TIPOGRAFÍA PARA GRÁFICAS ---
            const fontStyle = { family: "'Inter', sans-serif", color: '#334155', size: isMobile ? 10 : 12 };
            
            // Estilo global mejorado para leyendas (previene el solapamiento y se ve moderno)
            const legendStyle = { 
                orientation: 'h', 
                x: 0.5, 
                y: -0.22, 
                xanchor: 'center',
                yanchor: 'top',
                font: { family: "'Inter', sans-serif", size: isMobile ? 10 : 11, color: '#475569' },
                bgcolor: 'rgba(248, 250, 252, 0.8)', // Fondo muy suave
                bordercolor: '#e2e8f0',
                borderwidth: 1,
                itemwidth: 30 // Obliga a Plotly a respetar espacios para que no se amontonen
            };

            const hoverLabelStyle = {
                bgcolor: '#1e293b',
                font: { family: "'Inter', sans-serif", size: 12, color: '#ffffff' },
                bordercolor: '#1e293b'
            };

            const confGen = { responsive: true, displayModeBar: false };
            
            // Layout con márgenes aumentados abajo (margin.b) para dar respiro a las leyendas
            const layout = {
                margin: { t: 20, b: 70, l: 10, r: 10 }, 
                font: fontStyle,
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', autosize: true,
                xaxis: { showgrid: false, zeroline: false, tickfont: { family: "'Inter', sans-serif", color: '#64748b' } },
                yaxis: { showgrid: true, gridcolor: '#f1f5f9', zeroline: false, automargin: true, tickfont: { family: "'Inter', sans-serif", color: '#64748b' } },
                hoverlabel: hoverLabelStyle
            };

            let limitVal = document.getElementById('filtro-limite').value;
            let numLimit = limitVal === 'ALL' ? 50 : parseInt(limitVal);

            const getTop = (obj, limit) => {
                let sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
                let sliced = sorted.slice(0, limit);
                return sliced.reduce((a, v) => ({ k: [...a.k, v[0]], v: [...a.v, v[1]] }), { k: [], v: [], total: sorted.length });
            };

            // --- 1. MAPA MULTIDIMENSIONAL ---
            let mapMode = document.getElementById('map-mode').value;
            const mapTraces = [];
            let maxD = Math.max(...Object.values(agg.depto), 1);

            if (geojsonData) {
                const allDeptNames = geojsonData.features.map(f => f.properties.NOMBRE_DPT);
                mapTraces.push({
                    type: 'choropleth', geojson: geojsonData, locations: allDeptNames, featureidkey: 'properties.NOMBRE_DPT', z: allDeptNames.map(() => 1),
                    colorscale: [[0, '#f8fafc'], [1, '#f8fafc']], showscale: false,
                    marker: { line: { color: '#cbd5e1', width: 0.8 }, opacity: 0.8 }, hoverinfo: 'none'
                });
            }

            if (mapMode === 'TOTAL') {
                let lats = [], lons = [], txts = [], sizes = [], raws = [];
                Object.entries(aggMap).forEach(([depto, data]) => {
                    let d = normDepto(depto).toLowerCase();
                    if (coordsDeptos[d] && data.total > 0) {
                        lats.push(coordsDeptos[d].lat); lons.push(coordsDeptos[d].lon);
                        txts.push(`<b>${depto.toUpperCase()}</b><br>Total: ${data.total.toLocaleString()}<br><span style="font-size:10px;color:#64748b">H: ${data.hombres || 0} | M: ${data.mujeres || 0}</span>`);
                        sizes.push((isMobile ? 10 : 14) + Math.sqrt(data.total / maxD) * (isMobile ? 30 : 45));
                        raws.push(depto);
                    }
                });
                mapTraces.push({
                    type: 'scattergeo', lat: lats, lon: lons, text: txts, customdata: raws, hoverinfo: 'text', mode: 'markers',
                    marker: { size: sizes, color: '#3b82f6', opacity: 0.85, line: { width: 1.5, color: '#ffffff' } }
                });
            } else {
                let lats1 = [], lons1 = [], sizes1 = [], txts1 = [], raws1 = [];
                let lats2 = [], lons2 = [], sizes2 = [], txts2 = [], raws2 = [];

                let lbl1, lbl2, c1, c2, getVal1, getVal2;
                if (mapMode === 'SEXO') {
                    lbl1 = 'Hombres'; lbl2 = 'Mujeres';
                    c1 = coloresVisuales.SEXO?.['Hombres'] || '#0ea5e9';
                    c2 = coloresVisuales.SEXO?.['Mujeres'] || '#ec4899';
                    getVal1 = data => data.hombres || 0;
                    getVal2 = data => data.mujeres || 0;
                } else if (mapMode === 'SEMESTRE') {
                    lbl1 = 'Semestre 1'; lbl2 = 'Semestre 2';
                    c1 = coloresVisuales.SEMESTRE?.['1'] || '#8b5cf6';
                    c2 = coloresVisuales.SEMESTRE?.['2'] || '#f59e0b';
                    getVal1 = data => data.sem1 || 0;
                    getVal2 = data => data.sem2 || 0;
                } else { 
                    lbl1 = 'Presencial'; lbl2 = 'Virtual/Dist.';
                    c1 = coloresVisuales.METOD?.['Presencial'] || '#10b981';
                    c2 = coloresVisuales.METOD?.['Virtual/Dist.'] || '#f43f5e';
                    getVal1 = data => data.presencial || 0;
                    getVal2 = data => data.virtual || 0;
                }

                Object.entries(aggMap).forEach(([depto, data]) => {
                    let d = normDepto(depto).toLowerCase();
                    if (coordsDeptos[d] && data.total > 0) {
                        let lat = coordsDeptos[d].lat, lon = coordsDeptos[d].lon;
                        let val1 = getVal1(data);
                        let val2 = getVal2(data);

                        if (val1 > 0) {
                            lats1.push(lat); lons1.push(lon - 0.12);
                            sizes1.push((isMobile ? 8 : 10) + Math.sqrt(val1 / maxD) * 35);
                            txts1.push(`<b>${depto} (${lbl1})</b><br>${val1.toLocaleString()} matr.`);
                            raws1.push(depto);
                        }
                        if (val2 > 0) {
                            lats2.push(lat); lons2.push(lon + 0.12);
                            sizes2.push((isMobile ? 8 : 10) + Math.sqrt(val2 / maxD) * 35);
                            txts2.push(`<b>${depto} (${lbl2})</b><br>${val2.toLocaleString()} matr.`);
                            raws2.push(depto);
                        }
                    }
                });

                mapTraces.push({ type: 'scattergeo', name: lbl1, lat: lats1, lon: lons1, text: txts1, customdata: raws1, hoverinfo: 'text', mode: 'markers', marker: { size: sizes1, color: c1, opacity: 0.9, line: { width: 1.2, color: '#ffffff' } } });
                mapTraces.push({ type: 'scattergeo', name: lbl2, lat: lats2, lon: lons2, text: txts2, customdata: raws2, hoverinfo: 'text', mode: 'markers', marker: { size: sizes2, color: c2, opacity: 0.9, line: { width: 1.2, color: '#ffffff' } } });
            }

            const mapLayout = {
                ...layout, margin: { t: 0, b: 0, l: 0, r: 0 }, showlegend: mapMode !== 'TOTAL',
                legend: { ...legendStyle, y: -0.05, bgcolor: 'rgba(255,255,255,0.9)' },
                geo: geojsonData ? { fitbounds: 'locations', visible: false, bgcolor: 'transparent' } : { scope: 'south america', center: { lat: 4.5, lon: -73.0 }, projection: { type: 'mercator', scale: isMobile ? 3.5 : 4.5 }, showland: true, landcolor: '#f8fafc', showcountries: true, countrycolor: '#e2e8f0', bgcolor: 'transparent' }
            };

            Plotly.newPlot('mapa-colombia', mapTraces, mapLayout, confGen);
            bindPlotlyClick('mapa-colombia', 'depto', d => { const pt = d.points[0]; return pt.data.type === 'scattergeo' ? pt.customdata : null; });

            // --- 2. EVOLUCIÓN HISTÓRICA ---
            let modeEvol = document.getElementById('mode-evolucion').value;
            let años = Object.keys(agg.año).sort();
            let tracesEvol = [];

            if (modeEvol === 'TOTAL') {
                let valsAños = años.map(a => aggEvolDetalle[a].total);
                let textosConCrecimiento = valsAños.map((v, i) => {
                    if (i === 0 || valsAños[i - 1] === 0) return `<b>${v.toLocaleString()}</b>`;
                    let prev = valsAños[i - 1], pct = ((v - prev) / prev) * 100;
                    let icon = pct > 0 ? '▲' : (pct < 0 ? '▼' : '▬');
                    return `<b>${v.toLocaleString()}</b><br><span style="font-size:9px">${icon} ${Math.abs(pct).toFixed(1)}%</span>`;
                });
                let coloresTexto = valsAños.map((v, i) => {
                    if (i === 0 || valsAños[i - 1] === 0) return '#1e293b';
                    let pct = ((v - valsAños[i - 1]) / valsAños[i - 1]);
                    return pct > 0 ? '#10b981' : (pct < 0 ? '#ef4444' : '#64748b');
                });

                tracesEvol.push({
                    x: años, y: valsAños, type: 'scatter', mode: 'lines+markers+text',
                    text: textosConCrecimiento, textposition: 'top center',
                    textfont: { family: "'Inter', sans-serif", weight: 700, color: coloresTexto, size: isMobile ? 10 : 11 },
                    line: { color: '#3b82f6', width: 4, shape: 'spline' },
                    marker: { size: 10, color: '#3b82f6', line: { color: '#ffffff', width: 2 } },
                    fill: 'tozeroy', fillcolor: 'rgba(59, 130, 246, 0.1)'
                });
            } else {
                let variableEvol = modeEvol.toLowerCase();
                let subkeys = new Set();
                años.forEach(a => Object.keys(aggEvolDetalle[a][variableEvol]).forEach(sk => subkeys.add(sk)));

                let paleta = coloresVisuales[modeEvol] || {};
                Array.from(subkeys).sort().forEach((sk, idx) => {
                    let yVals = años.map(a => aggEvolDetalle[a][variableEvol][sk] || 0);
                    let color = paleta[sk] || coloresFallback[idx % coloresFallback.length];
                    tracesEvol.push({ 
                        x: años, y: yVals, name: sk, type: 'scatter', 
                        mode: 'lines+markers+text', 
                        text: yVals.map(v => v > 0 ? v.toLocaleString() : ''),
                        textposition: 'top center',
                        textfont: { family: "'Inter', sans-serif", size: 10, color: color, weight: 'bold' },
                        line: { width: 3, shape: 'spline', color: color }, 
                        marker: { size: 8, color: color, line: { color: '#ffffff', width: 1 } }, 
                        hoverinfo: 'name+y+x' 
                    });
                });
            }

            let maxTotalEvol = Math.max(...años.map(a => aggEvolDetalle[a].total), 1);
            const layoutEvol = {
                ...layout, showlegend: modeEvol !== 'TOTAL', legend: legendStyle,
                margin: { l: isMobile ? 40 : 60, r: 20, t: 30, b: 80 },
                xaxis: { showgrid: false, tickfont: { family: "'Inter', sans-serif", color: '#64748b', weight: 'bold' } },
                yaxis: { range: [0, maxTotalEvol * 1.3], showticklabels: true, gridcolor: '#f1f5f9', zeroline: false, tickfont: { family: "'Inter', sans-serif" } }, hovermode: 'x unified'
            };

            Plotly.newPlot('grafico-evolucion', tracesEvol, layoutEvol, confGen);
            bindPlotlyClick('grafico-evolucion', 'año', d => String(d.points[0].x));

            // --- 3. TOP INSTITUCIONES ---
            let modeIes = document.getElementById('mode-ies').value;
            let tIes = getTop(agg.ies, numLimit);
            document.getElementById('lbl-ies-count').innerText = `(${tIes.k.length})`;
            const altoIes = Math.max(isMobile ? 300 : 350, tIes.k.length * 35);
            document.getElementById('grafico-instituciones').style.height = `${altoIes}px`;
            const truncar = str => isMobile && str.length > 25 ? str.substring(0, 23) + '...' : str;

            let tracesIes = [];
            if (modeIes === 'TOTAL') {
                tracesIes.push({
                    type: 'bar', orientation: 'h', customdata: tIes.k.slice().reverse(), y: tIes.k.slice().reverse().map(truncar), x: tIes.v.slice().reverse(),
                    text: tIes.v.slice().reverse().map(v => v.toLocaleString()), textposition: 'outside', textfont: { family: "'Inter', sans-serif" }, marker: { color: '#3b82f6', line: { color: '#ffffff', width: 2 } }
                });
            } else {
                tracesIes = crearTracesApilados(aggIesDetalle, tIes.k.slice().reverse(), modeIes.toLowerCase()).map(t => ({ ...t, marker: { ...t.marker, line: { color: '#ffffff', width: 1.5 } }, textposition: 'auto' }));
            }

            Plotly.newPlot('grafico-instituciones', tracesIes, {
                ...layout, barmode: modeIes === 'TOTAL' ? 'group' : 'stack', showlegend: modeIes !== 'TOTAL', legend: legendStyle,
                margin: { l: 10, t: 30, b: 60, r: 50 }, xaxis: { showgrid: true, gridcolor: '#f1f5f9', zeroline: false }, yaxis: { automargin: true, tickfont: { family: "'Inter', sans-serif", size: 12, color: '#1e293b' } }
            }, confGen);
            bindPlotlyClick('grafico-instituciones', 'ies', d => d.points[0].customdata);

            // --- 4. TOP PROGRAMAS ---
            let modeProg = document.getElementById('mode-prog').value;
            let tProg = getTop(agg.prog, numLimit);
            document.getElementById('lbl-prog-count').innerText = `(${tProg.k.length})`;
            const altoProg = Math.max(isMobile ? 300 : 350, tProg.k.length * 35);
            document.getElementById('grafico-programas').style.height = `${altoProg}px`;

            let tracesProg = [];
            if (modeProg === 'TOTAL') {
                tracesProg.push({
                    type: 'bar', orientation: 'h', customdata: tProg.k.slice().reverse(), y: tProg.k.slice().reverse().map(truncar), x: tProg.v.slice().reverse(),
                    text: tProg.v.slice().reverse().map(v => v.toLocaleString()), textposition: 'outside', textfont: { family: "'Inter', sans-serif" }, marker: { color: '#8b5cf6', line: { color: '#ffffff', width: 2 } }
                });
            } else {
                tracesProg = crearTracesApilados(aggProgDetalle, tProg.k.slice().reverse(), modeProg.toLowerCase()).map(t => ({ ...t, marker: { ...t.marker, line: { color: '#ffffff', width: 1.5 } }, textposition: 'auto' }));
            }

            Plotly.newPlot('grafico-programas', tracesProg, {
                ...layout, barmode: modeProg === 'TOTAL' ? 'group' : 'stack', showlegend: modeProg !== 'TOTAL', legend: legendStyle,
                margin: { l: 10, t: 30, b: 60, r: 50 }, xaxis: { showgrid: true, gridcolor: '#f1f5f9', zeroline: false }, yaxis: { automargin: true, tickfont: { family: "'Inter', sans-serif", size: 12, color: '#1e293b' } }
            }, confGen);
            bindPlotlyClick('grafico-programas', 'programa', d => d.points[0].customdata);

            // --- NUEVOS TOPs (Municipios y Deptos) ---
            
            // Top Municipios
            let modeMuni = document.getElementById('mode-muni').value;
            let tMuni = getTop(agg.municipio, numLimit);
            document.getElementById('lbl-muni-count').innerText = `(${tMuni.k.length})`;
            const altoMuni = Math.max(isMobile ? 300 : 350, tMuni.k.length * 35);
            document.getElementById('grafico-municipios').style.height = `${altoMuni}px`;

            let tracesMuni = [];
            if (modeMuni === 'TOTAL') {
                tracesMuni.push({
                    type: 'bar', orientation: 'h', customdata: tMuni.k.slice().reverse(), y: tMuni.k.slice().reverse().map(truncar), x: tMuni.v.slice().reverse(),
                    text: tMuni.v.slice().reverse().map(v => v.toLocaleString()), textposition: 'outside', textfont: { family: "'Inter', sans-serif" }, marker: { color: '#10b981', line: { color: '#ffffff', width: 2 } }
                });
            } else {
                tracesMuni = crearTracesApilados(aggMuniDetalle, tMuni.k.slice().reverse(), modeMuni.toLowerCase()).map(t => ({ ...t, marker: { ...t.marker, line: { color: '#ffffff', width: 1.5 } }, textposition: 'auto' }));
            }
            Plotly.newPlot('grafico-municipios', tracesMuni, {
                ...layout, barmode: modeMuni === 'TOTAL' ? 'group' : 'stack', showlegend: modeMuni !== 'TOTAL', legend: legendStyle,
                margin: { l: 10, t: 30, b: 60, r: 50 }, xaxis: { showgrid: true, gridcolor: '#f1f5f9', zeroline: false }, yaxis: { automargin: true, tickfont: { family: "'Inter', sans-serif", size: 12, color: '#1e293b' } }
            }, confGen);
            bindPlotlyClick('grafico-municipios', 'municipio', d => d.points[0].customdata);

            // Top Departamentos
            let modeDeptoBar = document.getElementById('mode-depto-bar').value;
            let tDepto = getTop(agg.depto, numLimit);
            document.getElementById('lbl-depto-count').innerText = `(${tDepto.k.length})`;
            const altoDepto = Math.max(isMobile ? 300 : 350, tDepto.k.length * 35);
            document.getElementById('grafico-departamentos').style.height = `${altoDepto}px`;

            let tracesDepto = [];
            if (modeDeptoBar === 'TOTAL') {
                tracesDepto.push({
                    type: 'bar', orientation: 'h', customdata: tDepto.k.slice().reverse(), y: tDepto.k.slice().reverse().map(truncar), x: tDepto.v.slice().reverse(),
                    text: tDepto.v.slice().reverse().map(v => v.toLocaleString()), textposition: 'outside', textfont: { family: "'Inter', sans-serif" }, marker: { color: '#f59e0b', line: { color: '#ffffff', width: 2 } }
                });
            } else {
                tracesDepto = crearTracesApilados(aggDeptoDetalle, tDepto.k.slice().reverse(), modeDeptoBar.toLowerCase()).map(t => ({ ...t, marker: { ...t.marker, line: { color: '#ffffff', width: 1.5 } }, textposition: 'auto' }));
            }
            Plotly.newPlot('grafico-departamentos', tracesDepto, {
                ...layout, barmode: modeDeptoBar === 'TOTAL' ? 'group' : 'stack', showlegend: modeDeptoBar !== 'TOTAL', legend: legendStyle,
                margin: { l: 10, t: 30, b: 60, r: 50 }, xaxis: { showgrid: true, gridcolor: '#f1f5f9', zeroline: false }, yaxis: { automargin: true, tickfont: { family: "'Inter', sans-serif", size: 12, color: '#1e293b' } }
            }, confGen);
            bindPlotlyClick('grafico-departamentos', 'depto', d => d.points[0].customdata);

            // --- 5. GRÁFICOS CIRCULARES ---
            const donutLytBase = {
                ...layout, margin: { t: 40, b: 100, l: 40, r: 40 }, showlegend: true, paper_bgcolor: 'rgba(0,0,0,0)', font: { family: "'Inter', sans-serif" }, grid: { rows: 1, columns: 1 },
                legend: legendStyle
            };

            const obtenerAnotacionCentral = (dataLabels) => [{
                font: { family: "'Inter', sans-serif", size: 24, color: '#1e293b', weight: 'bold' }, showarrow: false,
                text: Object.values(dataLabels).reduce((a, b) => a + b, 0).toLocaleString(), x: 0.5, y: 0.5
            }];

            const crearDataDonut = (labels, paletaNombre) => {
                const llaves = Object.keys(labels).sort();
                const valores = llaves.map(k => labels[k]);
                const paleta = coloresVisuales[paletaNombre] || {};
                
                const coloresArray = llaves.map((k, idx) => paleta[k] || coloresFallback[idx % coloresFallback.length]);

                return [{
                    labels: llaves,
                    values: valores,
                    type: 'pie',
                    hole: 0.72,
                    textinfo: 'percent',
                    textposition: 'outside',
                    automargin: false,
                    marker: { colors: coloresArray, line: { color: '#ffffff', width: 3 } },
                    textfont: { family: "'Inter', sans-serif", size: 15, color: '#1e293b', weight: 'bold' },
                    domain: { x: [0, 1], y: [0, 1] }
                }];
            };

            Plotly.newPlot('grafico-nivel', crearDataDonut(agg.nivel, 'NIVEL'), { ...donutLytBase, annotations: obtenerAnotacionCentral(agg.nivel) }, confGen);
            bindPlotlyClick('grafico-nivel', 'nivel', d => d.points[0].label);

            Plotly.newPlot('grafico-metodologia', crearDataDonut(agg.metod, 'METOD'), { ...donutLytBase, annotations: obtenerAnotacionCentral(agg.metod) }, confGen);
            bindPlotlyClick('grafico-metodologia', 'metodologia', d => d.points[0].label);

            Plotly.newPlot('grafico-sexo', crearDataDonut(agg.sexo, 'SEXO'), { ...donutLytBase, annotations: obtenerAnotacionCentral(agg.sexo) }, confGen);
            bindPlotlyClick('grafico-sexo', 'sexo', d => d.points[0].label);

            Plotly.newPlot('grafico-semestre', crearDataDonut(agg.semestre, 'SEMESTRE'), { ...donutLytBase, annotations: obtenerAnotacionCentral(agg.semestre) }, confGen);
            bindPlotlyClick('grafico-semestre', 'semestre', d => d.points[0].label);

            Plotly.newPlot('grafico-sector', crearDataDonut(agg.sector, 'SECTOR'), { ...donutLytBase, annotations: obtenerAnotacionCentral(agg.sector) }, confGen);
            bindPlotlyClick('grafico-sector', 'sector', d => d.points[0].label);

            // --- 6. CATEGORÍAS PARALELAS (Sankey Multicategórico) ---
            let dimNivel = [], dimMetod = [], dimSexo = [], freqs = [];
            Object.keys(parcatsAgg).forEach(k => {
                let p = k.split('|');
                dimNivel.push(p[0]); dimMetod.push(p[1]); dimSexo.push(p[2]); freqs.push(parcatsAgg[k]);
            });

            const coloresParcats = [ [0, '#6366f1'], [0.5, '#94a3b8'], [1, '#cbd5e1'] ];
            let nivelesUnicos = [...new Set(dimNivel)];
            let arrayColoresParcats = dimNivel.map(n => nivelesUnicos.indexOf(n));

            let traceParcats = {
                type: 'parcats', hoverinfo: 'count+probability', arrangement: 'freeform', bundlecolors: true,
                line: { color: arrayColoresParcats, colorscale: coloresParcats, shape: 'hspline', hoverinfo: 'none' },
                dimensions: [ { label: 'NIVEL', values: dimNivel }, { label: 'METODOLOGÍA', values: dimMetod }, { label: 'SEXO', values: dimSexo } ],
                counts: freqs, labelfont: { family: "'Inter', sans-serif", size: isMobile ? 10 : 12, color: '#1e293b', weight: 'bold' },
                tickfont: { family: "'Inter', sans-serif", size: isMobile ? 9 : 11, color: '#64748b' }
            };

            const parcatsLyt = {
                ...layout, margin: { t: 60, b: 40, l: isMobile ? 40 : 80, r: isMobile ? 40 : 80 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)'
            };

            Plotly.newPlot('grafico-parcats', [traceParcats], parcatsLyt, confGen);
        }
    

window.cambiarDataset = cambiarDataset;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltrosCruzados = limpiarFiltrosCruzados;
