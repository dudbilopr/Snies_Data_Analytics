<div align="center">
  <img src="https://www.unab.edu.co/wp-content/uploads/2022/02/Logo-UNAB-2022.png" alt="UNAB Logo" width="200"/>

  # 📊 CDAT Analytics: SNIES Data Engine
  
  **Ecosistema de inteligencia académica para el análisis de la oferta educativa en Ciencia de Datos en Colombia.**
  
  [![Estado](https://img.shields.io/badge/estado-activo-brightgreen?style=for-the-badge)](#)
  [![Fuente](https://img.shields.io/badge/datos-SNIES%20Colombia-blue?style=for-the-badge)](https://snies.mineducacion.gov.co/)
  [![Tecnología](https://img.shields.io/badge/tech-Vite%20%7C%20Vanilla%20JS-orange?style=for-the-badge)](#)
</div>

---

## 🚀 Descripción General
**CDAT Analytics** es una herramienta de visualización interactiva y escalable diseñada para explorar la oferta educativa colombiana en **Ciencia de Datos e Inteligencia Artificial**. Procesando millones de registros abiertos del Ministerio de Educación Nacional (SNIES), esta plataforma consolida métricas clave sobre:

- 👨‍🎓 **Estudiantes**: Inscritos, Admitidos, Matriculados (totales y primer curso) y Graduados.
- 👨‍🏫 **Planta Física e Institucional**: Docentes y Administrativos.
- 💰 **Análisis de Mercado**: Precios y ofertas 2026.

## ⚙️ Arquitectura del Proyecto
El proyecto está estructurado de manera modular para garantizar alto rendimiento y escalabilidad:

1. **Pipeline ETL (Python)**: Localizado en la carpeta `etl/`, se encarga de recorrer históricamente las bases masivas de Excel del SNIES, extrayendo, normalizando y filtrando semánticamente los programas de interés.
2. **Datamart JSON**: Los datos consolidados se exportan como agrupaciones ligeras en formato JSON dentro de `public/data/` (versionados con Git LFS).
3. **Frontend Modular (Vite)**: Una Single Page Application (SPA) en Vanilla JS y CSS (con diseño *Glassmorphism* y estilos corporativos) para visualización instantánea.

## 🛠️ Cómo Ejecutar Localmente

### 1. Clonar e Instalar
```bash
git clone https://github.com/dudbilopr/Snies_Data_Analytics.git
cd Snies_Data_Analytics
npm install
```

### 2. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
> Si no tienes Node.js, puedes usar Python: `python -m http.server 3000`

### 3. Actualizar la Base de Datos (ETL)
Si descargas nuevos años del SNIES, deposítalos en la carpeta externa respectiva y ejecuta:
```bash
python etl/process_snies.py
python etl/process_prices.py
```

## 📖 Glosario de Métricas (SNIES)
- **Inscritos**: Solicitudes para ingreso a un programa.
- **Admitidos**: Personas aceptadas tras el proceso de selección.
- **Matriculados en Primer Curso**: Admitidos que formalizan su matrícula por primera vez.
- **Matriculados**: Estudiantes activos en todas las cohortes.
- **Graduados**: Estudiantes que han culminado su programa.

---
<div align="center">
  <i>Desarrollado para el análisis estratégico de la educación superior en Colombia.</i>
</div>
