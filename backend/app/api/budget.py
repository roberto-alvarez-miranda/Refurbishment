from typing import Dict, List, Optional
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.budget import Resource, BudgetItem, Chapter, ProjectBudget
from app.services.calculator import BudgetCalculator

try:
    from google.cloud import firestore
except ImportError:
    firestore = None

router = APIRouter()

class CalculateBudgetRequest(BaseModel):
    budget: ProjectBudget
    chapters: List[Chapter]
    items: List[BudgetItem]
    resources: Dict[str, Resource]

class CalculateBudgetResponse(BaseModel):
    budget: ProjectBudget
    chapters: List[Chapter]
    items: List[BudgetItem]

@router.post("/calculate", response_model=CalculateBudgetResponse)
def calculate_budget(request: CalculateBudgetRequest):
    calculator = BudgetCalculator(resources=request.resources)
    
    calc_budget, calc_chapters, calc_items = calculator.calculate_project(
        budget=request.budget,
        chapters=request.chapters,
        items=request.items
    )
    
    return CalculateBudgetResponse(
        budget=calc_budget,
        chapters=calc_chapters,
        items=calc_items
    )

class FlatBudgetItem(BaseModel):
    code: str
    description: str
    qty: float
    unit: str
    status: str
    category: str

class SaveBudgetRequest(BaseModel):
    items: List[FlatBudgetItem]

@router.post("/save")
def save_budget(request: SaveBudgetRequest):
    if not firestore:
        raise HTTPException(status_code=500, detail="Firestore client not available")
        
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia")
    try:
        db = firestore.Client(project=project_id, database="(default)")
        batch = db.batch()
        
        # Save to a collection named 'budget_components'
        collection_ref = db.collection("budget_components")
        
        for item in request.items:
            doc_ref = collection_ref.document() # Auto-generate ID
            batch.set(doc_ref, item.model_dump())
            
        batch.commit()
        return {"status": "success", "saved_count": len(request.items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save to Firestore: {str(e)}")
