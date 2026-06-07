from typing import List, Optional
from pydantic import BaseModel

class Tabique(BaseModel):
    label: str               # e.g., "Tabique divisorio con Cocina", "Tabique armario", "Tabique Norte"
    length_m: float          # Largo en metros lineales (ml)
    height_m: float          # Alto en metros (m)
    area_m2: float           # Superficie en m² (largo * alto)
    material: str = "Ladrillo/Pladur" # Material del tabique

class Sanitario(BaseModel):
    type: str                # e.g., "inodoro", "lavabo", "bañera", "plato de ducha", "caldera", "fregadero"
    count: int = 1           # Cantidad de elementos
    action: str              # e.g., "retirar", "conservar", "instalar nuevo"

class EstanciaSummary(BaseModel):
    type: str                  # e.g., "cocina", "baño", "pasillo", "dormitorio", "salón"
    name: Optional[str] = None # e.g., "Dormitorio Principal", "Baño Suite", "Cocina Americana"
    area_m2: float             # m² de esta estancia específica
    perimeter_m: float         # perímetro (ml) para rodapiés o acabados
    height_m: float = 2.50     # Altura libre de la estancia en metros (default a 2.50m)
    tabiques: List[Tabique] = [] # Listado de tabiques individuales de esta estancia
    sanitarios: List[Sanitario] = [] # Listado de aparatos sanitarios/instalaciones en esta estancia
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
