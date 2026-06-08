import { Fragment, useState, useEffect } from 'react';
import { saveBudget } from '../../services/api';
import type { BudgetItem } from '../../services/api';
import { CypeParameterPopup } from './CypeParameterPopup';

interface AIPreviewProps {
  items: BudgetItem[];
  onClear: () => void;
}

export const AIPreview: React.FC<AIPreviewProps> = ({ items: initialItems, onClear }) => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validatedCodes, setValidatedCodes] = useState<string[]>([]);
  const [activePopupItem, setActivePopupItem] = useState<BudgetItem | null>(null);

  // Sync state with parent props
  useEffect(() => {
    setItems(initialItems);
    // Automatically pre-validate all items by default for easier user experience
    setValidatedCodes(initialItems.map(item => item.code));
  }, [initialItems]);

  const handleCellEdit = (code: string, field: keyof BudgetItem, value: string | number) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.code === code) {
          return {
            ...item,
            [field]: field === 'qty' ? Number(value) : value
          };
        }
        return item;
      })
    );
  };

  const toggleValidate = (code: string) => {
    if (validatedCodes.includes(code)) {
      setValidatedCodes(validatedCodes.filter(c => c !== code));
    } else {
      setValidatedCodes([...validatedCodes, code]);
    }
  };

  const handleSave = async () => {
    const itemsToSave = items.filter(item => validatedCodes.includes(item.code));
    if (itemsToSave.length === 0) {
      alert("Por favor, selecciona o valida al menos una partida para guardar.");
      return;
    }
    
    setIsSaving(true);
    
    // Set status to Validated for the items we are saving
    const finalizedItems = itemsToSave.map(item => ({
      ...item,
      status: 'Validado'
    }));

    const success = await saveBudget(finalizedItems);
    setIsSaving(false);
    
    if (success) {
      alert(`¡Éxito! Se han guardado ${finalizedItems.length} partidas validadas en Firestore.`);
      onClear();
    } else {
      alert("Hubo un error al guardar el presupuesto.");
    }
  };

  const categories = Array.from(new Set(items.map(item => item.category)));

  if (items.length === 0) {
    return (
      <div className="bg-white border border-outline-variant rounded-xl p-xl text-center shadow-sm">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm" data-icon="table_chart">table_chart</span>
        <h3 className="text-title-sm font-title-sm text-on-surface">No hay mediciones extraídas</h3>
        <p className="text-body-md font-body-md text-on-surface-variant mt-xs max-w-md mx-auto">
          Arrastre o seleccione un plano en la zona de escaneo superior para iniciar el análisis automático con Inteligencia Artificial.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-md">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-title-sm font-title-sm text-on-surface">Mediciones Capturadas (AI Preview)</h3>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Puedes dar clic directamente en los textos para editar descripciones, cantidades y unidades antes de validar y guardar.</p>
        </div>
        <div className="flex gap-sm">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-xs bg-secondary text-on-secondary px-md py-sm rounded-lg hover:opacity-90 transition-all shadow-sm font-bold ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="save">save</span>
            <span className="text-label-md font-label-md">{isSaving ? 'GUARDANDO...' : 'ACEPTAR Y PASAR A PRESUPUESTO'}</span>
          </button>
          <button 
            onClick={onClear}
            className="flex items-center gap-xs border border-outline text-primary px-md py-sm rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="clear">clear</span>
            <span className="text-label-md font-label-md">DESCARTAR</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16 text-center">Validar</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Código</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción del Elemento (Editable)</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right w-24">Cant. (Edit)</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-24">Ud. (Edit)</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {categories.map((category, groupIdx) => {
                const categoryItems = items.filter(item => item.category === category);
                return (
                  <Fragment key={groupIdx}>
                    {/* Group Header (Tipo de Partida) */}
                    <tr className="bg-surface-container-highest">
                      <td colSpan={6} className="px-md py-sm font-bold text-on-surface">
                        {category}
                      </td>
                    </tr>
                    {/* Items within the group */}
                    {categoryItems.map((item, itemIdx) => {
                      const isValidated = validatedCodes.includes(item.code);
                      return (
                        <tr key={itemIdx} className={`hover:bg-surface-container-low transition-colors group ${isValidated ? '' : 'opacity-60'}`}>
                          {/* Checkbox selector */}
                          <td className="px-md py-sm text-center">
                            <input 
                              type="checkbox" 
                              checked={isValidated} 
                              onChange={() => toggleValidate(item.code)}
                              className="w-4 h-4 text-secondary border-outline-variant rounded focus:ring-secondary cursor-pointer"
                            />
                          </td>
                          <td 
                            onClick={() => setActivePopupItem(item)}
                            className="px-md py-sm font-numeric-data text-primary cursor-pointer hover:underline"
                            title="Configurar calidades de CYPE (Zoom)"
                          >
                            ↳ {item.code}
                          </td>
                          {/* Editable Description */}
                          <td className="px-md py-sm">
                            <input 
                              type="text" 
                              value={item.description}
                              onChange={(e) => handleCellEdit(item.code, 'description', e.target.value)}
                              className="w-full bg-transparent border-0 focus:border-b focus:border-secondary focus:ring-0 p-0 text-body-md text-on-surface select-all"
                            />
                          </td>
                          {/* Editable Quantity */}
                          <td className="px-md py-sm text-right">
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.qty}
                              onChange={(e) => handleCellEdit(item.code, 'qty', e.target.value)}
                              className="w-20 bg-transparent border-0 focus:border-b focus:border-secondary focus:ring-0 p-0 text-right font-numeric-data text-primary select-all"
                            />
                          </td>
                          {/* Editable Unit */}
                          <td className="px-md py-sm">
                            <input 
                              type="text" 
                              value={item.unit}
                              onChange={(e) => handleCellEdit(item.code, 'unit', e.target.value)}
                              className="w-16 bg-transparent border-0 focus:border-b focus:border-secondary focus:ring-0 p-0 font-numeric-data text-on-surface-variant select-all"
                            />
                          </td>
                          <td className="px-md py-sm">
                            <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-md font-label-md ${isValidated ? 'bg-green-100 text-green-800' : 'bg-outline-variant text-on-surface-variant'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isValidated ? 'bg-green-500' : 'bg-outline'}`}></span> {isValidated ? 'Aceptada' : 'Excluida'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {activePopupItem && (
        <CypeParameterPopup 
          item={activePopupItem}
          onClose={() => setActivePopupItem(null)}
          onApply={(updatedDesc, _updatedPrice) => {
            handleCellEdit(activePopupItem.code, 'description', updatedDesc);
            setActivePopupItem(null);
          }}
        />
      )}
    </section>
  );
};
