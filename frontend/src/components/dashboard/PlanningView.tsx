import { useState, useEffect } from 'react';
import { listBudgetItems, saveBudget } from '../../services/api';
import type { BudgetItem } from '../../services/api';
import { CypeParameterPopup } from './CypeParameterPopup';

interface CompiledJob {
  code: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  category: string;
}

export const PlanningView: React.FC = () => {
  const [entities, setEntities] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEntity, setActiveEntity] = useState<BudgetItem | null>(null);

  // Local state to store all compiled jobs assigned to entities
  const [compiledJobs, setCompiledJobs] = useState<Record<string, CompiledJob[]>>({});
  const [versionName, setVersionName] = useState('Presupuesto de Calidades G1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchEntities = async () => {
      setIsLoading(true);
      const data = await listBudgetItems();
      // Only keep the pure physical entities (Levantamiento!)
      const physicalEntities = data.filter(item => item.code.startsWith('ENT-'));
      setEntities(physicalEntities);
      
      // Initialize some default baseline jobs so the view looks beautiful and fully populated on first mount!
      const initialJobs: Record<string, CompiledJob[]> = {};
      physicalEntities.forEach(ent => {
        if (ent.code === 'ENT-T01') {
          // Default demo job for the Salon-Kitchen shared wall
          initialJobs[ent.code] = [{
            code: 'DEM-01',
            description: '↳ [CYPE Demolición/Ejecución]: Demolición de partición interior de fábrica de ladrillo cerámico, de hasta 10 cm de espesor, con medios manuales.',
            qty: ent.qty,
            unit: 'm²',
            price: 18.50,
            total: ent.qty * 18.50,
            category: 'Demolición'
          }];
        } else if (ent.code === 'ENT-S01') {
          // Default desmontaje for toilet
          initialJobs[ent.code] = [{
            code: 'DEM-S01',
            description: '↳ [CYPE Desmontaje]: Desmontaje de aparato sanitario (Inodoro), con medios manuales, y transporte a vertedero.',
            qty: ent.qty,
            unit: 'ud',
            price: 8.00,
            total: ent.qty * 8.00,
            category: 'Demolición'
          }];
        } else if (ent.code === 'ENT-A01') {
          // Default tiling for Kitchen floor
          initialJobs[ent.code] = [{
            code: 'REV-01',
            description: '↳ [CYPE Colocación + Material ACAE]: Colocación de Porcelánico Rectificado Marazzi 60x60 cm, gran formato (Suministro y mano de obra para solado cerámico).',
            qty: ent.qty,
            unit: 'm²',
            price: 63.20,
            total: ent.qty * 63.20,
            category: 'Revestimientos'
          }];
        }
      });
      setCompiledJobs(initialJobs);
      setIsLoading(false);
    };
    fetchEntities();
  }, []);

  const handleAssignJob = (entity: BudgetItem, updatedDescription: string, updatedPrice: number) => {
    // Compile a new job item
    const codePrefix = entity.code.startsWith('ENT-T') ? 'DEM' : entity.code.startsWith('ENT-S') ? 'DEM-S' : 'REV';
    const randomId = Math.floor(Math.random() * 90) + 10;
    
    const newJob: CompiledJob = {
      code: `${codePrefix}-${randomId}`,
      description: updatedDescription,
      qty: entity.qty,
      unit: entity.unit,
      price: updatedPrice,
      total: parseFloat((entity.qty * updatedPrice).toFixed(2)),
      category: entity.category === 'Tabiquería de la Vivienda' || entity.category === 'Aparatos Sanitarios Existentes' ? 'Demolición' : 'Revestimientos'
    };

    setCompiledJobs(prev => ({
      ...prev,
      [entity.code]: [...(prev[entity.code] || []), newJob]
    }));
  };

  const handleRemoveJob = (entityCode: string, jobIndex: number) => {
    setCompiledJobs(prev => ({
      ...prev,
      [entityCode]: (prev[entityCode] || []).filter((_, idx) => idx !== jobIndex)
    }));
  };

  const getFlatCompiledList = (): CompiledJob[] => {
    return Object.values(compiledJobs).flat();
  };

  const getProjectTotal = (): number => {
    return getFlatCompiledList().reduce((sum, job) => sum + job.total, 0);
  };

  const handleSaveBudgetVersion = async () => {
    const flatJobs = getFlatCompiledList();
    if (flatJobs.length === 0) {
      alert("Por favor, asigna al menos un trabajo (partida CYPE) a tus unidades físicas antes de guardar.");
      return;
    }

    setIsSaving(true);
    
    // Map CompiledJob into standard Firestore BudgetItem format
    const itemsToSave: BudgetItem[] = flatJobs.map(job => ({
      code: job.code,
      description: `${job.description} [Versión: ${versionName}]`,
      qty: job.qty,
      unit: job.unit,
      status: 'Validado',
      category: job.category
    }));

    // Overwrite the current active budget in Firestore to feed Execution module, and version it!
    const success = await saveBudget(itemsToSave);
    setIsSaving(false);

    if (success) {
      alert(`¡Éxito! Se ha guardado y consolidado la versión "${versionName}" con ${itemsToSave.length} partidas activas de obra en Firestore.`);
    } else {
      alert("Hubo un error al guardar la versión del presupuesto.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl">
        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
          <span className="material-symbols-outlined text-[32px] text-secondary animate-spin" data-icon="sync">sync</span>
        </div>
        <p className="text-body-lg font-bold text-primary animate-pulse">Cargando unidades físicas validadas desde el Levantamiento...</p>
      </div>
    );
  }

  const projectTotal = getProjectTotal();
  const flatJobList = getFlatCompiledList();

  return (
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* View Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-sm sm:gap-md">
        <div>
          <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Paso 2: Planificación de Obras — "¿Cómo Hacerlo?"</h2>
          <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">
            Asigna múltiples trabajos de demolición, construcción, pinturas y alicatados con códigos CYPE e IA a cada elemento físico del levantamiento.
          </p>
        </div>
      </div>

      {/* Planning Board & KPI totals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-sm sm:gap-lg">
        {/* Name and Save Version Card */}
        <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-md sm:p-lg flex flex-col justify-between">
          <div>
            <h3 className="text-title-sm font-title-sm text-on-surface mb-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" data-icon="folder_shared">folder_shared</span>
              Guardar Versión de Presupuesto
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-md">
              Escribe un nombre identificativo para esta combinación de calidades y grábalo en tu base de datos de versiones.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-sm">
              <input 
                type="text" 
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Nombre de la versión (ej. Gama Confort Marazzi)..."
                className="flex-1 border border-outline-variant rounded-lg p-sm text-body-md bg-white focus:outline-none focus:ring-2 focus:ring-secondary select-all"
              />
              <button 
                onClick={handleSaveBudgetVersion}
                disabled={isSaving}
                className="bg-secondary text-on-secondary px-lg py-sm rounded-lg hover:opacity-90 transition-all font-bold shadow-md disabled:opacity-40"
              >
                {isSaving ? 'GUARDANDO...' : 'ACEPTAR Y ENVIAR A EJECUCIÓN'}
              </button>
            </div>
          </div>
        </div>

        {/* Budget KPI Card */}
        <div className="lg:col-span-4 bg-white border border-outline-variant p-md sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant tracking-wider uppercase">PRESUPUESTO ESTIMADO DE OBRA</span>
            <div className="text-headline-lg sm:text-display font-display text-primary mt-sm">
              {projectTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-title-sm sm:text-headline-md font-headline-md"> €</span>
            </div>
            <p className="text-body-xs text-on-surface-variant mt-xs">
              Suma de los precios unitarios oficiales descargados de CYPE fusionados con materiales reales ACAE.
            </p>
          </div>
        </div>
      </div>

      {/* BIM-Style Two Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-sm sm:gap-lg">
        {/* Left Column: List of Physical Entities from Levantamiento */}
        <div className="lg:col-span-6 space-y-md">
          <div className="border border-outline-variant bg-surface-container-low p-sm rounded-xl">
            <h3 className="text-title-xs sm:text-title-sm font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" data-icon="widgets">widgets</span>
              Unidades de Actuación Físicas (Levantamiento)
            </h3>
          </div>

          {entities.length === 0 ? (
            <div className="bg-white border border-outline-variant rounded-xl p-lg text-center shadow-sm text-on-surface-variant">
              No hay levantamiento confirmado.
            </div>
          ) : (
            entities.map((ent, idx) => {
              const entJobs = compiledJobs[ent.code] || [];
              return (
                <div key={idx} className="bg-white border border-outline-variant rounded-xl p-md shadow-sm hover:shadow-md transition-all space-y-sm">
                  {/* Entity Header */}
                  <div className="flex justify-between items-start border-b border-outline-variant/30 pb-xs">
                    <div>
                      <span className="text-label-xs bg-primary/10 text-primary px-sm py-xs rounded font-bold font-numeric-data">{ent.code}</span>
                      <p className="font-bold text-body-md text-on-surface mt-xs">{ent.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-title-xs font-bold font-numeric-data text-secondary">{ent.qty.toFixed(1)}</span>
                      <span className="text-body-xs text-on-surface-variant font-numeric-data"> {ent.unit}</span>
                    </div>
                  </div>

                  {/* Configured Jobs List */}
                  {entJobs.length > 0 && (
                    <div className="space-y-sm pl-sm border-l-2 border-secondary/20">
                      <p className="text-label-xs font-bold text-secondary tracking-wide uppercase">Trabajos de Cosecución Asignados:</p>
                      {entJobs.map((job, jobIdx) => (
                        <div key={jobIdx} className="bg-surface-container-low p-xs rounded-lg border border-outline-variant/10 flex justify-between items-start gap-sm">
                          <div className="space-y-xs flex-1">
                            <p className="text-body-sm font-bold text-primary">↳ {job.code}</p>
                            <p className="text-body-xs text-on-surface italic">"{job.description}"</p>
                            <p className="text-body-xs text-on-surface-variant font-bold">Precio base CYPE + Material: {job.price.toFixed(2)} €/{job.unit}</p>
                          </div>
                          <div className="text-right flex flex-col justify-between items-end h-full">
                            <button 
                              onClick={() => handleRemoveJob(ent.code, jobIdx)}
                              className="text-error hover:opacity-85 text-body-xs transition-colors p-xs"
                              title="Eliminar trabajo"
                            >
                              <span className="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
                            </button>
                            <span className="text-body-sm font-bold text-primary font-numeric-data mt-base">{job.total.toLocaleString('es-ES')} €</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add work button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveEntity(ent)}
                      className="border border-secondary text-secondary hover:bg-secondary/5 px-sm py-xs rounded-lg font-bold text-body-xs flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]" data-icon="add_circle">add_circle</span>
                      <span>ASIGNAR TRABAJO (CYPE + IA)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Consolidated Budget Items list (Presto/CYPE style) */}
        <div className="lg:col-span-6 space-y-md">
          <div className="border border-outline-variant bg-surface-container-low p-sm rounded-xl">
            <h3 className="text-title-xs sm:text-title-sm font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" data-icon="list_alt">list_alt</span>
              Presupuesto Consolidado de Obra (Presto)
            </h3>
          </div>

          {flatJobList.length === 0 ? (
            <div className="bg-white border border-outline-variant rounded-xl p-lg text-center shadow-sm text-on-surface-variant">
              Asigna trabajos a las unidades de actuación de la izquierda para ver el presupuesto general en vivo.
            </div>
          ) : (
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider w-12 text-center">Nº</th>
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Partida</th>
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Concepto</th>
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider text-right w-16">Cant.</th>
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider text-right w-20">P.U.</th>
                      <th className="px-sm py-xs text-label-xs text-on-surface-variant uppercase tracking-wider text-right w-24">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 text-body-xs">
                    {flatJobList.map((job, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-sm py-sm text-center text-on-surface-variant font-numeric-data">{idx + 1}</td>
                        <td className="px-sm py-sm font-numeric-data text-primary font-bold truncate max-w-[90px]" title={job.code}>↳ {job.code}</td>
                        <td className="px-sm py-sm text-on-surface line-clamp-2 max-w-[200px]" title={job.description}>{job.description}</td>
                        <td className="px-sm py-sm text-right font-numeric-data">{job.qty.toFixed(1)}</td>
                        <td className="px-sm py-sm text-right font-numeric-data text-on-surface-variant">{job.price.toFixed(2)} €</td>
                        <td className="px-sm py-sm text-right font-numeric-data text-primary font-bold">{job.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render the unified CypeParameterPopup as the selector */}
      {activeEntity && (
        <CypeParameterPopup
          item={activeEntity}
          onClose={() => setActiveEntity(null)}
          onApply={(updatedDescription, updatedPrice) => {
            handleAssignJob(activeEntity, updatedDescription, updatedPrice);
            setActiveEntity(null);
          }}
        />
      )}
    </div>
  );
};
