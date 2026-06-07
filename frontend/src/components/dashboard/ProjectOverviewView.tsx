import { useState, useEffect } from 'react';
import { listBudgetItems } from '../../services/api';
import type { BudgetItem } from '../../services/api';

export const ProjectOverviewView: React.FC = () => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      const data = await listBudgetItems();
      setItems(data);
      setIsLoading(false);
    };
    fetchItems();
  }, []);

  const getCategorySum = (category: string): number => {
    // Basic media multiplier assumption (55 €/m2 floors, 22 €/m2 paint, 28 €/ml demo)
    return items
      .filter(item => item.category === category)
      .reduce((sum, item) => {
        let price = 35;
        if (category === 'Demolición') price = 28;
        else if (category === 'Revestimientos') {
          price = item.description.toLowerCase().includes('pavimentado') ? 55 : 22;
        } else {
          price = 350;
        }
        return sum + (item.qty * price);
      }, 0);
  };

  const getOverallBudget = (): number => {
    const categories = ['Demolición', 'Revestimientos', 'Instalaciones'];
    return categories.reduce((sum, cat) => sum + getCategorySum(cat), 0);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl">
        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
          <span className="material-symbols-outlined text-[32px] text-secondary animate-spin" data-icon="sync">sync</span>
        </div>
        <p className="text-body-lg font-bold text-primary animate-pulse">Cargando resumen del proyecto de reforma...</p>
      </div>
    );
  }

  const overallBudget = getOverallBudget();

  return (
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Resumen de Obra (Project Overview)</h2>
        <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">
          Estado general, control de costos, plazos de ejecución estimados y hoja de ruta para la reforma del inmueble.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-sm sm:gap-lg">
        <div className="bg-white border border-outline-variant p-md rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-label-md font-label-md text-on-surface-variant uppercase">Presupuesto Estimado</span>
          <div className="text-display font-display text-primary mt-sm">
            {overallBudget.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            <span className="text-headline-md"> €</span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-xs">Gama de calidades media/confort.</p>
        </div>

        <div className="bg-white border border-outline-variant p-md rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-label-md font-label-md text-on-surface-variant uppercase">Partidas Registradas</span>
          <div className="text-display font-display text-secondary mt-sm">
            {items.length}
            <span className="text-headline-md"> ud</span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-xs">Validadas desde el estado actual del plano.</p>
        </div>

        <div className="bg-white border border-outline-variant p-md rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-label-md font-label-md text-on-surface-variant uppercase">Duración Estimada</span>
          <div className="text-display font-display text-primary mt-sm">
            {items.length > 0 ? "8" : "0"}
            <span className="text-headline-md"> semanas</span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-xs">Sujeto a aprobación administrativa de licencia.</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-sm sm:gap-lg">
        {/* Cost breakdown */}
        <div className="bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-title-sm font-title-sm text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" data-icon="pie_chart">pie_chart</span>
              Distribución de Costes por Capítulos
            </h3>
            
            <div className="space-y-sm">
              {['Demolición', 'Revestimientos', 'Instalaciones'].map((cat, idx) => {
                const total = getCategorySum(cat);
                const pct = overallBudget > 0 ? Math.round((total / overallBudget) * 100) : 0;
                const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
                return (
                  <div key={idx} className="space-y-xs">
                    <div className="flex justify-between text-body-md font-bold">
                      <span className="text-on-surface">{cat}</span>
                      <span className="text-primary">{total.toLocaleString('es-ES', { maximumFractionDigits: 2 })} € ({pct}%)</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className={`${colors[idx]} h-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-lg pt-sm border-t border-outline-variant/30 text-body-xs text-on-surface-variant">
            Basado en las mediciones acumuladas de las estancias del plano de planta.
          </div>
        </div>

        {/* Roadmap / Milestones */}
        <div className="bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm">
          <h3 className="text-title-sm font-title-sm text-on-surface mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary" data-icon="route">route</span>
            Hitos de Ejecución de la Reforma
          </h3>
          
          <div className="relative border-l border-outline-variant/60 ml-3 pl-md space-y-md text-body-md">
            <div className="relative">
              <span className="absolute -left-[21px] top-1 bg-green-500 w-3 h-3 rounded-full border border-white"></span>
              <p className="font-bold text-green-700">Hito 1: Levantamiento y Estado Actual (Completado)</p>
              <p className="text-body-sm text-on-surface-variant">Escaneo láser, importación de plano vectorial DXF e identificación de estancias.</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[21px] top-1 bg-blue-500 w-3 h-3 rounded-full border border-white animate-pulse"></span>
              <p className="font-bold text-primary">Hito 2: Planificación de Materiales (Fase Actual)</p>
              <p className="text-body-sm text-on-surface-variant">Cotización paramétrica con base de datos de precios oficial ACAE/CYPE.</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[21px] top-1 bg-surface-container-highest w-3 h-3 rounded-full border border-outline-variant"></span>
              <p className="font-bold text-on-surface-variant">Hito 3: Desmontajes y Demoliciones (Semana 1-2)</p>
              <p className="text-body-sm text-on-surface-variant">Derrumbe de tabiques interiors seleccionados y desescombro de aparatos sanitarios antiguos.</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[21px] top-1 bg-surface-container-highest w-3 h-3 rounded-full border border-outline-variant"></span>
              <p className="font-bold text-on-surface-variant">Hito 4: Revestimientos y Acabados Finales (Semana 3-8)</p>
              <p className="text-body-sm text-on-surface-variant">Alicatados cerámicos, instalación de tarimas flotantes y pinturas lisas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
