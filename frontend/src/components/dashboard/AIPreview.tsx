import { Fragment, useState } from 'react';
import { saveBudget } from '../../services/api';
import type { BudgetItem } from '../../services/api';

interface AIPreviewProps {
  items: BudgetItem[];
  onClear: () => void;
}

export const AIPreview: React.FC<AIPreviewProps> = ({ items, onClear }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [validatedCodes, setValidatedCodes] = useState<string[]>([]);

  // Toggle validation state of an item
  const toggleValidate = (code: string) => {
    if (validatedCodes.includes(code)) {
      setValidatedCodes(validatedCodes.filter(c => c !== code));
    } else {
      setValidatedCodes([...validatedCodes, code]);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    
    // Save items with their validation status updated
    const itemsToSave = items.map(item => ({
      ...item,
      status: validatedCodes.includes(item.code) || item.status === 'Validado' ? 'Validado' : 'Pendiente AI'
    }));

    const success = await saveBudget(itemsToSave);
    setIsSaving(false);
    
    if (success) {
      alert("Presupuesto guardado con éxito en Firestore.");
      onClear();
    } else {
      alert("Hubo un error al guardar el presupuesto.");
    }
  };

  // Group items by category
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
        <h3 className="text-title-sm font-title-sm text-on-surface">Mediciones Capturadas (AI Preview)</h3>
        <div className="flex gap-sm">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-xs bg-secondary text-on-secondary px-md py-sm rounded-lg hover:opacity-90 transition-all shadow-sm font-bold ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="save">save</span>
            <span className="text-label-md font-label-md">{isSaving ? 'GUARDANDO...' : 'ACEPTAR Y GUARDAR'}</span>
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
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Código</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción del Elemento</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right">Cant.</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Ud.</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-center">Acción</th>
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
                      const isValidated = validatedCodes.includes(item.code) || item.status === 'Validado';
                      return (
                        <tr key={itemIdx} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-md py-sm font-numeric-data text-primary pl-lg">↳ {item.code}</td>
                          <td className="px-md py-sm text-body-md">{item.description}</td>
                          <td className="px-md py-sm text-right font-numeric-data">{item.qty.toFixed(2)}</td>
                          <td className="px-md py-sm font-numeric-data text-on-surface-variant">{item.unit}</td>
                          <td className="px-md py-sm">
                            <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-md font-label-md ${isValidated ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isValidated ? 'bg-green-500' : 'bg-orange-500'}`}></span> {isValidated ? 'Validado' : 'Pendiente AI'}
                            </span>
                          </td>
                          <td className="px-md py-sm text-center">
                            <button 
                              onClick={() => toggleValidate(item.code)}
                              className={`px-sm py-xs rounded text-label-md font-label-md border ${isValidated ? 'border-outline text-on-surface-variant hover:bg-surface-container' : 'border-green-600 text-green-700 hover:bg-green-50'}`}
                            >
                              {isValidated ? 'REVERTIR' : 'VALIDAR'}
                            </button>
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
    </section>
  );
};
