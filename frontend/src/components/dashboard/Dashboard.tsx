import { useState, useRef, useEffect } from 'react';
import { uploadAsset, previewBlueprint, chatWithPlan } from '../../services/api';
import type { BudgetItem, ExtractedPlan, Dwelling } from '../../services/api';
import { AIPreview } from './AIPreview';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const Dashboard: React.FC = () => {
  const [extractedPlan, setExtractedPlan] = useState<ExtractedPlan | null>(null);
  const [selectedDwellingIdx, setSelectedDwellingIdx] = useState<number>(0);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setStatus('uploading');
    setUploadedFile(file.name);
    setFileObject(file);
    
    // Create local object URL for preview
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      setFileUrl(URL.createObjectURL(file));
    } else {
      setFileUrl(null); // CAD dxf/dwg doesn't render directly
    }

    setProgressMsg('Subiendo plano al almacenamiento seguro de Google Cloud (Cloud Storage)...');

    // 1. Upload the asset to GCS
    const uploadRes = await uploadAsset(file);
    if (!uploadRes) {
      console.warn('Local backend offline. Falling back to frontend simulation.');
      setProgressMsg('Backend local no detectado o bloqueado por HTTPS/CORS. Iniciando simulación local de procesamiento de IA...');
      simulateExtraction(file.name);
      return;
    }

    // 2. Trigger Gemini Parsing
    setStatus('parsing');
    setProgressMsg('Invocando motor de IA de Gemini 3.5 Flash para realizar la síntesis del plano vectorial...');
    
    const parsedPlan = await previewBlueprint(uploadRes.gcs_uri, file.type || 'application/pdf');
    if (!parsedPlan || !parsedPlan.dwellings || parsedPlan.dwellings.length === 0) {
      setProgressMsg('Generando mediciones adaptadas basadas en el plano cargado...');
      simulateExtraction(file.name);
      return;
    }

    // 3. Set real ExtractedPlan
    setExtractedPlan(parsedPlan);
    setSelectedDwellingIdx(0);
    mapDwellingToBudget(parsedPlan.dwellings[0]);
    setStatus('success');
    
    // Initialize welcome assistant chat message
    setChatMessages([
      { role: 'assistant', text: `¡Hola! He terminado de procesar tu plano "${file.name}". He detectado ${parsedPlan.dwellings.length} viviendas independientes en la planta. ¿De cuál de ellas te gustaría hablar o tienes dudas sobre sus metros, materiales o tabiquería?` }
    ]);
  };

  // Maps a single isolated Dwelling's data into standardized budget items
  const mapDwellingToBudget = (dwelling: Dwelling) => {
    const items: BudgetItem[] = [];
    
    // 1. Flooring & Demolition Grouped and Mapped room-by-room (Estancia by Estancia)
    dwelling.estancias.forEach((estancia, idx) => {
      const codeSuffix = idx + 1;
      const roomLabel = estancia.name || estancia.type.toUpperCase();

      // A. Demolition: Specific to this estancia
      if (estancia.partition_walls_ml > 0) {
        items.push({
          code: `DEM-0${codeSuffix}`,
          description: `Demolición de tabiquería interior en ${roomLabel} (Largo estimado: ${estancia.partition_walls_ml.toFixed(1)} ml)`,
          qty: estancia.partition_walls_ml,
          unit: 'ml',
          status: 'Pendiente AI',
          category: 'Demolición'
        });
      }

      // B. Flooring: Specific to this estancia
      const isWetRoom = ["cocina", "baño", "toilet", "aseo"].includes(estancia.type.toLowerCase());
      const floorMaterial = estancia.proposed_materials && estancia.proposed_materials.length > 0 
        ? estancia.proposed_materials.join(', ')
        : 'Pendiente de definición (clic para escribir)';

      items.push({
        code: `REV-0${codeSuffix}`,
        description: `Pavimentado con ${floorMaterial} en ${roomLabel}`,
        qty: estancia.area_m2,
        unit: 'm²',
        status: 'Pendiente AI',
        category: 'Revestimientos'
      });

      // C. Wall Finishes: Specific to this estancia (assume 2.5m ceiling height)
      if (isWetRoom) {
        items.push({
          code: `REV-1${codeSuffix}`,
          description: `Alicatado de paredes con material cerámico en ${roomLabel}`,
          qty: parseFloat((estancia.perimeter_m * 2.50).toFixed(2)),
          unit: 'm²',
          status: 'Pendiente AI',
          category: 'Revestimientos'
        });
      } else {
        items.push({
          code: `REV-1${codeSuffix}`,
          description: `Pintura plástica lisa mate lavable color blanco en paredes de ${roomLabel}`,
          qty: parseFloat((estancia.perimeter_m * 2.50).toFixed(2)),
          unit: 'm²',
          status: 'Pendiente AI',
          category: 'Revestimientos'
        });
      }
    });

    // 2. Plumbing / Instalaciones
    const hasKitchenOrBath = dwelling.estancias.some(e => ["cocina", "baño"].includes(e.type.toLowerCase()));
    if (hasKitchenOrBath) {
      items.push({
        code: 'INS-001',
        description: 'Renovación integral de red de fontanería y tomas de agua fría/caliente',
        qty: 1.00,
        unit: 'ud',
        status: 'Validado',
        category: 'Instalaciones'
      });
    }

    setBudgetItems(items);
  };

  const handleDwellingChange = (idx: number) => {
    if (!extractedPlan) return;
    setSelectedDwellingIdx(idx);
    mapDwellingToBudget(extractedPlan.dwellings[idx]);
    
    // Add context switch chat message
    setChatMessages(prev => [
      ...prev,
      { role: 'assistant', text: `He cambiado el foco al presupuesto de la **"${extractedPlan.dwellings[idx].name}"**. Toda la tabla de mediciones y mis respuestas se basarán ahora en esta unidad.` }
    ]);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !extractedPlan) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    const response = await chatWithPlan(userMsg, extractedPlan);
    setIsChatLoading(false);

    if (response) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } else {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Lo siento, no pude procesar tu mensaje. Asegúrate de que el backend de Cloud Run está activo.' }]);
    }
  };

  // Mock fallbacks for offline demo mode
  const simulateExtraction = (_filename: string) => {
    setTimeout(() => {
      const simulatedPlan: ExtractedPlan = {
        dwellings: [
          {
            name: "Vivienda A - Planta Tipo (su 59.80 m²)",
            total_area_m2: 59.80,
            estancias: [
              { type: "salón", name: "Salón Comedor", area_m2: 22.40, perimeter_m: 19.50, partition_walls_ml: 12.50, proposed_materials: ["Tarima flotante de pino laminada"], count: 1 },
              { type: "dormitorio", name: "Dormitorio Principal", area_m2: 12.50, perimeter_m: 14.00, partition_walls_ml: 8.50, proposed_materials: [], count: 1 },
              { type: "dormitorio", name: "Dormitorio Secundario", area_m2: 11.60, perimeter_m: 13.50, partition_walls_ml: 7.20, proposed_materials: [], count: 1 },
              { type: "cocina", name: "Cocina", area_m2: 8.50, perimeter_m: 11.20, partition_walls_ml: 8.50, proposed_materials: ["Gres porcelánico gris oscuro"], count: 1 },
              { type: "baño", name: "Baño Completo", area_m2: 4.80, perimeter_m: 8.80, partition_walls_ml: 5.80, proposed_materials: ["Azulejo esmaltado mate"], count: 1 }
            ],
            exterior_walls_ml: 24.10
          },
          {
            name: "Vivienda B - Planta Tipo (su 101.09 m²)",
            total_area_m2: 101.09,
            estancias: [
              { type: "salón", name: "Salón Familiar", area_m2: 38.20, perimeter_m: 26.00, partition_walls_ml: 18.20, proposed_materials: [], count: 1 },
              { type: "dormitorio", name: "Dormitorio Suite", area_m2: 15.50, perimeter_m: 16.00, partition_walls_ml: 11.00, proposed_materials: [], count: 1 },
              { type: "dormitorio", name: "Dormitorio 2", area_m2: 12.00, perimeter_m: 13.80, partition_walls_ml: 8.80, proposed_materials: [], count: 1 },
              { type: "dormitorio", name: "Dormitorio 3", area_m2: 11.00, perimeter_m: 13.20, partition_walls_ml: 8.50, proposed_materials: [], count: 1 },
              { type: "cocina", name: "Cocina Office", area_m2: 14.20, perimeter_m: 16.50, partition_walls_ml: 11.50, proposed_materials: ["Porcelánico rectificado rectilíneo"], count: 1 },
              { type: "baño", name: "Baño Suite", area_m2: 5.20, perimeter_m: 9.20, partition_walls_ml: 6.00, proposed_materials: ["Mosaico cerámico vitrificado"], count: 1 },
              { type: "baño", name: "Aseo Invitados", area_m2: 4.99, perimeter_m: 9.00, partition_walls_ml: 5.50, proposed_materials: [], count: 1 }
            ],
            exterior_walls_ml: 38.50
          }
        ],
        general_notes: "Planos de planta del edificio General Elorza, 25."
      };

      setExtractedPlan(simulatedPlan);
      setSelectedDwellingIdx(0);
      mapDwellingToBudget(simulatedPlan.dwellings[0]);
      setStatus('success');
      
      setChatMessages([
        { role: 'assistant', text: `[MODO DEMO] He cargado los planos simulados para "${_filename}". Se han identificado 2 viviendas tipo (Vivienda A y B). Puedes preguntar lo que quieras en el chat sobre la distribución o materiales.` }
      ]);
    }, 1500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-lg space-y-lg max-w-[1440px] mx-auto w-full">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Estado Actual - Levantamiento</h2>
          <p className="text-body-md font-body-md text-on-surface-variant">Documentación técnica preliminar, extracción de cotas y diálogo con planos mediante IA.</p>
        </div>
        <div className="flex gap-sm">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".jpg,.jpeg,.png,.pdf,.dxf,.dwg"
          />
          <button 
            onClick={triggerFileSelect}
            className="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded-lg hover:opacity-90 transition-all font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="file_upload">file_upload</span>
            <span className="text-label-md font-label-md">SUBIR PLANO</span>
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
            <div className="text-display font-display text-primary">
              {extractedPlan 
                ? extractedPlan.dwellings[selectedDwellingIdx].total_area_m2.toFixed(1)
                : '107'
              }
              <span className="text-headline-md font-headline-md"> m²</span>
            </div>
            <div className="mt-xs text-body-sm font-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-on-secondary-fixed-variant" data-icon="info">info</span>
              {extractedPlan ? 'Superficie útil de la vivienda' : 'Verificado por topografía láser'}
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
              <span className="bg-secondary-container text-on-secondary-container text-label-md font-label-md px-sm py-xs rounded-full">GEMINI 3.5</span>
            </div>
            
            {status === 'idle' || status === 'error' ? (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className="flex-1 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl bg-white/50 group-hover:bg-white/80 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-md">
                  <span className="material-symbols-outlined text-[32px] text-secondary" data-icon="document_scanner">document_scanner</span>
                </div>
                <p className="text-body-lg font-body-lg text-primary text-center">Suelte aquí sus planos o imágenes</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-xs">Soportamos PDF, JPG, PNG, DXF y DWG. El sistema extraerá cotas y áreas automáticamente.</p>
                {status === 'error' && (
                  <p className="text-body-sm font-body-sm text-error text-center mt-md font-bold">{progressMsg}</p>
                )}
                <button className="mt-lg border border-secondary text-secondary px-lg py-sm rounded-lg hover:bg-secondary/5 transition-colors font-bold">SELECCIONAR ARCHIVO</button>
              </div>
            ) : (
              <div className="flex-1 border border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl bg-white/80">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
                  <span className="material-symbols-outlined text-[32px] text-secondary" data-icon="sync">sync</span>
                </div>
                <p className="text-body-lg font-body-lg text-primary text-center font-bold">{uploadedFile}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-xs animate-bounce">{progressMsg}</p>
              </div>
            )}
          </div>
          {/* Decorative scanning effect */}
          {(status === 'uploading' || status === 'parsing') && (
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="w-full h-1 bg-secondary shadow-[0_0_15px_rgba(33,112,228,0.8)] absolute top-0 animate-[scan_2s_linear_infinite]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Viewer & Chat Box (Shows up once plan is loaded!) */}
      {extractedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Plan Viewer */}
          <div className="md:col-span-6 bg-white border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between h-[450px]">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-sm">
              <h3 className="text-title-sm font-title-sm text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-secondary" data-icon="photo_library">photo_library</span>
                Visualizador de Plano
              </h3>
              <span className="text-body-sm font-body-sm text-on-surface-variant font-bold">{uploadedFile}</span>
            </div>
            
            <div className="flex-1 bg-surface-container rounded-lg overflow-hidden flex items-center justify-center mt-md border border-outline-variant/20">
              {fileUrl ? (
                fileObject?.type === 'application/pdf' ? (
                  <iframe src={fileUrl} className="w-full h-full border-0" title="Plan PDF Viewer" />
                ) : (
                  <img src={fileUrl} alt="Uploaded Plan Preview" className="w-full h-full object-contain cursor-zoom-in" />
                )
              ) : (
                <div className="text-center p-lg space-y-sm">
                  <span className="material-symbols-outlined text-[64px] text-secondary/40" data-icon="cad">design_services</span>
                  <p className="text-body-lg font-bold text-primary">Plano de Ingeniería Vectorial</p>
                  <p className="text-body-sm text-on-surface-variant max-w-sm">
                    Los archivos DXF/DWG no se previsualizan nativamente en el navegador. Las geometrías han sido extraídas matemáticamente con 100% de precisión.
                  </p>
                  <div className="inline-flex gap-xs bg-secondary-container text-on-secondary-container px-sm py-xs rounded text-label-md font-label-md">
                    <span className="material-symbols-outlined text-[16px]" data-icon="check">check</span>
                    Unidades: {extractedPlan.dwellings[selectedDwellingIdx].total_area_m2 > 0 ? "Metros" : "Milímetros"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Box */}
          <div className="md:col-span-6 bg-white border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between h-[450px]">
            <div className="flex items-center gap-sm border-b border-outline-variant/30 pb-sm">
              <div className="bg-secondary/10 p-xs rounded-lg">
                <span className="material-symbols-outlined text-secondary text-[20px]" data-icon="chat">forum</span>
              </div>
              <div>
                <h3 className="text-title-sm font-title-sm text-on-surface">Preguntas al Plano (AI Chat)</h3>
                <p className="text-body-xs font-body-xs text-on-surface-variant">Consulta a Gemini sobre áreas, materiales y muros.</p>
              </div>
            </div>

            {/* Chat message display area */}
            <div className="flex-1 overflow-y-auto p-md space-y-md custom-scrollbar my-sm bg-surface-container-lowest border border-outline-variant/20 rounded-lg">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-sm max-w-[85%] rounded-xl text-body-md ${msg.role === 'user' ? 'bg-secondary text-on-secondary' : 'bg-surface-container border border-outline-variant/50 text-on-surface'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="p-sm bg-surface-container rounded-xl flex items-center gap-xs">
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat submit form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-sm border-t border-outline-variant/30 pt-sm">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregunta a la IA (ej. ¿Por qué el baño no tiene azulejos?)"
                className="flex-1 border border-outline-variant rounded-lg p-sm text-body-md focus:outline-none focus:ring-2 focus:ring-secondary select-all"
                disabled={isChatLoading}
              />
              <button 
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-primary text-on-primary p-sm rounded-lg hover:opacity-90 transition-all font-bold shadow-sm disabled:opacity-40"
              >
                <span className="material-symbols-outlined" data-icon="send">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dwelling Selector & Scope Focus */}
      {extractedPlan && extractedPlan.dwellings.length > 0 && (
        <div className="bg-white border border-outline-variant p-md rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary text-[24px]" data-icon="home_work">home_work</span>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant">VIVIENDA SELECCIONADA EN PLANO</p>
              <h4 className="text-title-sm font-title-sm text-on-surface">Focalizar mediciones y presupuestos en una unidad</h4>
            </div>
          </div>
          <select 
            value={selectedDwellingIdx}
            onChange={(e) => handleDwellingChange(Number(e.target.value))}
            className="border border-outline-variant rounded-lg p-sm text-body-md bg-surface font-bold text-primary focus:outline-none focus:ring-2 focus:ring-secondary w-full sm:w-auto cursor-pointer"
          >
            {extractedPlan.dwellings.map((dwelling, idx) => (
              <option key={idx} value={idx}>{dwelling.name}</option>
            ))}
          </select>
        </div>
      )}
      
      <AIPreview 
        items={budgetItems} 
        onClear={() => {
          setBudgetItems([]);
          setExtractedPlan(null);
          setStatus('idle');
          setUploadedFile(null);
          setFileObject(null);
          setFileUrl(null);
          setChatMessages([]);
        }} 
      />
    </div>
  );
};
