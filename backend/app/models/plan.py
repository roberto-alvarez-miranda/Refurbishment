from typing import List, Optional
from pydantic import BaseModel

class EstanciaSummary(BaseModel):
    type: str                  # e.g., "cocina", "baño", "pasillo", "dormitorio", "salón"
    name: Optional[str] = None # e.g., "Dormitorio Principal", "Baño Suite", "Cocina Americana"
    area_m2: float             # m² de esta estancia específica
    perimeter_m: float         # perímetro (ml) para rodapiés o acabados
    partition_walls_ml: float  # ml de tabiquería interior específicos de esta estancia para demoler/levantar
    proposed_materials: List[str] = [] # Materiales específicos detectados
    count: int = 1             # Cantidad de estancias idénticas agrupadas

class Dwelling(BaseModel):
    name: str                       # e.g., "Vivienda Tipo A (su 59.80 m²)", "Vivienda Tipo B"
    total_area_m2: float            # Área útil total de la vivienda
    estancias: List[EstanciaSummary] = []
    exterior_walls_ml: float        # Metros lineales (ml) de cerramientos exteriores / fachadas de la vivienda

class ExtractedPlan(BaseModel):
    dwellings: List[Dwelling] = []
    general_notes: Optional[str] = None
