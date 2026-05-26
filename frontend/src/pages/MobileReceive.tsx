import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { 
  ArrowLeft, 
  Storefront, 
  User, 
  FileText, 
  CheckCircle,
  WarningCircle,
  Trash,
  HandPointing,
  Warning,
  Plus,
  Minus
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getDistributions, 
  receiveDistribution 
} from '../services/api';
import type { Distribution } from '../services/api';

const SigCanvas = (SignatureCanvas as any).default || SignatureCanvas;

export default function MobileReceive() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  
  // Received Form State
  const [receivedGrade, setReceivedGrade] = useState<Record<string, number>>({});
  const [receivedBy, setReceivedBy] = useState('');
  const [receiverRole, setReceiverRole] = useState('Estoquista');
  const [receiverMatricula, setReceiverMatricula] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);

  const sigCanvasRef = useRef<any>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Load in-transit distributions
  const loadDistributions = async () => {
    try {
      const data = await getDistributions();
      const inTransit = data.filter(d => d.status === 'em_transito');
      setDistributions(inTransit);

      // Auto-select if passed from QR Scanner state
      const autoSelectedId = location.state?.autoSelectedId;
      if (autoSelectedId) {
        const found = data.find(d => d.id === autoSelectedId);
        if (found) {
          if (!inTransit.some(d => d.id === autoSelectedId)) {
            setDistributions(prev => [found, ...prev]);
          }
          handleSelectDistribution(found);
        }
      }
    } catch (err) {
      addToast('Erro ao carregar cargas em trânsito', 'error');
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

  const handleSelectDistribution = (dist: Distribution) => {
    setSelectedDistId(dist.id);
    
    // Pre-fill received grade with expected grade
    const initialGrade: Record<string, number> = {};
    Object.entries(dist.size_grade || {}).forEach(([sz, qty]) => {
      initialGrade[sz] = qty;
    });
    setReceivedGrade(initialGrade);
    
    setReceivedBy('');
    setReceiverRole('Estoquista');
    setReceiverMatricula('');
    setDiscrepancyNotes('');
    setReceiveSuccess(false);

    setTimeout(() => {
      if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
      }
    }, 100);
  };

  const handleAdjustQty = (size: string, adjustment: number) => {
    setReceivedGrade(prev => {
      const current = prev[size] || 0;
      const next = Math.max(0, current + adjustment);
      return { ...prev, [size]: next };
    });
  };

  const handleReceiveSubmit = async () => {
    if (!selectedDistId) return;

    if (!receivedBy.trim()) {
      addToast('Por favor, informe o nome de quem está recebendo as peças.', 'error');
      return;
    }

    if (!receiverRole.trim()) {
      addToast('Por favor, informe o cargo do recebedor.', 'error');
      return;
    }

    if (!receiverMatricula.trim()) {
      addToast('Por favor, informe a matrícula de quem está recebendo.', 'error');
      return;
    }

    if (sigCanvasRef.current && sigCanvasRef.current.isEmpty()) {
      addToast('A assinatura digital da estoquista é obrigatória!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const sigDataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');

      await receiveDistribution(selectedDistId, {
        received_by: receivedBy.trim(),
        receiver_role: receiverRole.trim(),
        receiver_matricula: receiverMatricula.trim(),
        received_signature: sigDataUrl,
        received_grade: receivedGrade,
        discrepancy_notes: discrepancyNotes.trim() || undefined
      });

      addToast('Recebimento concluído! Estoque de loja atualizado.', 'success');
      setReceiveSuccess(true);
      
      // Reload in-transit
      await loadDistributions();
    } catch (err: any) {
      addToast('Erro ao realizar recebimento: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDist = distributions.find(d => d.id === selectedDistId);

  // Compute expected vs received totals
  const totalExpected = selectedDist ? selectedDist.total_quantity : 0;
  const totalReceived = Object.values(receivedGrade).reduce((sum, val) => sum + val, 0);
  const totalDiscrepancy = totalReceived - totalExpected;

  // Compute individual size discrepancies
  const sizeDiscrepancies = selectedDist ? Object.keys(selectedDist.size_grade || {}).map(sz => {
    const expected = selectedDist.size_grade[sz] || 0;
    const received = receivedGrade[sz] || 0;
    const diff = received - expected;
    return { size: sz, expected, received, diff };
  }) : [];

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
            {selectedDistId ? 'Conferir Entrada' : 'Recebimento de Lojas'}
          </h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">
            {selectedDistId ? 'Estoque da Loja' : 'Conferência física no celular'}
          </p>
        </div>
      </header>

      <main className="px-4 mt-6 space-y-6">
        {!selectedDistId ? (
          /* LIST OF IN-TRANSIT DISTRIBUTIONS */
          <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4 flex items-center gap-2 text-indigo-400">
                <Storefront size={22} weight="fill" />
                Cargas Em Trânsito (Lojas)
              </h2>
              <p className="text-xs text-dark-dim mb-4 leading-relaxed">
                Selecione um reparto em trânsito direcionado para a sua loja para realizar a conferência física da grade e capturar a assinatura de recebimento.
              </p>

              {distributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-dark-dim bg-dark-bg/20 rounded-xl border border-dark-border/25">
                  <CheckCircle size={42} className="text-emerald-500/60 mb-2" weight="duotone" />
                  <p className="text-sm font-bold text-white">Nenhuma carga em trânsito!</p>
                  <p className="text-xs mt-0.5">Não há repartos pendentes de recebimento no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {distributions.map(dist => (
                    <button
                      key={dist.id}
                      onClick={() => handleSelectDistribution(dist)}
                      className="w-full bg-[#1A1C26] border border-dark-border/40 hover:border-indigo-500/40 p-4 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            {dist.store_name}
                          </span>
                          <span className="text-[9px] text-dark-dim uppercase font-bold">
                            Motoboy: {dist.courier_name}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {dist.product?.name || 'Produto sem nome'} 
                          <span className="text-teal-400 ml-1.5 text-xs font-mono font-medium">({dist.product?.reference || 'N/A'})</span>
                        </h3>
                        {/* Summary of what was sent */}
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
                        <span className="text-[9px] font-black uppercase text-indigo-400 group-hover:translate-x-1 transition-transform">
                          Conferir →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* RECEIVE & VERIFICATION FORM */
          <div className="space-y-6">
            {receiveSuccess ? (
              /* SUCCESS CARD */
              <div className="bg-dark-card border border-emerald-500/30 rounded-2xl p-6 text-center space-y-5 shadow-xl animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} weight="fill" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-outfit font-black text-xl text-white">Entrada Confirmada!</h2>
                  <p className="text-xs text-dark-dim leading-relaxed px-2">
                    A carga da loja <strong className="text-indigo-400">{selectedDist?.store_name}</strong> foi registrada e o estoque local foi devidamente abastecido.
                  </p>
                  {totalDiscrepancy !== 0 && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl max-w-sm mx-auto text-left mt-3">
                      <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                        <Warning size={16} />
                        Divergência de Transporte Registrada:
                      </p>
                      <p className="text-[11px] text-dark-dim mt-1">
                        Diferença de {totalDiscrepancy} peças registradas como "Perda em trânsito" associadas ao motoboy {selectedDist?.courier_name}.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDistId(null)}
                  className="btn-primary w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 border-none font-bold text-sm shadow-md"
                >
                  Voltar à Lista
                </button>
              </div>
            ) : (
              /* COUNTING FORM */
              <>
                {/* Expected vs Actual Count Grid */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-outfit font-bold text-sm text-indigo-300">
                        Conferência Física da Grade
                      </h3>
                      <p className="text-[11px] text-dark-dim mt-0.5">
                        Ajuste os valores caso encontre divergências ou avarias.
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-black bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">
                      Loja: {selectedDist?.store_name}
                    </span>
                  </div>

                  <div className="bg-dark-bg/60 border border-dark-border/30 rounded-xl p-4 space-y-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          selectedDist?.transfer_type === 'transferencia' ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {selectedDist?.transfer_type === 'transferencia' ? 'Transferência' : 'Envio Fábrica'}
                        </span>
                        {selectedDist?.nf_number && (
                          <span className="text-[9px] text-indigo-300 font-bold bg-[#1A1C26] border border-dark-border/40 px-2 py-0.5 rounded">
                            NF-e: {selectedDist.nf_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-dark-dim uppercase font-bold block">Produto em Trânsito</span>
                      <h4 className="text-sm font-black text-white">
                        {selectedDist?.product?.name} 
                        <span className="text-indigo-400 font-mono font-medium text-xs ml-1.5">({selectedDist?.product?.reference})</span>
                      </h4>
                      <p className="text-[10px] text-dark-dim">
                        Despachado por: <strong className="text-white">{selectedDist?.courier_name}</strong> {selectedDist?.vehicle_plate ? `(Placa: ${selectedDist.vehicle_plate})` : ''}
                      </p>
                      {selectedDist?.transfer_type === 'transferencia' && (
                        <p className="text-[10px] text-amber-400 font-semibold bg-amber-500/5 py-1 px-2.5 rounded border border-amber-500/10 mt-1 inline-block">
                          Origem: {selectedDist.origin_store}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-dark-border/30 my-3 pt-3">
                      <p className="text-[10px] text-dark-dim uppercase font-bold mb-3">Conferir Tamanhos</p>
                      
                      <div className="space-y-3.5">
                        {sizeDiscrepancies.map(({ size, expected, received, diff }) => (
                          <div key={size} className="flex items-center justify-between bg-dark-bg/50 border border-dark-border/20 rounded-xl p-2.5">
                            {/* Size descriptor */}
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono font-black text-indigo-300">
                                {size}
                              </div>
                              <div>
                                <span className="text-[10px] text-dark-dim font-bold block">Previsto</span>
                                <span className="text-xs font-mono font-black text-white">{expected} unidades</span>
                              </div>
                            </div>

                            {/* Quantity Editor */}
                            <div className="flex items-center gap-3">
                              {/* Minus */}
                              <button
                                onClick={() => handleAdjustQty(size, -1)}
                                className="w-8 h-8 rounded-lg bg-[#1A1C26] border border-dark-border/40 text-dark-dim hover:text-white flex items-center justify-center transition-colors active:scale-90"
                              >
                                <Minus size={12} weight="bold" />
                              </button>

                              {/* Physical input value */}
                              <span className="text-base font-black text-white font-mono w-8 text-center">
                                {received}
                              </span>

                              {/* Plus */}
                              <button
                                onClick={() => handleAdjustQty(size, 1)}
                                className="w-8 h-8 rounded-lg bg-[#1A1C26] border border-dark-border/40 text-dark-dim hover:text-white flex items-center justify-center transition-colors active:scale-90"
                              >
                                <Plus size={12} weight="bold" />
                              </button>
                            </div>

                            {/* Discrepancy indicator */}
                            <div className="w-16 text-right pr-2">
                              {diff === 0 ? (
                                <span className="text-[10px] font-bold text-emerald-400">OK</span>
                              ) : diff < 0 ? (
                                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                  {diff} pç
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                  +{diff} pç
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary comparison bar */}
                    <div className="border-t border-dark-border/30 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-dark-dim uppercase font-bold block">Consolidado Físico</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-black font-mono text-white">{totalReceived}</span>
                          <span className="text-xs text-dark-dim">de {totalExpected} previstos</span>
                        </div>
                      </div>

                      {totalDiscrepancy !== 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
                          <WarningCircle size={16} className="text-rose-400 animate-pulse" />
                          <span className="text-[11px] font-black text-rose-400 uppercase tracking-wide">
                            {totalDiscrepancy} Divergente
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="font-outfit font-bold text-sm text-teal-400 flex items-center gap-2">
                    <User size={18} />
                    Identificação do Recebedor (Loja)
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Nome Completo *</label>
                      <input 
                        type="text"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder="Ex: Amanda Silva Fernandes"
                        className="w-full px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Cargo / Função *</label>
                        <input 
                          type="text"
                          value={receiverRole}
                          onChange={(e) => setReceiverRole(e.target.value)}
                          placeholder="Ex: Estoquista"
                          className="w-full px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-medium"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Matrícula funcional *</label>
                        <input 
                          type="text"
                          value={receiverMatricula}
                          onChange={(e) => setReceiverMatricula(e.target.value)}
                          placeholder="Ex: 8872-X"
                          className="w-full px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-mono font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-dark-dim font-bold uppercase tracking-wider block">Observações de Avarias ou Notas</label>
                      <textarea 
                        value={discrepancyNotes}
                        onChange={(e) => setDiscrepancyNotes(e.target.value)}
                        placeholder="Caso alguma peça tenha chegado rasgada, manchada ou faltando, detalhe aqui."
                        className="w-full h-20 px-4 py-3 bg-[#1A1C26] border border-dark-border/60 rounded-xl text-sm text-white placeholder-dark-dim focus:outline-none focus:border-teal-500/60 transition-all font-medium resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Digital Signature of Stockist */}
                <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="font-outfit font-bold text-sm text-indigo-300 flex items-center gap-2">
                    <FileText size={18} />
                    Termo de Recebimento de Carga
                  </h3>
                  
                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-2">
                    <p className="text-[11px] text-dark-dim leading-relaxed">
                      Eu, <strong className="text-white">{receivedBy || '___________'}</strong>, na qualidade de <strong className="text-white">{receiverRole}</strong> da loja <strong className="text-white">{selectedDist?.store_name}</strong>, atesto que realizei a contagem física da grade recebida e confirmo o recebimento de <strong className="text-indigo-400">{totalReceived} peças</strong> no sistema. Declaro encerrada a custódia de transporte do motoboy <strong className="text-white">{selectedDist?.courier_name}</strong>.
                    </p>
                  </div>

                  {/* Signature Board */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-dark-dim font-bold uppercase block">Assinatura Digital da Estoquista *</span>
                    
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

                  {/* Submit Receive */}
                  <button 
                    onClick={handleReceiveSubmit}
                    disabled={isSubmitting}
                    className="btn-primary w-full py-4 bg-gradient-to-r from-indigo-500 to-teal-500 border-none font-bold text-sm shadow-lg mt-3 hover:scale-101 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? 'Registrando Entrada...' : 'Confirmar Recebimento & Abastecer Loja'}
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
