import { test, expect } from '@playwright/test';
import { Buffer } from 'buffer';

test.describe('Core Renovation Workflow E2E', () => {
  test('should allow a user to upload a plan, see AI-extracted preview, and save it', async ({ page }) => {
    // Intercept GCS Upload (Original correct path!)
    await page.route('**/upload-asset', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          filename: 'cocina_test.jpg',
          gcs_uri: 'gs://app-reformia-refurbishment-assets/cocina_test.jpg',
        }),
      });
    });

    // Intercept Gemini Parsing Preview
    await page.route('**/api/ai/preview', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dwellings: [
            {
              name: 'Vivienda A',
              total_area_m2: 59.80,
              estancias: [
                {
                  type: 'cocina',
                  name: 'Cocina',
                  area_m2: 8.50,
                  perimeter_m: 11.20,
                  height_m: 2.65,
                  tabiques: [
                    { label: 'Tabique divisorio con Salón', length_m: 4.10, height_m: 2.65, area_m2: 10.86, material: 'Ladrillo' }
                  ],
                  sanitarios: [
                    { type: 'fregadero', count: 1, action: 'retirar' }
                  ],
                  proposed_materials: ['Suelo porcelánico gris']
                }
              ],
              exterior_walls_ml: 24.10
            }
          ],
          general_notes: 'Retirada de falsos techos'
        }),
      });
    });

    // Intercept Save Budget
    await page.route('**/api/budget/save', async (route) => {
      expect(route.request().method()).toBe('POST');
      const payload = route.request().postDataJSON();
      // Ensure mapped items exist
      expect(payload.items.length).toBeGreaterThan(0);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', saved_count: payload.items.length }),
      });
    });

    // 1. Navigate to the page
    await page.goto('/');

    // 2. Verify static UI elements
    await expect(page.locator('h1')).toContainText('Reformia — Gestor de Reformas');
    await expect(page.locator('text=No hay mediciones extraídas')).toBeVisible();

    // 3. Simulate file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=SELECCIONAR ARCHIVO').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'cocina_test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data'),
    });

    // 4. Wait for AI parsing to complete and render results
    await expect(page.locator('text=Mediciones Capturadas (AI Preview)')).toBeVisible();
    
    // Assert against the editable input value directly (since text lives in the value attribute!)
    const descriptionInput = page.locator('input[value="Pavimentado con Suelo porcelánico gris en Cocina"]');
    await expect(descriptionInput).toBeVisible();

    // 5. Click Accept & Save and wait for the alert dialog to show
    const saveButton = page.locator('text=ACEPTAR Y PASAR A PRESUPUESTO');
    await expect(saveButton).toBeVisible();
    
    const dialogPromise = page.waitForEvent('dialog');
    await saveButton.click();
    const dialog = await dialogPromise;
    
    // 6. Assert that the alert dialog is correct and dismiss it
    expect(dialog.message()).toContain('Se han guardado');
    expect(dialog.message()).toContain('partidas validadas en Firestore');
    await dialog.accept();
  });
});
