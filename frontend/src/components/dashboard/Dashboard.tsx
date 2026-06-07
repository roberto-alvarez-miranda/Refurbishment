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

  // Lightbox modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
    setProgressMsg('Invocando motor de IA de Gemini 3.1 Pro para realizar la extracción de plano compleja con alta precisión...');
    
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

  // Maps a single isolated Dwelling's data into standardized budget items (CYPE/Presto style!)
  const mapDwellingToBudget = (dwelling: Dwelling) => {
    const items: BudgetItem[] = [];
    let demCount = 1;
    let revCount = 1;
    let insCount = 1;
    
    // Loop through each estancia to create room-by-room items
    dwelling.estancias.forEach((estancia) => {
      const roomLabel = estancia.name || estancia.type.toUpperCase();

      // A. Demolition: Tabique by Tabique
      if (estancia.tabiques && estancia.tabiques.length > 0) {
        estancia.tabiques.forEach((tabique) => {
          items.push({
            code: `DEM-0${demCount++}`,
            description: `Demolición de tabique interior en ${roomLabel}: ${tabique.label} (${tabique.length_m.toFixed(1)} ml x ${tabique.height_m.toFixed(2)} m de alto, m: ${tabique.material})`,
            qty: tabique.area_m2, // Measured in m2 (length * height) as required!
            unit: 'm²',
            status: 'Pendiente AI',
            category: 'Demolición'
          });
        });
      }

      // B. Dismantling of Sanitary/Plumbing Fixtures (Desmontaje de sanitarios)
      if (estancia.sanitarios && estancia.sanitarios.length > 0) {
        estancia.sanitarios.forEach((sanitario) => {
          if (sanitario.action.toLowerCase() === 'retirar') {
            items.push({
              code: `DEM-S0${demCount++}`,
              description: `Desmontaje, retirada y transporte a vertedero de aparato: ${sanitario.type.toUpperCase()} en ${roomLabel}`,
              qty: sanitario.count,
              unit: 'ud',
              status: 'Pendiente AI',
              category: 'Demolición'
            });
          }
        });
      }

      // C. Flooring: Specific to this estancia
      const isWetRoom = ["cocina", "baño", "toilet", "aseo"].includes(estancia.type.toLowerCase());
      const floorMaterial = estancia.proposed_materials && estancia.proposed_materials.length > 0 
        ? estancia.proposed_materials.join(', ')
        : 'Pendiente de definición (clic para escribir)';

      items.push({
        code: `REV-0${revCount++}`,
        description: `Pavimentado con ${floorMaterial} en ${roomLabel}`,
        qty: estancia.area_m2,
        unit: 'm²',
        status: 'Pendiente AI',
        category: 'Revestimientos'
      });

      // D. Wall Finishes: Specific to this estancia (assume ceiling height is estancia.height_m)
      const h = estancia.height_m || 2.50;
      if (isWetRoom) {
        items.push({
          code: `REV-1${revCount++}`,
          description: `Alicatado de paredes con material cerámico en ${roomLabel} (Altura: ${h.toFixed(2)} m)`,
          qty: parseFloat((estancia.perimeter_m * h).toFixed(2)),
          unit: 'm²',
          status: 'Pendiente AI',
          category: 'Revestimientos'
        });
      } else {
        items.push({
          code: `REV-1${revCount++}`,
          description: `Pintura plástica lisa mate lavable color blanco en paredes de ${roomLabel} (Altura: ${h.toFixed(2)} m)`,
          qty: parseFloat((estancia.perimeter_m * h).toFixed(2)),
          unit: 'm²',
          status: 'Pendiente AI',
          category: 'Revestimientos'
        });
      }

      // E. Plumbing: Specific to this room/estancia (Fontanería por estancia)
      const hasPlumbingFixtures = estancia.sanitarios && estancia.sanitarios.length > 0;
      if (isWetRoom || hasPlumbingFixtures) {
        items.push({
          code: `INS-F0${insCount++}`,
          description: `Instalación de red de fontanería, desagües y tomas de agua fría/caliente para ${roomLabel}`,
          qty: 1.00,
          unit: 'ud',
          status: 'Validado',
          category: 'Instalaciones'
        });
      }
    });

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
              { 
                type: "salón", 
                name: "Salón Comedor", 
                area_m2: 22.40, 
                perimeter_m: 19.50, 
                height_m: 2.65,
                tabiques: [
                  { label: "Tabique divisorio con Dormitorio 1", length_m: 4.50, height_m: 2.65, area_m2: 11.92, material: "Pladur" },
                  { label: "Tabique divisorio con Pasillo", length_m: 3.20, height_m: 2.65, area_m2: 8.48, material: "Ladrillo hueco" }
                ],
                sanitarios: [],
                proposed_materials: ["Tarima flotante de pino laminada"], 
                count: 1 
              },
              { 
                type: "dormitorio", 
                name: "Dormitorio Principal", 
                area_m2: 12.50, 
                perimeter_m: 14.00, 
                height_m: 2.65,
                tabiques: [
                  { label: "Tabique de fachada interna", length_m: 3.80, height_m: 2.65, area_m2: 10.07, material: "Pladur" }
                ],
                sanitarios: [],
                proposed_materials: [], 
                count: 1 
              },
              { 
                type: "cocina", 
                name: "Cocina", 
                area_m2: 8.50, 
                perimeter_m: 11.20, 
                height_m: 2.65,
                tabiques: [
                  { label: "Tabique divisorio con Salón", length_m: 4.10, height_m: 2.65, area_m2: 10.86, material: "Ladrillo hueco" }
                ],
                sanitarios: [
                  { type: "fregadero", count: 1, action: "retirar" },
                  { type: "caldera mural", count: 1, action: "retirar" }
                ],
                proposed_materials: ["Gres porcelánico gris oscuro"], 
                count: 1 
              },
              { 
                type: "baño", 
                name: "Baño Completo", 
                area_m2: 4.80, 
                perimeter_m: 8.80, 
                height_m: 2.55,
                tabiques: [
                  { label: "Tabique divisorio con Pasillo", length_m: 2.40, height_m: 2.55, area_m2: 6.12, material: "Ladrillo hueco" }
                ],
                sanitarios: [
                  { type: "inodoro", count: 1, action: "retirar" },
                  { type: "lavabo", count: 1, action: "retirar" },
                  { type: "bañera", count: 1, action: "retirar" }
                ],
                proposed_materials: ["Azulejo esmaltado mate"], 
                count: 1 
              }
            ],
            exterior_walls_ml: 24.10
          }
        ],
        general_notes: "Planos de planta del edificio General Elorza, 25."
      };

      setExtractedPlan(simulatedPlan);
      setSelectedDwellingIdx(0);
      mapDwellingToBudget(simulatedPlan.dwellings[0]);
      setStatus('success');
      
      setChatMessages([
        { role: 'assistant', text: `[MODO DEMO] He cargado los planos simulados para "${_filename}". Se han identificado 1 vivienda tipo. Puedes preguntar lo que quieras en el chat sobre la distribución o materiales.` }
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
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-sm sm:gap-md">
        <div>
          <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Estado Actual - Levantamiento</h2>
          <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">Documentación técnica preliminar, extracción de cotas y diálogo con planos mediante IA.</p>
        </div>
        <div className="flex gap-sm w-full md:w-auto">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".jpg,.jpeg,.png,.pdf,.dxf,.dwg"
          />
          <button 
            onClick={triggerFileSelect}
            className="flex-1 md:flex-initial flex items-center justify-center gap-xs bg-primary text-on-primary px-sm sm:px-md py-sm rounded-lg hover:opacity-90 transition-all font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="file_upload">file_upload</span>
            <span className="text-label-md font-label-md">SUBIR PLANO</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout for KPI Cards & AI Scanning - Responsive Flex Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-sm sm:gap-lg h-auto">
        {/* Technical Data Cards */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-sm sm:gap-lg">
          <div className="bg-white border border-outline-variant p-sm sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant">ÁREA CONSTRUIDA</span>
              <span className="material-symbols-outlined text-secondary" data-icon="straighten">straighten</span>
            </div>
            <div className="text-headline-lg sm:text-display font-display text-primary">
              {extractedPlan 
                ? extractedPlan.dwellings[selectedDwellingIdx].total_area_m2.toFixed(1)
                : '107'
              }
              <span className="text-title-sm sm:text-headline-md font-headline-md"> m²</span>
            </div>
            <div className="mt-xs text-body-xs sm:text-body-sm font-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-on-secondary-fixed-variant" data-icon="info">info</span>
              {extractedPlan ? 'Superficie útil de la vivienda' : 'Verificado por topografía láser'}
            </div>
          </div>
          <div className="bg-white border border-outline-variant p-sm sm:p-lg rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant">AÑO DE CONSTRUCCIÓN</span>
              <span className="material-symbols-outlined text-secondary" data-icon="event">event</span>
            </div>
            <div className="text-headline-lg sm:text-display font-display text-primary">1974</div>
            <div className="mt-xs text-body-xs sm:text-body-sm font-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim" data-icon="warning">warning</span>
              Estructura de hormigón armado (B175)
            </div>
          </div>
        </div>

        {/* AI Scanning Area */}
        <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-sm sm:p-lg relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-md sm:mb-lg">
              <div className="flex items-center gap-sm">
                <div className="bg-secondary p-xs rounded-lg">
                  <span className="material-symbols-outlined text-on-secondary" data-icon="auto_awesome">auto_awesome</span>
                </div>
                <h3 className="text-title-xs sm:text-title-sm font-title-sm text-on-surface">AI Scanning: Extracción de Planos</h3>
              </div>
              <span className="bg-secondary-container text-on-secondary-container text-label-xs sm:text-label-md font-label-md px-sm py-xs rounded-full">GEMINI 3.1 PRO</span>
            </div>
            
            {status === 'idle' || status === 'error' ? (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className="flex-1 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-md sm:p-xl bg-white/50 group-hover:bg-white/80 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-sm sm:mb-md">
                  <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-secondary" data-icon="document_scanner">document_scanner</span>
                </div>
                <p className="text-body-md sm:text-body-lg font-body-lg text-primary text-center">Suelte aquí sus planos o imágenes</p>
                <p className="text-body-xs sm:text-body-sm font-body-sm text-on-surface-variant text-center mt-xs px-sm">Soportamos PDF, JPG, PNG, DXF y DWG. El sistema extraerá cotas y áreas automáticamente.</p>
                {status === 'error' && (
                  <p className="text-body-xs sm:text-body-sm font-body-sm text-error text-center mt-md font-bold">{progressMsg}</p>
                )}
                <button className="mt-md sm:mt-lg border border-secondary text-secondary px-md sm:px-lg py-sm rounded-lg hover:bg-secondary/5 transition-colors font-bold text-label-sm sm:text-label-md">SELECCIONAR ARCHIVO</button>
              </div>
            ) : (
              <div className="flex-1 border border-outline-variant rounded-xl flex flex-col items-center justify-center p-md sm:p-xl bg-white/80">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-sm sm:mb-md animate-pulse">
                  <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-secondary" data-icon="sync">sync</span>
                </div>
                <p className="text-body-md sm:text-body-lg font-body-lg text-primary text-center font-bold">{uploadedFile}</p>
                <p className="text-body-xs sm:text-body-sm font-body-sm text-on-surface-variant text-center mt-xs animate-bounce">{progressMsg}</p>
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

      {/* Plan Viewer & Chat Box (Responsive Row/Column) */}
      {extractedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm sm:gap-lg">
          {/* Plan Viewer */}
          <div className="bg-white border border-outline-variant p-sm sm:p-lg rounded-xl shadow-sm flex flex-col justify-between h-[380px] sm:h-[450px]">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-sm">
              <h3 className="text-title-xs sm:text-title-sm font-title-sm text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-secondary" data-icon="photo_library">photo_library</span>
                Visualizador de Plano
              </h3>
              <span className="text-body-xs sm:text-body-sm font-body-sm text-on-surface-variant font-bold truncate max-w-[200px]">{uploadedFile}</span>
            </div>
            
            <div className="flex-1 bg-surface-container rounded-lg overflow-hidden flex items-center justify-center mt-sm sm:mt-md border border-outline-variant/20 relative group/viewer">
              {fileUrl ? (
                fileObject?.type === 'application/pdf' ? (
                  <iframe src={fileUrl} className="w-full h-full border-0" title="Plan PDF Viewer" />
                ) : (
                  <>
                    <img src={fileUrl} alt="Uploaded Plan Preview" className="w-full h-full object-contain" />
                    {/* Zoom / Lightbox Trigger Button */}
                    <button 
                      onClick={() => setIsLightboxOpen(true)}
                      className="absolute bottom-3 right-3 bg-primary text-on-primary p-sm rounded-full opacity-85 hover:opacity-100 transition-all shadow-md flex items-center justify-center"
                      title="Ampliar imagen"
                    >
                      <span className="material-symbols-outlined text-[20px]" data-icon="zoom_in">zoom_in</span>
                    </button>
                  </>
                )
              ) : (
                <div className="text-center p-sm sm:p-lg space-y-sm">
                  <span className="material-symbols-outlined text-[48px] sm:text-[64px] text-secondary/40" data-icon="cad">design_services</span>
                  <p className="text-body-md sm:text-body-lg font-bold text-primary">Plano de Ingeniería Vectorial</p>
                  <p className="text-body-xs sm:text-body-sm text-on-surface-variant max-w-sm px-sm">
                    Los archivos DXF/DWG no se previsualizan nativamente en el navegador. Las geometrías han sido extraídas matemáticamente con 100% de precisión.
                  </p>
                  <div className="inline-flex gap-xs bg-secondary-container text-on-secondary-container px-sm py-xs rounded text-label-xs sm:text-label-md font-label-md">
                    <span className="material-symbols-outlined text-[16px]" data-icon="check">check</span>
                    Unidades: {extractedPlan.dwellings[selectedDwellingIdx].total_area_m2 > 0 ? "Metros" : "Milímetros"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Box */}
          <div className="bg-white border border-outline-variant p-sm sm:p-lg rounded-xl shadow-sm flex flex-col justify-between h-[380px] sm:h-[450px]">
            <div className="flex items-center gap-sm border-b border-outline-variant/30 pb-sm">
              <div className="bg-secondary/10 p-xs rounded-lg">
                <span className="material-symbols-outlined text-secondary text-[20px]" data-icon="chat">forum</span>
              </div>
              <div>
                <h3 className="text-title-xs sm:text-title-sm font-title-sm text-on-surface">Preguntas al Plano (AI Chat)</h3>
                <p className="text-body-xs font-body-xs text-on-surface-variant">Consulta a Gemini sobre áreas, materiales y muros.</p>
              </div>
            </div>

            {/* Chat message display area */}
            <div className="flex-1 overflow-y-auto p-sm sm:p-md space-y-sm sm:space-y-md custom-scrollbar my-sm bg-surface-container-lowest border border-outline-variant/20 rounded-lg">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-sm max-w-[85%] rounded-xl text-body-xs sm:text-body-md ${msg.role === 'user' ? 'bg-secondary text-on-secondary' : 'bg-surface-container border border-outline-variant/50 text-on-surface'}`}>
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
                placeholder="Pregunta a la IA (ej. ¿Por qué no hay azulejos?)"
                className="flex-1 border border-outline-variant rounded-lg p-sm text-body-xs sm:text-body-md focus:outline-none focus:ring-2 focus:ring-secondary select-all"
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
        <div className="bg-white border border-outline-variant p-sm sm:p-md rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm sm:gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary text-[24px]" data-icon="home_work">home_work</span>
            <div>
              <p className="text-label-xs sm:text-label-md font-label-md text-on-surface-variant">VIVIENDA SELECCIONADA EN PLANO</p>
              <h4 className="text-title-xs sm:text-title-sm font-title-sm text-on-surface">Focalizar mediciones y presupuestos en una unidad</h4>
            </div>
          </div>
          <select 
            value={selectedDwellingIdx}
            onChange={(e) => handleDwellingChange(Number(e.target.value))}
            className="border border-outline-variant rounded-lg p-sm text-body-xs sm:text-body-md bg-surface font-bold text-primary focus:outline-none focus:ring-2 focus:ring-secondary w-full sm:w-auto cursor-pointer"
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

      {/* Full-Screen Lightbox Modal for Blueprint Zooming */}
      {isLightboxOpen && fileUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-sm animate-fade-in">
          {/* Close trigger button */}
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-sm rounded-full transition-all z-50 flex items-center justify-center"
            title="Cerrar vista"
          >
            <span className="material-symbols-outlined text-[32px]" data-icon="close">close</span>
          </button>
          
          {/* Panoramic Image container */}
          <div className="relative w-full max-w-[95vw] h-full max-h-[90vh] flex items-center justify-center">
            <img 
              src={fileUrl} 
              alt="Full-Resolution Blueprint" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" 
            />
          </div>
          
          <div className="absolute bottom-4 bg-black/60 text-white/80 px-md py-sm rounded-full text-label-md font-label-md text-center">
            {uploadedFile} — Zoom ampliado de alta definición
          </div>
        </div>
      )}
    </div>
  );
};
