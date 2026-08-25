import pandas as pd
import json
import os
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def process_prices():
    file_path = r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\SNIES\Precios_2026.xlsx'
    
    # Read Excel
    df = pd.read_excel(file_path, header=None)
    df = df.dropna(how='all')
    df.columns = ['Link', 'Precio', 'Programa', 'Semestres', 'Modalidad']
    
    # Filter out header string and nans
    df = df[df['Precio'].apply(lambda x: str(x).isnumeric())]
    df['Precio'] = pd.to_numeric(df['Precio'])
    
    # Map domain to SNIES IES Name
    def map_ies(link):
        link = str(link).lower()
        if 'poli.edu.co' in link: return 'INSTITUCION UNIVERSITARIA POLITECNICO GRANCOLOMBIANO'
        if 'ucatolica.edu.co' in link: return 'UNIVERSIDAD CATOLICA DE COLOMBIA'
        if 'uexternado.edu.co' in link: return 'UNIVERSIDAD EXTERNADO DE COLOMBIA'
        if 'unilibre.edu.co' in link: return 'UNIVERSIDAD LIBRE'
        if 'uniandes.edu.co' in link: return 'UNIVERSIDAD DE LOS ANDES'
        if 'lasalle.edu.co' in link: return 'UNIVERSIDAD DE LA SALLE'
        if 'ucentral.edu.co' in link: return 'UNIVERSIDAD CENTRAL'
        if 'unisabana.edu.co' in link: return 'UNIVERSIDAD DE LA SABANA'
        if 'ucompensar.edu.co' in link: return 'FUNDACION UNIVERSITARIA COMPENSAR'
        if 'unad.edu.co' in link: return 'UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA UNAD'
        if 'utb.edu.co' in link: return 'UNIVERSIDAD TECNOLOGICA DE BOLIVAR'
        if 'upb.edu.co' in link: return 'UNIVERSIDAD PONTIFICIA BOLIVARIANA'
        if 'ibero.edu.co' in link: return 'CORPORACION UNIVERSITARIA IBEROAMERICANA'
        return 'UNKNOWN'

    df['IES'] = df['Link'].apply(map_ies)
    
    data = df.to_dict(orient='records')
    
    out_path = r'c:\Users\dudbi\Downloads\Control de Perdida CDAT\Snies_Data_Analytics\public\data\precios_2026.json'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        
    print(f"Precios procesados. Total: {len(data)} registros.")

if __name__ == '__main__':
    process_prices()
