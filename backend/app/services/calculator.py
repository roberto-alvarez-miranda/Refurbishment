from typing import Dict, List, Tuple
from app.models.budget import Resource, BudgetItem, Chapter, ProjectBudget

class BudgetCalculator:
    def __init__(self, resources: Dict[str, Resource]):
        """
        Initialize the calculator with a dictionary of available resources (Básicos).
        """
        self.resources = resources

    def calculate_item(self, item: BudgetItem) -> BudgetItem:
        """
        Calculates the unit price and total quantity of a BudgetItem.
        Returns a new instance with the calculated values.
        """
        unit_price = 0.0
        for yield_data in item.resources:
            resource = self.resources.get(yield_data.resource_id)
            if resource:
                unit_price += resource.base_price * yield_data.quantity

        total_quantity = sum(line.subtotal for line in item.measurement_lines)

        # Create a copy with updated calculated fields
        updated_item = item.model_copy(update={
            "calculated_unit_price": unit_price,
            "calculated_quantity": total_quantity
        })
        return updated_item

    def calculate_project(
        self, budget: ProjectBudget, chapters: List[Chapter], items: List[BudgetItem]
    ) -> Tuple[ProjectBudget, List[Chapter], List[BudgetItem]]:
        """
        Calculates the full WBS hierarchy.
        Returns updated copies of the budget, chapters, and items.
        """
        calculated_items = [self.calculate_item(item) for item in items]

        calculated_chapters = []
        for chapter in chapters:
            chapter_cost = sum(
                item.total_cost for item in calculated_items if item.chapter_id == chapter.id
            )
            # Add costs from sub-chapters if necessary
            # (Assuming a flat list of chapters for now, where nested chapters roll up)
            calculated_chapters.append(
                chapter.model_copy(update={"total_cost": chapter_cost})
            )

        # In a deep hierarchy, we would recursively calculate chapter costs.
        # For simplicity, project cost is the sum of all item costs.
        total_project_cost = sum(item.total_cost for item in calculated_items)
        calculated_budget = budget.model_copy(update={"total_cost": total_project_cost})

        return calculated_budget, calculated_chapters, calculated_items
