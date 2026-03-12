<div align="center">

<br>

# SNIES Analytics

### Dashboard de inteligencia académica para análisis de oferta educativa en Colombia

<br>

[![Estado](https://img.shields.io/badge/estado-activo-brightgreen?style=flat-square)](https://dudbilopr.github.io/Snies_Data_Analytics/SNIES_Analytics.html)
[![Fuente](https://img.shields.io/badge/datos-SNIES%20Colombia-blue?style=flat-square)](https://snies.mineducacion.gov.co/)
[![GitHub Pages](https://img.shields.io/badge/live-GitHub%20Pages-222?style=flat-square)](https://dudbilopr.github.io/Snies_Data_Analytics/SNIES_Analytics.html)

<br>

**[Ver dashboard en vivo](https://dudbilopr.github.io/Snies_Data_Analytics/SNIES_Analytics.html)**

<br>

</div>

---

## Descripción

Herramienta de visualización interactiva para explorar la oferta educativa colombiana por área de conocimiento, institución, departamento y metodología. Construida con datos abiertos del Ministerio de Educación Nacional.

---

## Áreas disponibles

| Área | Estado | Dataset |
|---|---|---|
| Radiología e Imágenes Diagnósticas | Disponible | [df_final_NEW.xlsx](df_final_NEW.xlsx) |
| Ciencia de Datos e Inteligencia Artificial | Disponible | [df_final_Ciencia_de_Datos_Afines.xlsx](df_final_Ciencia_de_Datos_Afines.xlsx) |
| Ingeniería de Sistemas | En construcción | — |

---

## Funcionalidades

- KPIs en tiempo real — matrículas totales, número de IES, precio promedio e índice de feminidad
- Mapa interactivo de Colombia con burbujas proporcionales por departamento
- Evolución histórica de matrículas por año
- Rankings por institución y programa (Top 5 / 10 / 20 / Todos)
- Distribución por nivel académico y metodología
- Filtros cruzados — clic en cualquier gráfica filtra todo el dashboard
- Tabla de detalle con enlace directo a cada programa

---

## Tecnologías

| Librería | Uso |
|---|---|
| [Plotly.js](https://plotly.com/javascript/) | Visualizaciones interactivas |
| [SheetJS](https://sheetjs.com/) | Lectura de archivos Excel |
| [GitHub Pages](https://pages.github.com/) | Hosting |
| HTML / CSS / JS | Sin frameworks ni build steps |

---

## Estructura

```
Snies_Data_Analytics/
├── SNIES_Analytics.html   # Dashboard principal
├── df_final_NEW.xlsx      # Dataset Radiología e Imágenes
├── df_final_Ciencia_de_Datos_Afines.xlsx # Dataset Ciencia de Datos y Afines
└── README.md
```

---

## Uso local

```bash
git clone https://github.com/dudbilopr/Snies_Data_Analytics.git
# Abrir SNIES_Analytics.html directamente en el navegador
```

Requiere conexión a internet para cargar los datos y librerías desde CDN.

---

## Fuente de datos

Datos provenientes del **Sistema Nacional de Información de la Educación Superior (SNIES)** — Ministerio de Educación Nacional de Colombia.  
[snies.mineducacion.gov.co](https://snies.mineducacion.gov.co/)

---

<div align="center">
<sub>Desarrollado para el análisis de la educación superior colombiana</sub>
</div>
