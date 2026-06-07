import { useState, useEffect } from 'react';
import { listBudgetItems } from '../../services/api';
import type { BudgetItem } from '../../services/api';

export const ExecutionView: React.FC = () => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulation of local state for item progress percentages
  const [progressState, setProgressState] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      const data = await listBudgetItems();
      setItems(data);
      
      // Initialize progress values: 100% for Validated, 0% for Pending, or some mock values for aesthetics!
      const initialProgress: Record<string, number> = {};
      data.forEach(item => {
        if (item.code.startsWith('DEM')) {
          initialProgress[item.code] = 100; // Demolitions are done
        } else if (item.code.startsWith('REV-1')) {
          initialProgress[item.code] = 20;  // Painting in progress
        } else if (item.code.startsWith('REV-0')) {
          initialProgress[item.code] = 40;  // Flooring in progress
        } else {
          initialProgress[item.code] = 0;   // Installation pending
        }
      });
      setProgressState(initialProgress);
      setIsLoading(false);
    };
    fetchItems();
  }, []);

  const handleProgressChange = (code: string, value: number) => {
    setProgressState(prev => ({
      ...prev,
      [code]: value
    }));
  };

  const getCategoryProgress = (category: string): number => {
    const catItems = items.filter(item => item.category === category);
    if (catItems.length === 0) return 0;
    
    const sum = catItems.reduce((acc, item) => acc + (progressState[item.code] || 0), 0);
    return Math.round(sum / catItems.length);
  };

  const getOverallProgress = (): number => {
    if (items.length === 0) return 0;
    const sum = Object.values(progressState).reduce((acc, val) => acc + val, 0);
    return Math.round(sum / items.length);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl">
        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
          <span className="material-symbols-outlined text-[32px] text-secondary animate-spin" data-icon="sync">sync</span>
        </div>
        <p className="text-body-lg font-bold text-primary animate-pulse">Cargando control de obra desde Firestore...</p>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* View Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-sm sm:gap-md">
        <div>
          <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Ejecución y Control de Obra</h2>
          <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">
            Registra y controla el avance porcentual real de cada una de las partidas contratadas del proyecto.
          </p>
        </div>
      </div>

      {/* Execution Tracker Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-sm sm:gap-lg">
        {/* Overall Progress Circle/Card */}
        <div className="bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant tracking-wider uppercase">AVANCE GENERAL DE OBRA</span>
            <div className="flex items-baseline gap-xs mt-sm">
              <span className="text-display font-display text-primary">{overallProgress}</span>
              <span className="text-headline-lg font-headline-lg text-secondary">%</span>
            </div>
            {/* Horizontal overall progress bar */}
            <div className="w-full bg-surface-container rounded-full h-2 mt-md overflow-hidden">
              <div 
                className="bg-secondary h-full transition-all duration-500" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="mt-md pt-sm border-t border-outline-variant/30 flex items-center gap-xs text-body-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary" data-icon="update">update</span>
            Actualizado en vivo hace unos instantes
          </div>
        </div>

        {/* Milestone Cards (Dynamic category progress) */}
        {categories.slice(0, 2).map((cat, idx) => {
          const catProgress = getCategoryProgress(cat);
          return (
            <div key={idx} className="bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant tracking-wider uppercase">AVANCE EN {cat.toUpperCase()}</span>
                <div className="flex items-baseline gap-xs mt-sm">
                  <span className="text-display font-display text-primary">{catProgress}</span>
                  <span className="text-headline-md font-headline-md text-secondary">%</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 mt-md overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${catProgress}%` }}
                  />
                </div>
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant/30 flex items-center gap-xs text-body-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary" data-icon="check_circle">check_circle</span>
                Control de calidad pendiente de firma
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Slider Table */}
      {items.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm" data-icon="construction">construction</span>
          <h3 className="text-title-sm font-title-sm text-on-surface">No hay obra en ejecución</h3>
          <p className="text-body-md font-body-md text-on-surface-variant mt-xs max-w-md mx-auto">
            Vuelve a la pestaña "Estado Actual" para importar y validar mediciones antes de comenzar la ejecución física.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16 text-center">Nº</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Partida</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción del Elemento</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right w-24">Medición</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16">Ud.</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-64 text-center">Avance (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-md">
                {items.map((item, idx) => {
                  const progress = progressState[item.code] || 0;
                  return (
                    <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-sm text-center text-on-surface-variant font-numeric-data">{idx + 1}</td>
                      <td className="px-md py-sm font-numeric-data text-primary font-bold">↳ {item.code}</td>
                      <td className="px-md py-sm text-on-surface">
                        {item.description}
                      </td>
                      <td className="px-md py-sm text-right font-numeric-data">{item.qty.toFixed(2)}</td>
                      <td className="px-md py-sm text-on-surface-variant font-numeric-data">{item.unit}</td>
                      <td className="px-md py-sm">
                        <div className="flex items-center gap-md">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={progress}
                            onChange={(e) => handleProgressChange(item.code, Number(e.target.value))}
                            className="flex-1 accent-secondary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="w-12 text-right font-numeric-data font-bold text-primary">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
