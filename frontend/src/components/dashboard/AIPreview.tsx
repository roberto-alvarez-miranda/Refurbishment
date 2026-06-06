import { Fragment, useState } from 'react';
import { saveBudget, BudgetItem } from '../../services/api';

// Mock data to simulate AI extracted results grouped by "tipo de partida"
const extractedData = [
  {
    category: 'Demolición',
    items: [
      { code: 'DEM-001', description: 'Muro de tabiquería de ladrillo hueco doble (10cm)', qty: 42.50, unit: 'm²', status: 'Validado' },
      { code: 'DEM-002', description: 'Levantado de carpintería interior de madera', qty: 8.00, unit: 'ud', status: 'Validado' },
    ]
  },
  {
    category: 'Revestimientos',
    items: [
      { code: 'REV-001', description: 'Picado de revoco de yeso en techos', qty: 94.20, unit: 'm²', status: 'Pendiente AI' },
    ]
  },
  {
    category: 'Instalaciones',
    items: [
      { code: 'INS-001', description: 'Retirada de tuberías de plomo (Instalación antigua)', qty: 1.00, unit: 'ud', status: 'Pendiente AI' },
    ]
  }
];

export const AIPreview: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Flatten the data
    const flatItems: BudgetItem[] = [];
    extractedData.forEach(group => {
      group.items.forEach(item => {
        flatItems.push({
          category: group.category,
          ...item
        });
      });
    });

    const success = await saveBudget(flatItems);
    setIsSaving(false);
    
    if (success) {
      alert("Presupuesto guardado con éxito.");
    } else {
      alert("Hubo un error al guardar el presupuesto.");
    }
  };

  return (
    <section className="space-y-md">
      <div className="flex justify-between items-center">
        <h3 className="text-title-sm font-title-sm text-on-surface">Mediciones Capturadas (AI Preview)</h3>
        <div className="flex gap-sm">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-xs text-secondary hover:bg-surface-container px-sm py-xs rounded transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="save">save</span>
            <span className="text-label-md font-label-md">{isSaving ? 'GUARDANDO...' : 'GUARDAR PRESUPUESTO'}</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Categoría / Código</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción del Elemento</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right">Cant.</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Ud.</th>
                <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {extractedData.map((group, groupIdx) => (
                <Fragment key={groupIdx}>
                  {/* Group Header (Tipo de Partida) */}
                  <tr className="bg-surface-container-highest">
                    <td colSpan={5} className="px-md py-sm font-bold text-on-surface">
                      {group.category}
                    </td>
                  </tr>
                  {/* Items within the group (Tree view logic can be expanded here) */}
                  {group.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-md py-sm font-numeric-data text-primary pl-lg">↳ {item.code}</td>
                      <td className="px-md py-sm text-body-md">{item.description}</td>
                      <td className="px-md py-sm text-right font-numeric-data">{item.qty.toFixed(2)}</td>
                      <td className="px-md py-sm font-numeric-data text-on-surface-variant">{item.unit}</td>
                      <td className="px-md py-sm">
                        <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-md font-label-md ${item.status === 'Validado' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Validado' ? 'bg-green-500' : 'bg-orange-500'}`}></span> {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
