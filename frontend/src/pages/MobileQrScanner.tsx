import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  QrCode, 
  WarningCircle, 
  CheckCircle, 
  Barcode, 
  Storefront, 
  Truck,
  Spinner,
  ArrowRight
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getDistributionById,
  getDistributions
} from '../services/api';
import type { Distribution } from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function MobileQrScanner() {
  const [scannedDist, setScannedDist] = useState<Distribution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Interactive Fallback states
  const [activeRoutes, setActiveRoutes] = useState<Distribution[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [manualId, setManualId] = useState('');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load active routes for simulated fallback list
  const loadFallbackRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const data = await getDistributions();
      // Show scheduled and uncompleted routes (pendente or em_transito)
      setActiveRoutes(data.filter(d => d.is_scheduled === true && d.status !== 'entregue'));
    } catch (err) {
      // Slient fail for fallback routes list
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Initialize camera scanner
  useEffect(() => {
    loadFallbackRoutes();

    const startScanner = () => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0] // 0 means HTML5_QRCODE_SCAN_TYPE_CAMERA
          },
          /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      } catch (err: any) {
        console.error('Failed to initialize camera scanner:', err);
        setCameraError(err.message || 'Erro ao inicializar câmera');
      }
    };

    // Delay initialization slightly to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.warn('Failed to clear scanner:', err);
        });
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    // Avoid double scanning while loading
    if (isLoading) return;

    // Beep sound effect
    playBeep();

    await resolveVolumeId(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Sliently handle scan frame failure (this fires on every frame without a code)
  };

  const resolveVolumeId = async (id: string) => {
    setIsLoading(true);
    try {
      // Validate UUID format
      const trimmedId = id.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmedId)) {
        addToast('QR Code inválido: Não contém um ID de volume legítimo!', 'error');
        return;
      }

      const data = await getDistributionById(trimmedId);
      setScannedDist(data);
      addToast('Volume identificado com sucesso!', 'success');
      
      // Stop scanning once found to let user interact with modal
      if (scannerRef.current) {
        scannerRef.current.pause(true);
      }
    } catch (err: any) {
      addToast('Volume não encontrado no sistema ou excluído!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Play browser simulated beep sound
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1200; // Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be blocked by browser autoplay policy
    }
  };

  const handleActionClick = () => {
    if (!scannedDist) return;
    
    if (scannedDist.status === 'pendente') {
      navigate('/mobile/dispatch', { state: { autoSelectedId: scannedDist.id } });
    } else if (scannedDist.status === 'em_transito') {
      navigate('/mobile/recebimento', { state: { autoSelectedId: scannedDist.id } });
    }
  };

  const resumeScanning = () => {
    setScannedDist(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white pb-10">
      {/* Header */}
      <header className="bg-[#12141C] border-b border-dark-border/40 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-lg bg-dark-border/30 border border-dark-border/50 text-dark-dim hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-outfit font-bold text-base leading-tight">Leitor de QR Code</h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Identificar Volume e NF-e</p>
        </div>
      </header>

      <main className="px-4 py-5 space-y-6">

        {/* Scanned volume details display */}
        {scannedDist ? (
          <div className="bg-gradient-to-br from-indigo-950/40 to-teal-950/20 border border-teal-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={22} weight="fill" />
              <h3 className="font-outfit font-bold text-sm">Volume Identificado!</h3>
            </div>

            <div className="bg-[#12141C]/80 border border-dark-border/40 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    scannedDist.transfer_type === 'transferencia' ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {scannedDist.transfer_type === 'transferencia' ? 'Transferência entre Lojas' : 'Envio Fábrica'}
                  </span>
                  <h4 className="font-bold text-base text-white mt-2">{scannedDist.product?.name || 'Volume Acabado'}</h4>
                  <p className="text-xs text-indigo-400 mt-0.5 font-bold">NF-e: {scannedDist.nf_number}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  scannedDist.status === 'pendente' 
                    ? 'bg-amber-500/10 text-amber-400'
                    : scannedDist.status === 'em_transito'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {scannedDist.status.toUpperCase()}
                </span>
              </div>

              {/* Grade size details */}
              <div className="bg-dark-bg/60 p-3 rounded-lg border border-dark-border/20">
                <span className="text-[10px] text-dark-dim font-bold uppercase block mb-2">Grade do Volume:</span>
                <div className="flex gap-3 overflow-x-auto scrollbar-none">
                  {Object.entries(scannedDist.size_grade || {}).map(([sz, qty]) => (
                    <div key={sz} className="text-center min-w-8">
                      <p className="text-[10px] text-indigo-400 font-bold">{sz}</p>
                      <p className="text-xs font-bold text-white">{qty}</p>
                    </div>
                  ))}
                  <div className="text-center min-w-10 border-l border-dark-border/30 pl-2.5 ml-1">
                    <p className="text-[10px] text-dark-dim font-bold">TOTAL</p>
                    <p className="text-xs font-black text-white">{scannedDist.total_quantity}</p>
                  </div>
                </div>
              </div>

              {/* Origin Destination */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-dark-dim text-[10px] block uppercase">Origem</span>
                  <span className="font-semibold text-white">
                    {scannedDist.transfer_type === 'transferencia' ? scannedDist.origin_store : 'Fábrica (Expedição)'}
                  </span>
                </div>
                <div>
                  <span className="text-dark-dim text-[10px] block uppercase">Destino</span>
                  <span className="font-semibold text-white">{scannedDist.store_name}</span>
                </div>
                <div className="col-span-2 border-t border-dark-border/20 pt-2">
                  <span className="text-dark-dim text-[10px] block uppercase">Motorista Autorizado</span>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Truck size={14} className="text-teal-400" />
                    {scannedDist.assigned_driver}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Action Buttons */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleActionClick}
                className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold text-sm py-3.5 rounded-xl hover:scale-102 transition-all flex items-center justify-center gap-2"
              >
                {scannedDist.status === 'pendente' ? 'Avançar para Expedição (Coleta)' : 'Avançar para Recebimento (Loja)'}
                <ArrowRight size={16} />
              </button>
              
              <button 
                onClick={resumeScanning}
                className="w-full bg-dark-border/30 hover:bg-dark-border/50 text-dark-dim hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-dark-border/40"
              >
                Voltar a Escanear
              </button>
            </div>
          </div>
        ) : (
          /* Active Scanner View */
          <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-5">
            
            {/* Pulsing Scan Radar UI */}
            <div className="relative w-full max-w-[280px] h-[280px] mx-auto bg-[#12141C] border border-dark-border/60 rounded-3xl overflow-hidden flex items-center justify-center shadow-inner">
              
              {/* Radar sweep lines */}
              <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-2xl pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse animate-bounce" />
              
              {/* html5-qrcode camera mount element */}
              <div id="qr-reader-container" className="w-full h-full object-cover [&_video]:object-cover" />
              
              {isLoading && (
                <div className="absolute inset-0 bg-[#0A0B10]/80 flex flex-col items-center justify-center space-y-2">
                  <Spinner size={32} className="animate-spin text-teal-400" />
                  <p className="text-xs text-dark-dim font-bold">Identificando volume...</p>
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-dark-dim">Enquadre o QR Code impresso na etiqueta do volume</p>
              {cameraError && (
                <span className="text-[10px] text-amber-500 block">
                  <WarningCircle className="inline mr-1" size={12} />
                  Utilizando simulador fallback devido a restrições de permissão da câmera.
                </span>
              )}
            </div>
            
            {/* Manual ID Input */}
            <div className="border-t border-dark-border/20 pt-4 space-y-2">
              <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Digitar ID do Volume Manualmente</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Cole ou digite o UUID do reparto"
                  className="flex-1 bg-[#1A1C26] border border-dark-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
                <button 
                  onClick={() => resolveVolumeId(manualId)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 rounded-xl active:scale-95 transition-all"
                >
                  Consultar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Simulator Section for review / testing */}
        <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-dark-border/30 pb-3 mb-4">
            <QrCode size={20} className="text-teal-400" />
            <div>
              <h3 className="font-outfit font-bold text-sm">Simulador de Scanner (Bipe Rápido)</h3>
              <p className="text-[10px] text-dark-dim">Clique em um volume programado para simular o bipe da câmera</p>
            </div>
          </div>

          {isLoadingRoutes ? (
            <div className="text-center py-4 text-dark-dim animate-pulse text-xs">Carregando volumes...</div>
          ) : activeRoutes.length === 0 ? (
            <div className="text-center py-4 text-dark-dim text-xs">
              Nenhuma carga agendada ativamente (crie uma em "Programação de Rotas").
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {activeRoutes.map(route => (
                <div
                  key={route.id}
                  onClick={() => onScanSuccess(route.id)}
                  className="bg-[#1A1C26] border border-dark-border/30 hover:border-teal-500/40 p-3 rounded-xl flex items-center justify-between text-left group transition-all duration-200 cursor-pointer"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors">
                      {route.product?.name || 'Grade Faturada'}
                    </h4>
                    <p className="text-[10px] text-dark-dim">
                      {route.transfer_type === 'transferencia' ? route.origin_store : 'Fábrica'} ➔ {route.store_name} | NF-e: {route.nf_number}
                    </p>
                    <span className="text-[9px] text-dark-dim/60 block">Condutor: {route.assigned_driver}</span>
                  </div>
                  
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      route.status === 'pendente' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {route.status === 'pendente' ? 'COLETA' : 'ENTREGA'}
                    </span>
                    <span className="text-[10px] font-black text-white">{route.total_quantity} pçs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
