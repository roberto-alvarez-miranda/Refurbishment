from typing import List, Optional
from pydantic import BaseModel

class EstanciaSummary(BaseModel):
    type: str                  # e.g., "cocina", "baño", "pasillo", "dormitorio", "salón"
    area_m2: float             # m² acumulados para este tipo de estancia
    perimeter_m: float         # perímetros acumulados (para rodapiés, etc.)
    proposed_materials: List[str] = [] # Materiales extraídos dinámicamente de anotaciones CAD
    count: int = 1             # cantidad de estancias de este tipo en la vivienda

class Dwelling(BaseModel):
    name: str                       # e.g., "Vivienda Tipo A (su 59.80 m²)", "Vivienda Tipo B"
    total_area_m2: float            # Área útil total de la vivienda
    estancias: List[EstanciaSummary] = []
    partition_walls_ml: float       # Metros lineales (ml) de tabiquería interna
    exterior_walls_ml: float        # Metros lineales (ml) de cerramientos exteriores / fachadas

class ExtractedPlan(BaseModel):
    dwellings: List[Dwelling] = []
    general_notes: Optional[str] = None
