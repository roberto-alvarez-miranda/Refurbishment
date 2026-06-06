const API_BASE_URL = 'http://127.0.0.1:8000'; // Target local FastAPI backend

export interface BudgetItem {
  code: string;
  description: string;
  qty: number;
  unit: string;
  status: string;
  category: string;
}

export interface MaterialAnnotation {
  type: string;
  name: string;
  confidence: number;
}

export interface Wall {
  length: number;
  height: number;
  materials: MaterialAnnotation[];
}

export interface Window {
  width: number;
  height: number;
  materials: MaterialAnnotation[];
}

export interface Room {
  name: string;
  length: number;
  width: number;
  height: number;
  walls: Wall[];
  windows: Window[];
  materials: MaterialAnnotation[];
}

export interface ExtractedPlan {
  rooms: Room[];
  general_notes?: string;
}

// 1. Upload file to backend
export const uploadAsset = async (file: File): Promise<{ filename: string; gcs_uri: string } | null> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload-asset`, {
      method: 'POST',
      body: formData,
      // Firebase auth token would be passed here in production headers: { 'Authorization': 'Bearer ...' }
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
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
    const response = await fetch(`${API_BASE_URL}/api/ai/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gcs_uri: gcsUri, mime_type: mimeType }),
    });

    if (!response.ok) {
      throw new Error(`AI Preview failed with status: ${response.status}`);
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
