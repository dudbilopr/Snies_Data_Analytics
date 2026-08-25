import pandas as pd
import os
import glob
import unicodedata
import json
import warnings
import re

warnings.filterwarnings('ignore')

def quitar_tildes(texto):
    if pd.isna(texto): return ""
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')

def capitalizar_estilo_espanol(texto):
    if not texto: return ""
    palabras_excluidas = {'de', 'la', 'del', 'en', 'y', 'e', 'las', 'los'}
    palabras = str(texto).split()
    resultado = []
    for i, palabra in enumerate(palabras):
        if i != 0 and palabra.lower() in palabras_excluidas:
            resultado.append(palabra.lower())
        else:
            resultado.append(palabra.capitalize())
    return ' '.join(resultado)

def normalizar_texto(texto):
    if pd.isna(texto): return ""
    texto = str(texto).strip().lower()
    texto = texto.replace(",", "").replace(".", "")
    texto = " ".join(texto.split())
    return capitalizar_estilo_espanol(quitar_tildes(texto))

def normalizar_columnas(cols):
    new_cols = []
    for c in cols:
        c_str = str(c).upper().strip()
        c_str = quitar_tildes(c_str)
        # Estandarizar
        if 'PROGRAMA ACADEMICO' in c_str: c_str = 'PROGRAMA_ACADEMICO'
        elif 'INSTITUCION' in c_str and 'EDUCACION' in c_str: c_str = 'IES'
        elif 'IES' in c_str and 'PADRE' not in c_str: c_str = 'IES'
        elif 'MUNICIPIO' in c_str and 'IES' in c_str: c_str = 'MUNICIPIO_IES'
        elif 'DEPARTAMENTO' in c_str and 'IES' in c_str: c_str = 'DEPARTAMENTO_IES'
        elif 'NIVEL ACADEMICO' in c_str: c_str = 'NIVEL_ACADEMICO'
        elif 'MODALIDAD' in c_str or 'METODOLOGIA' in c_str: c_str = 'METODOLOGIA'
        elif c_str == 'SEXO' or 'GENERO' in c_str: c_str = 'SEXO'
        elif 'PRIMER CURSO' in c_str: c_str = 'MATRICULADOS_PRIMER_CURSO'
        elif 'MATRICULADOS' in c_str and 'PRIMER' not in c_str: c_str = 'MATRICULADOS_TOTAL'
        elif 'ADMITIDOS' in c_str: c_str = 'ADMITIDOS'
        elif 'INSCRITOS' in c_str: c_str = 'INSCRITOS'
        elif 'GRADUADOS' in c_str: c_str = 'GRADUADOS'
        elif 'DOCENTES' in c_str: c_str = 'DOCENTES'
        elif 'ADMINISTRATIVOS' in c_str: c_str = 'ADMINISTRATIVOS'
        new_cols.append(c_str)
    return new_cols

def read_excel_auto_header(file_path):
    print(f"Leyendo: {file_path}")
    try:
        # Primero leer las primeras 20 filas para encontrar el header
        temp_df = pd.read_excel(file_path, nrows=20, header=None)
        header_row = 0
        for i, row in temp_df.iterrows():
            row_str = ' '.join([str(x).upper() for x in row.values])
            if 'CÓDIGO' in row_str or 'CODIGO' in row_str or 'AÑO' in row_str or 'IES' in row_str or 'A\u00d1O' in row_str:
                header_row = i
                break
        
        df = pd.read_excel(file_path, skiprows=header_row)
        df.columns = normalizar_columnas(df.columns)
        return df
    except Exception as e:
        print(f"Error procesando {file_path}: {e}")
        return pd.DataFrame()

def es_ciencia_de_datos(programa):
    if pd.isna(programa): return False
    prog = str(programa).lower()
    prog = quitar_tildes(prog)
    # Filtro enfocado
    patron = r'ciencia de datos|analitica de datos|ingenieria de datos|inteligencia artificial|datos|machine learning|big data'
    excluir = r'radiologia|odontologia|medicina' # Solo por si acaso cruza algo raro
    
    if re.search(patron, prog):
        if not re.search(excluir, prog):
            return True
    return False

