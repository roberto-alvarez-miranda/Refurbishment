from typing import Dict, List
from fastapi import APIRouter
from pydantic import BaseModel
from app.models.budget import Resource, BudgetItem, Chapter, ProjectBudget
from app.services.calculator import BudgetCalculator

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
