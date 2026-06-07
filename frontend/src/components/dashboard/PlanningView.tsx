import { useState, useEffect } from 'react';
import { listBudgetItems } from '../../services/api';
import type { BudgetItem } from '../../services/api';

type QualityLevel = 'básica' | 'media' | 'premium';

const QUALITY_MULTIPLIERS: Record<QualityLevel, { multiplier: number; label: string; pricePerUnitFloor: number; pricePerUnitPaint: number; pricePerUnitDemo: number }> = {
  'básica': { multiplier: 0.8, label: 'Económica / Funcional', pricePerUnitFloor: 25, pricePerUnitPaint: 12, pricePerUnitDemo: 18 },
  'media': { multiplier: 1.0, label: 'Calidad Media / Confort', pricePerUnitFloor: 55, pricePerUnitPaint: 22, pricePerUnitDemo: 28 },
  'premium': { multiplier: 1.6, label: 'Gama Alta / Lujo', pricePerUnitFloor: 110, pricePerUnitPaint: 45, pricePerUnitDemo: 48 }
};

export const PlanningView: React.FC = () => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quality, setQuality] = useState<QualityLevel>('media');

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      const data = await listBudgetItems();
      setItems(data);
      setIsLoading(false);
    };
    fetchItems();
  }, []);

  const calculateItemPrice = (item: BudgetItem): { unitPrice: number; total: number } => {
    const conf = QUALITY_MULTIPLIERS[quality];
    let unitPrice = 0;

    if (item.category === 'Demolición') {
      unitPrice = conf.pricePerUnitDemo;
    } else if (item.category === 'Revestimientos') {
      if (item.description.toLowerCase().includes('pavimentado') || item.description.toLowerCase().includes('pavimento')) {
        unitPrice = conf.pricePerUnitFloor;
      } else {
        unitPrice = conf.pricePerUnitPaint;
      }
    } else {
      // Installations or others
      unitPrice = item.unit === 'ml' ? 45 : 350;
    }

    // Apply multiplier
    unitPrice = parseFloat(unitPrice.toFixed(2));
    const total = parseFloat((item.qty * unitPrice).toFixed(2));

    return { unitPrice, total };
  };

  const getProjectTotal = (): number => {
    return items.reduce((sum, item) => sum + calculateItemPrice(item).total, 0);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl">
        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
          <span className="material-symbols-outlined text-[32px] text-secondary animate-spin" data-icon="sync">sync</span>
        </div>
        <p className="text-body-lg font-bold text-primary animate-pulse">Cargando mediciones validadas desde Firestore...</p>
      </div>
    );
  }

  const projectTotal = getProjectTotal();

  return (
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* View Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-sm sm:gap-md">
        <div>
          <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Planificación y Ajuste de Calidades</h2>
          <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">
            Ajusta los niveles de acabados del proyecto y visualiza el impacto inmediato en el presupuesto final paramétrico.
          </p>
        </div>
      </div>

      {/* Quality Level Selector Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-sm sm:gap-lg">
        {/* Selector Card */}
        <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-md sm:p-lg flex flex-col justify-between">
          <div>
            <h3 className="text-title-sm font-title-sm text-on-surface mb-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" data-icon="tune">tune</span>
              Nivel de Acabados (Calidades)
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-md">
              Selecciona una gama de calidades para actualizar automáticamente los precios unitarios de solados, pinturas, alicatados y demoliciones.
            </p>
            
            <div className="grid grid-cols-3 gap-sm sm:gap-md">
              {(['básica', 'media', 'premium'] as QualityLevel[]).map((level) => {
                const isActive = quality === level;
                return (
                  <button
                    key={level}
                    onClick={() => setQuality(level)}
                    className={`p-sm sm:p-md rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-secondary-container border-secondary text-on-secondary-container shadow-md scale-102 font-bold' 
                        : 'bg-white border-outline-variant hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <span className="text-body-md sm:text-title-xs uppercase font-bold tracking-wider">{level}</span>
                    <span className="text-body-xs font-body-xs text-center mt-xs opacity-80">{QUALITY_MULTIPLIERS[level].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-md border-t border-outline-variant/30 pt-md grid grid-cols-1 sm:grid-cols-3 gap-sm text-body-xs sm:text-body-sm text-on-surface-variant">
            <div>
              <span className="font-bold text-primary">Suelo/Solado:</span> {QUALITY_MULTIPLIERS[quality].pricePerUnitFloor} €/m²
            </div>
            <div>
              <span className="font-bold text-primary">Pinturas/Lisas:</span> {QUALITY_MULTIPLIERS[quality].pricePerUnitPaint} €/m²
            </div>
            <div>
              <span className="font-bold text-primary">Tabiques/Derribo:</span> {QUALITY_MULTIPLIERS[quality].pricePerUnitDemo} €/ml
            </div>
          </div>
        </div>

        {/* Budget KPI Card */}
        <div className="lg:col-span-4 bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant tracking-wider uppercase">PRESUPUESTO TOTAL ESTIMADO</span>
            <div className="text-headline-lg sm:text-display font-display text-primary mt-sm">
              {projectTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-title-sm sm:text-headline-md font-headline-md"> €</span>
            </div>
            <p className="text-body-xs text-on-surface-variant mt-xs">
              Suma de todas las partidas de la vivienda validadas e indexadas en la base de datos de CYPE/Presto.
            </p>
          </div>
          
          <div className="mt-md pt-sm border-t border-outline-variant/30 flex items-center gap-xs text-body-xs text-green-700 font-bold">
            <span className="material-symbols-outlined text-[16px]" data-icon="shield">shield</span>
            Cálculo paramétrico oficial (Nov 2025)
          </div>
        </div>
      </div>

      {/* Budget Detailed Items Table */}
      {items.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm" data-icon="inventory_2">inventory_2</span>
          <h3 className="text-title-sm font-title-sm text-on-surface">No hay partidas validadas</h3>
          <p className="text-body-md font-body-md text-on-surface-variant mt-xs max-w-md mx-auto">
            Por favor, regresa a la pestaña "Estado Actual" e importa o valida tu presupuesto para comenzar a planificar.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16 text-center">Nº</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Código</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción de Partida</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right w-24">Cantidad</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16">Ud.</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right w-28">P. Unitario</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-right w-32">Importe (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-md">
                {items.map((item, idx) => {
                  const pricing = calculateItemPrice(item);
                  return (
                    <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-sm text-center text-on-surface-variant font-numeric-data">{idx + 1}</td>
                      <td className="px-md py-sm font-numeric-data text-primary font-bold">↳ {item.code}</td>
                      <td className="px-md py-sm text-on-surface">{item.description}</td>
                      <td className="px-md py-sm text-right font-numeric-data">{item.qty.toFixed(2)}</td>
                      <td className="px-md py-sm text-on-surface-variant font-numeric-data">{item.unit}</td>
                      <td className="px-md py-sm text-right font-numeric-data text-on-surface-variant">{pricing.unitPrice.toFixed(2)} €</td>
                      <td className="px-md py-sm text-right font-numeric-data text-primary font-bold">{pricing.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
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
