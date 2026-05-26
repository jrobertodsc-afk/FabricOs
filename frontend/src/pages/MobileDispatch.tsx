import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { 
  ArrowLeft, 
  Truck, 
  User, 
  FileText, 
  CheckCircle,
  WarningCircle,
  Trash,
  HandPointing,
  Barcode
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getDistributions, 
  dispatchDistribution 
} from '../services/api';
import type { Distribution } from '../services/api';

const SigCanvas = (SignatureCanvas as any).default || SignatureCanvas;

export default function MobileDispatch() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  
  // Driver Form State
  const [courierName, setCourierName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sigCanvasRef = useRef<any>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Load pending distributions
  const loadDistributions = async () => {
    try {
      const data = await getDistributions();
      const pendings = data.filter(d => d.status === 'pendente');
      setDistributions(pendings);

      // Auto-select if passed from QR Scanner state
      const autoSelectedId = location.state?.autoSelectedId;
      if (autoSelectedId) {
        const found = data.find(d => d.id === autoSelectedId);
        if (found) {
          // If not in pendings, add it to list temporarily so it can be selected
          if (!pendings.some(d => d.id === autoSelectedId)) {
            setDistributions(prev => [found, ...prev]);
          }
          handleSelectDistribution(autoSelectedId, [found, ...pendings]);
        }
      }
    } catch (err) {
      addToast('Erro ao carregar entregas pendentes', 'error');
    }
  };

  useEffect(() => {
    loadDistributions();
  }, []);

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  const handleSelectDistribution = (id: string, listOverride?: Distribution[]) => {
    setSelectedDistId(id);
    setErrorMessage(null);
    const list = listOverride || distributions;
    const dist = list.find(d => d.id === id);
    
    // Auto-fill pre-programmed driver from Fase 7
    setCourierName(dist?.assigned_driver || '');
    setVehiclePlate('');
    setDispatchSuccess(false);
    setTimeout(() => {
      if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
      }
    }, 100);
  };

  const handleDispatchSubmit = async () => {
    if (!selectedDistId) return;

    if (!courierName.trim()) {
      addToast('Por favor, informe o nome do condutor/motoboy.', 'error');
      return;
    }

    if (sigCanvasRef.current && sigCanvasRef.current.isEmpty()) {
      addToast('A assinatura digital do motoboy é obrigatória!', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const sigDataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');

      await dispatchDistribution(selectedDistId, {
        courier_name: courierName.trim(),
        vehicle_plate: vehiclePlate.trim() || undefined,
        courier_signature: sigDataUrl
      });

      addToast('Expedição realizada com sucesso! Peças em trânsito.', 'success');
      setDispatchSuccess(true);
      
      // Reload pending
      await loadDistributions();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      setErrorMessage(msg);
      addToast('Erro ao realizar expedição: ' + msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDist = distributions.find(d => d.id === selectedDistId);

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white pb-10">
      {/* Top Header */}
      <header className="bg-[#12141C] border-b border-dark-border/40 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => selectedDistId ? setSelectedDistId(null) : navigate('/mobile')}
          className="p-2 rounded-lg bg-dark-border/30 border border-dark-border/50 text-dark-dim hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} weight="bold" />
        </button>
        <div>
          <h1 className="font-outfit font-bold text-lg leading-tight tracking-wide">
            {selectedDistId ? 'Despachar Carga' : 'Expedição (Motoboy)'}
          </h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">
            {selectedDistId ? 'Informações de Envio' : 'Logística & Saída de Fábrica'}
          </p>
        </div>
      </header>

      <main className="px-4 mt-6 space-y-6">
        {!selectedDistId ? (
          /* LIST OF PENDING DISTRIBUTIONS */
          <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4 flex items-center gap-2 text-teal-400">
                <Truck size={22} weight="fill" />
                Cargas Pendentes de Envio
              </h2>
              <p className="text-xs text-dark-dim mb-4 leading-relaxed">
                Selecione um reparto recém-gerado abaixo para associar o motoboy, capturar a assinatura de retirada e liberar a saída de estoque da fábrica.
              </p>

              {distributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-dark-dim bg-dark-bg/20 rounded-xl border border-dark-border/25">
                  <CheckCircle size={42} className="text-emerald-500/60 mb-2" weight="duotone" />
                  <p className="text-sm font-bold text-white">Nenhum reparto pendente!</p>
                  <p className="text-xs mt-0.5">Todas as transferências já foram despachadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {distributions.map(dist => (
                    <button
                      key={dist.id}
                      onClick={() => handleSelectDistribution(dist.id)}
                      className="w-full bg-[#1A1C26] border border-dark-border/40 hover:border-teal-500/40 p-4 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                            {dist.store_name}
                          </span>
                          <span className="text-[9px] text-dark-dim uppercase font-bold">
                            {new Date(dist.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {dist.product?.name || 'Produto sem nome'} 
                          <span className="text-indigo-400 ml-1.5 text-xs font-mono font-medium">({dist.product?.reference || 'N/A'})</span>
                        </h3>
                        {/* Size Grade Summary */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(dist.size_grade || {}).map(([sz, qty]) => (
                            qty > 0 && (
                              <span key={sz} className="text-[10px] font-mono font-black bg-dark-bg/60 border border-dark-border/30 rounded px-1.5 py-0.5 text-dark-dim">
                                {sz}: <strong className="text-white font-black">{qty}</strong>
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 pl-2">
                        <span className="text-xs font-black text-white font-mono bg-dark-bg border border-dark-border/60 rounded px-2 py-1">
                          {dist.total_quantity} pçs
                        </span>
                        <span className="text-[9px] font-black uppercase text-teal-400 group-hover:translate-x-1 transition-transform">
                          Despachar →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DISPATCH FORM FOR SELECTED DISTRIBUTION */
          <div className="space-y-6">
            {dispatchSuccess ? (
              /* SUCCESS CARD */
              <div className="bg-dark-card border border-emerald-500/30 rounded-2xl p-6 text-center space-y-5 shadow-xl animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} weight="fill" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-outfit font-black text-xl text-white">Despachado com Sucesso!</h2>
                  <p className="text-xs text-dark-dim leading-relaxed px-2">
                    A carga para <strong className="text-emerald-400">{selectedDist?.store_name}</strong> está oficialmente <strong>Em Trânsito</strong>. O estoque correspondente foi deduzido da fábrica.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDistId(null)}
                  className="btn-primary w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 border-none font-bold text-sm shadow-md"
                >
                  Voltar à Lista
                </button>
              </div>
            ) : (
              /* FORM ENTRY */
              <>
                {/* Trava Operacional Error Alert Banner */}
                {errorMessage && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl p-4.5 shadow-xl space-y-2 flex items-start gap-3">
                    <WarningCircle size={24} className="flex-shrink-0 mt-0.5 text-rose-500 animate-pulse" />
                    <div>
                      <h4 className="font-outfit font-bold text-sm text-white">Bloqueio Operacional Detectado</h4>
                      <p className="text-xs text-rose-300 mt-1 leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Product/Cargo details summary */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="font-outfit font-bold text-xs text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode size={16} />
                    Resumo do Reparto
                  </h3>
                  
                  <div className="bg-dark-bg/50 border border-dark-border/30 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          selectedDist?.transfer_type === 'transferencia' ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-500/10 text-indigo-400'
                        } mb-1.5 inline-block`}>
                          {selectedDist?.transfer_type === 'transferencia' ? 'Transferência entre Lojas' : 'Envio Fábrica'}
                        </span>
                        <h4 className="text-sm font-black text-white">{selectedDist?.product?.name}</h4>
                        <p className="text-xs text-dark-dim font-bold font-mono">Ref: {selectedDist?.product?.reference}</p>
                        {selectedDist?.nf_number && (
                          <p className="text-xs text-indigo-400 font-bold font-mono mt-0.5">NF-e: {selectedDist.nf_number}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-xs uppercase font-black tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded">
                          Destino: {selectedDist?.store_name}
                        </span>
                        {selectedDist?.transfer_type === 'transferencia' && (
                          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Origem: {selectedDist?.origin_store}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-dark-border/30 my-2 pt-2">
                      <p className="text-[10px] text-dark-dim uppercase font-bold mb-1.5">Grade Prevista</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(selectedDist?.size_grade || {}).map(([sz, qty]) => (
                          qty > 0 && (
                            <div key={sz} className="bg-dark-bg border border-dark-border/40 rounded-lg p-2 text-center">
                              <span className="text-[10px] font-mono text-dark-dim block font-bold">{sz}</span>
                              <span className="text-sm font-mono font-black text-white">{qty}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-dark-bg/60 border border-dark-border/40 rounded-lg px-3 py-2 text-xs">
                      <span className="text-dark-dim font-bold uppercase">Total de Peças</span>
                      <strong className="text-sm font-mono font-black text-indigo-400">{selectedDist?.total_quantity} itens</strong>
                    </div>
                  </div>
                </div>

                {/* Courier Form fields */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="font-outfit font-bold text-sm text-teal-400 flex items-center gap-2">
                    <User size={18} />
                    Identificação do Condutor
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Nome do Condutor / Motoboy *</label>
                      <input 
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo de Souza"
                        className="w-full px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Placa(s) do Veículo (Opcional)</label>
                      <input 
                        type="text"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        placeholder="Ex: ABC-1234, Swaps de veículo"
                        className="w-full px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-mono font-medium"
                      />
                      <span className="text-[9px] text-dark-dim block leading-relaxed">
                        Caso ocorra troca de placas ou múltiplos veículos, registre todas separadas por vírgula.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver signature canvas */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="font-outfit font-bold text-sm text-indigo-300 flex items-center gap-2">
                    <FileText size={18} />
                    Termo de Transferência e Custódia
                  </h3>
                  
                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-2">
                    <p className="text-[11px] text-dark-dim leading-relaxed">
                      Eu, <strong className="text-white">{courierName || '___________'}</strong> (condutor responsável pelo transporte), declaro que recebi as <strong className="text-indigo-400">{selectedDist?.total_quantity} peças</strong> da fábrica acima especificadas. Assumo a custódia das peças e a responsabilidade civil e contratual pelo trânsito seguro até a entrega na loja <strong className="text-white">{selectedDist?.store_name}</strong>.
                    </p>
                  </div>

                  {/* Signature Board */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-dark-dim font-bold uppercase block">Assinatura Digital do Condutor *</span>
                    
                    <div className="bg-dark-bg border border-dark-border/60 rounded-xl overflow-hidden relative">
                      <SigCanvas 
                        ref={sigCanvasRef}
                        penColor="white"
                        canvasProps={{
                          className: 'w-full h-44 cursor-crosshair'
                        }}
                      />
                      {/* Clear button inside signature board */}
                      <button 
                        onClick={handleClearSignature}
                        className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded bg-[#1A1C26] border border-dark-border/40 text-[10px] font-black text-dark-dim hover:text-white transition-colors flex items-center gap-1 active:scale-95"
                      >
                        <Trash size={12} />
                        Limpar
                      </button>
                      {/* Hand Indicator */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none opacity-40">
                        <HandPointing size={14} className="text-dark-dim" />
                        <span className="text-[9px] font-bold text-dark-dim uppercase">Assine na tela</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Dispatch */}
                  <button 
                    onClick={handleDispatchSubmit}
                    disabled={isSubmitting}
                    className="btn-primary w-full py-4 bg-gradient-to-r from-teal-500 to-indigo-600 border-none font-bold text-sm shadow-lg mt-3 hover:scale-101 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? 'Registrando Despacho...' : 'Confirmar Envio & Iniciar Trânsito'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
