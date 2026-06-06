import { auth } from './firebase';

const API_BASE_URL = 'https://refurbishment-backend-21328141426.europe-southwest1.run.app'; // Live Google Cloud Run backend

export interface BudgetItem {
  code: string;
  description: string;
  qty: number;
  unit: string;
  status: string;
  category: string;
}

export interface EstanciaSummary {
  type: string;
  area_m2: number;
  perimeter_m: number;
  count: number;
}

export interface Dwelling {
  name: string;
  total_area_m2: number;
  estancias: EstanciaSummary[];
  partition_walls_ml: number;
  exterior_walls_ml: number;
}

export interface ExtractedPlan {
  dwellings: Dwelling[];
  general_notes?: string;
}

// Helper to get authorization headers dynamically from Firebase Auth
const getAuthHeaders = async (baseHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const headers = { ...baseHeaders };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// 1. Upload file to backend
export const uploadAsset = async (file: File): Promise<{ filename: string; gcs_uri: string } | null> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/upload-asset`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.detail || `Upload failed with status: ${response.status}`;
      throw new Error(errMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading asset:', error);
    return null;
  }
};

// 2. Trigger AI preview parsing
export const previewBlueprint = async (gcsUri: string, mimeType: string): Promise<ExtractedPlan | null> => {
  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${API_BASE_URL}/api/ai/preview`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ gcs_uri: gcsUri, mime_type: mimeType }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.detail || `AI Preview failed with status: ${response.status}`;
      throw new Error(errMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting AI preview:', error);
    return null;
  }
};

// 3. Save finalized budget items to Firestore
export const saveBudget = async (items: BudgetItem[]): Promise<boolean> => {
  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${API_BASE_URL}/api/budget/save`, {
      method: 'POST',
      headers: headers,
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
