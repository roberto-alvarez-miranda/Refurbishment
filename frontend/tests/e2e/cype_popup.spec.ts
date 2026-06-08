import { test, expect } from '@playwright/test';
import { Buffer } from 'buffer';

test.describe('CYPE Parametric Quality Selector & AI Material Specifier', () => {
  test('should open Popup Modal, conmute CYPE dropdowns, query CYPE endpoint, and search materials with AI', async ({ page }) => {
    
    // Intercept GCS Upload
    await page.route('**/upload-asset', async (route) => {
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dwellings: [
            {
              name: 'Vivienda 5',
              total_area_m2: 109.98,
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
                  proposed_materials: ['Porcelánico']
                }
              ],
              exterior_walls_ml: 28.5
            }
          ],
          general_notes: 'Plano test'
        }),
      });
    });

    // Intercept CYPE Lookup Endpoint
    await page.route('**/api/budget/cype-lookup*', async (route) => {
      const url = new URL(route.request().url());
      const code = url.searchParams.get('code');

      if (code === 'REV010_1_0_0_0_0_0') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'REV010_1_0_0_0_0_0',
            unit: 'm2',
            price: 18.50,
            description: 'Alicatado de paredes con mortero de cemento, de hasta 10 cm (Manual).'
          }),
        });
      } else if (code === 'REV010_2_0_0_0_0_0') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'REV010_2_0_0_0_0_0',
            unit: 'm2',
            price: 24.80,
            description: 'Alicatado de paredes con mortero de cemento, de 10 a 20 cm (Manual).'
          }),
        });
      } else {
        // Generics
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: code,
            unit: 'm2',
            price: 18.50,
            description: 'Revestimiento de paredes con material cerámico.'
          }),
        });
      }
    });

    // Intercept AI Material Specifier Endpoint
    await page.route('**/api/ai/specifier', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'MARAZZI-PORC-01',
          description: 'Porcelánico Rectificado Marazzi 60x60 cm, gran formato.',
          price: 45.00,
          unit: 'm2',
          source: 'ACAE / Marazzi Official Catalog'
        }),
      });
    });

    // 1. Navigate to the page
    await page.goto('/');

    // 2. Verify modal is NOT visible by default
    await expect(page.locator('text=Configurar Partida CYPE (Zoom)')).not.toBeVisible();

    // 3. Simulate file upload to trigger table rows rendering
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=SELECCIONAR ARCHIVO').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'cocina_test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data'),
    });

    // STEP 3.5: Click "COMPILAR PRESUPUESTO OPTIMIZADO" inside the Refinement Panel!
    const compileButton = page.locator('text=COMPILAR PRESUPUESTO OPTIMIZADO');
    await expect(compileButton).toBeVisible();
    await compileButton.click();

    // Wait for the table rows to be visible - click on coatings physical entity to enable material search!
    const itemCell = page.locator('text=↳ ENT-A01');
    await expect(itemCell).toBeVisible();
    await itemCell.click();

    // Assert CYPE Popup Modal is now visible
    await expect(page.locator('text=Configurar Partida CYPE (Zoom)')).toBeVisible();

    // Conmute selectable province
    const provinceSelect = page.locator('select#cype-province');
    await provinceSelect.selectOption('madrid');

    // Conmute revestimiento type dropdown from 'Solado' to 'Alicatado' (Suffix '2')
    const revestimientoSelect = page.locator('select#cype-param-revestimiento');
    await revestimientoSelect.selectOption('2');

    // Assert that the description and price are updated from CYPE API response
    await expect(page.locator('text=Alicatado de paredes con mortero de cemento').first()).toBeVisible();
    await expect(page.locator('text=24.80').first()).toBeVisible();

    // Search for a commercial material inside the modal
    const searchInput = page.locator('input[placeholder="Buscar material comercial..."]');
    await searchInput.fill('Marazzi Porcelánico');
    await page.locator('text=BUSCAR MATERIAL').click();

    // Assert that the commercial material details are displayed
    await expect(page.locator('text=Porcelánico Rectificado Marazzi')).toBeVisible();
    
    // Assert combined price (CYPE placement + ACAE material) is rendered
    // Colocación: 24.80 + Material: 45.00 = 69.80 €/m²
    await expect(page.locator('text=69.80').first()).toBeVisible();

    // Confirm quality parameters
    await page.locator('text=APLICAR CAMBIOS').click();

    // Assert modal is closed
    await expect(page.locator('text=Configurar Partida CYPE (Zoom)')).not.toBeVisible();
  });
});
