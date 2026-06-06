
import { AIPreview } from './AIPreview';

export const Dashboard: React.FC = () => {
  return (
    <div className="p-lg space-y-lg max-w-[1440px] mx-auto w-full">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Estado Actual - Levantamiento</h2>
          <p className="text-body-md font-body-md text-on-surface-variant">Documentación técnica preliminar y estado de conservación del inmueble.</p>
        </div>
        <div className="flex gap-sm">
          <button className="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded-lg hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[18px]" data-icon="file_upload">file_upload</span>
            <span className="text-label-md font-label-md">SUBIR ARCHIVOS</span>
          </button>
          <button className="flex items-center gap-xs border border-outline text-primary px-md py-sm rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]" data-icon="share">share</span>
            <span className="text-label-md font-label-md">COMPARTIR</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout for KPI Cards & AI Scanning */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg h-auto">
        {/* Technical Data Cards */}
        <div className="md:col-span-4 flex flex-col gap-lg">
          <div className="bg-white border border-outline-variant p-lg rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md font-label-md text-on-surface-variant">ÁREA CONSTRUIDA</span>
              <span className="material-symbols-outlined text-secondary" data-icon="straighten">straighten</span>
            </div>
            <div className="text-display font-display text-primary">107<span className="text-headline-md font-headline-md"> m²</span></div>
            <div className="mt-xs text-body-sm font-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-on-secondary-fixed-variant" data-icon="info">info</span>
              Verificado por topografía láser
            </div>
          </div>
          <div className="bg-white border border-outline-variant p-lg rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md font-label-md text-on-surface-variant">AÑO DE CONSTRUCCIÓN</span>
              <span className="material-symbols-outlined text-secondary" data-icon="event">event</span>
            </div>
            <div className="text-display font-display text-primary">1974</div>
            <div className="mt-xs text-body-sm font-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim" data-icon="warning">warning</span>
              Estructura de hormigón armado (B175)
            </div>
          </div>
        </div>

        {/* AI Scanning Area */}
        <div className="md:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-lg relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-lg">
              <div className="flex items-center gap-sm">
                <div className="bg-secondary p-xs rounded-lg">
                  <span className="material-symbols-outlined text-on-secondary" data-icon="auto_awesome">auto_awesome</span>
                </div>
                <h3 className="text-title-sm font-title-sm text-on-surface">AI Scanning: Extracción de Planos</h3>
              </div>
              <span className="bg-secondary-container text-on-secondary-container text-label-md font-label-md px-sm py-xs rounded-full">BETA</span>
            </div>
            <div className="flex-1 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl bg-white/50 group-hover:bg-white/80 transition-all cursor-pointer">
              <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-md">
                <span className="material-symbols-outlined text-[32px] text-secondary" data-icon="document_scanner">document_scanner</span>
              </div>
              <p className="text-body-lg font-body-lg text-primary text-center">Suelte aquí sus planos antiguos en papel</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-xs">Soportamos PDF, JPG y planos escaneados. El sistema extraerá cotas y áreas automáticamente.</p>
              <button className="mt-lg border border-secondary text-secondary px-lg py-sm rounded-lg hover:bg-secondary/5 transition-colors font-bold">SELECCIONAR ARCHIVO</button>
            </div>
          </div>
          {/* Decorative scanning effect via absolute positioning */}
          <div className="absolute inset-0 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
            <div className="w-full h-1 bg-secondary shadow-[0_0_15px_rgba(33,112,228,0.8)] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
          </div>
        </div>
      </div>
      
      <AIPreview />
    </div>
  );
};
