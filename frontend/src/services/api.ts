const API_BASE_URL = 'http://127.0.0.1:8000'; // TODO: make dynamic based on env

export interface BudgetItem {
  code: string;
  description: string;
  qty: number;
  unit: string;
  status: string;
  category: string;
}

export const saveBudget = async (items: BudgetItem[]): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/budget/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save budget items');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving budget:', error);
    return false;
  }
};