def procesar_carpeta_snies(base_path):
    carpetas = glob.glob(os.path.join(base_path, 'SNIES_20*'))
    
    # Listas para guardar dataframes por categoría
    dfs = {
        'Estudiantes Matriculados en primer curso': [],
        'Estudiantes Matriculados': [],
        'Estudiantes Admitidos': [],
        'Estudiantes Inscritos': [],
        'Estudiantes Graduados': [],
        'Docentes': [],
        'Administrativos': []
    }
    
    for carpeta in carpetas:
        archivos = glob.glob(os.path.join(carpeta, '*.xlsx'))
        for archivo in archivos:
            nombre_base = os.path.basename(archivo).lower()
            
            # Identificar categoría
            categoria = None
            if 'primer curso' in nombre_base:
                categoria = 'Estudiantes Matriculados en primer curso'
            elif 'matriculados' in nombre_base:
                categoria = 'Estudiantes Matriculados'
            elif 'admitidos' in nombre_base:
                categoria = 'Estudiantes Admitidos'
            elif 'inscritos' in nombre_base:
                categoria = 'Estudiantes Inscritos'
            elif 'graduados' in nombre_base:
                categoria = 'Estudiantes Graduados'
            elif 'docentes' in nombre_base:
                categoria = 'Docentes'
            elif 'administrativos' in nombre_base:
                categoria = 'Administrativos'
                
            if categoria:
                df = read_excel_auto_header(archivo)
                if not df.empty:
                    # Si tiene columna de programa, filtrar por Ciencia de Datos
                    if 'PROGRAMA_ACADEMICO' in df.columns:
                        df = df[df['PROGRAMA_ACADEMICO'].apply(es_ciencia_de_datos)]
                        df['PROGRAMA_ACADEMICO'] = df['PROGRAMA_ACADEMICO'].apply(normalizar_texto)
                    if 'IES' in df.columns:
                        df['IES'] = df['IES'].apply(normalizar_texto)
                    if 'MUNICIPIO_IES' in df.columns:
                        df['MUNICIPIO_IES'] = df['MUNICIPIO_IES'].apply(normalizar_texto)
                    if 'SEXO' in df.columns:
                        df['SEXO'] = df['SEXO'].apply(lambda x: 'Masculino' if str(x).lower().strip() in ['hombre', 'masculino', '1'] else ('Femenino' if str(x).lower().strip() in ['mujer', 'femenino', '2'] else 'Otro'))
                    
                    dfs[categoria].append(df)
                    
    # Consolidar
    resultados = {}
    for cat, lista_dfs in dfs.items():
        if len(lista_dfs) > 0:
            df_final = pd.concat(lista_dfs, ignore_index=True)
            # Solo guardaremos las columnas esenciales para no pesar tanto el JSON
            cols_to_keep = ['AÑO', 'SEMESTRE', 'IES', 'PROGRAMA_ACADEMICO', 'NIVEL_ACADEMICO', 'METODOLOGIA', 'MUNICIPIO_IES', 'DEPARTAMENTO_IES', 'SEXO']
            # Añadir las columnas numéricas que existan
            for col_num in ['MATRICULADOS_PRIMER_CURSO', 'MATRICULADOS_TOTAL', 'ADMITIDOS', 'INSCRITOS', 'GRADUADOS', 'DOCENTES', 'ADMINISTRATIVOS']:
                if col_num in df_final.columns:
                    cols_to_keep.append(col_num)
            
            # En Docentes y administrativos suele haber 'NIVEL_FORMACION_DOCENTE' o algo así
            # Revisaremos si hay algo interesante extra y lo dejamos, pero para evitar json gigante filtramos.
            cols_to_keep = [c for c in cols_to_keep if c in df_final.columns]
            
            # Group by para sumarizar los valores numéricos y reducir el peso del JSON
            # Grouping key
            group_keys = [c for c in cols_to_keep if c not in ['MATRICULADOS_PRIMER_CURSO', 'MATRICULADOS_TOTAL', 'ADMITIDOS', 'INSCRITOS', 'GRADUADOS', 'DOCENTES', 'ADMINISTRATIVOS']]
            num_keys = [c for c in cols_to_keep if c in ['MATRICULADOS_PRIMER_CURSO', 'MATRICULADOS_TOTAL', 'ADMITIDOS', 'INSCRITOS', 'GRADUADOS', 'DOCENTES', 'ADMINISTRATIVOS']]
            
            # Make sure all numeric columns are actually numbers
            for nk in num_keys:
                df_final[nk] = pd.to_numeric(df_final[nk], errors='coerce').fillna(0)
                
            if group_keys and num_keys:
                df_grouped = df_final.groupby(group_keys, dropna=False)[num_keys].sum().reset_index()
            else:
                df_grouped = df_final
            resultados[cat] = df_grouped.to_dict(orient='split')
    # Guardar a JSON
    os.makedirs(r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\Snies_Data_Analytics\public\data', exist_ok=True)
    for cat, data in resultados.items():
        fname = cat.replace(" ", "_").lower() + ".json"
        out_path = os.path.join(r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\Snies_Data_Analytics\public\data', fname)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"Generado {out_path} con {len(data)} registros.")

if __name__ == "__main__":
    base_snies = r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\SNIES'
    print("Iniciando procesamiento ETL SNIES...")
    procesar_carpeta_snies(base_snies)
    print("Proceso completado.")
