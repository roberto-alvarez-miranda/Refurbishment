import { test, expect } from '@playwright/test';
import { Buffer } from 'buffer';

test.describe('Core Renovation Workflow E2E', () => {
  test('should allow a user to upload a plan, see AI-extracted preview, and save it', async ({ page }) => {
    // Intercept GCS Upload
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
          rooms: [
            {
              name: 'Cocina',
              length: 4.0,
              width: 3.0,
              height: 2.5,
              materials: [
                { type: 'floor', name: 'Suelo porcelánico gris', confidence: 0.95 }
              ]
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
    await expect(page.locator('text=Suministro e instalación de pavimento (Suelo porcelánico gris) en Cocina')).toBeVisible();

    // 5. Click Accept & Save and wait for the alert dialog to show
    const saveButton = page.locator('text=ACEPTAR Y GUARDAR');
    await expect(saveButton).toBeVisible();
    
    const dialogPromise = page.waitForEvent('dialog');
    await saveButton.click();
    const dialog = await dialogPromise;
    
    // 6. Assert that the alert dialog is correct and dismiss it
    expect(dialog.message()).toBe('Presupuesto guardado con éxito en Firestore.');
    await dialog.accept();
  });
});
