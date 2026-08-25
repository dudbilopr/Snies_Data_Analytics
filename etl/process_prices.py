import pandas as pd
import os
import json
import warnings

warnings.filterwarnings('ignore')

def process_prices():
    # El archivo está en la carpeta SNIES/Precios_2026.xlsx
    file_path = r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\SNIES\Precios_2026.xlsx'
    print(f"Procesando precios desde {file_path}")
    
    try:
        # El archivo no tiene header, y tiene naNs en la primera fila.
        df = pd.read_excel(file_path, header=None)
        
        # Eliminar filas vacías
        df = df.dropna(how='all')
        
        # Asumiendo estructura: Link, Precio, Programa, Semestres, Modalidad
        df.columns = ['Link', 'Precio', 'Programa', 'Semestres', 'Modalidad']
        
        # Filtrar valores NaN en columnas clave
        df = df.dropna(subset=['Programa'])
        
        # Limpiar
        df['Precio'] = pd.to_numeric(df['Precio'], errors='coerce')
        df['Semestres'] = pd.to_numeric(df['Semestres'], errors='coerce')
        df['Modalidad'] = df['Modalidad'].astype(str).str.replace('\n', ' ').str.strip()
        df['Programa'] = df['Programa'].astype(str).str.strip()
        
        data = df.to_dict(orient='split')
        
        out_path = r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\Snies_Data_Analytics\public\data\precios_2026.json'
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
            
        print(f"Precios procesados. Total: {len(data)} registros.")
    except Exception as e:
        print(f"Error procesando precios: {e}")

if __name__ == "__main__":
    process_prices()
