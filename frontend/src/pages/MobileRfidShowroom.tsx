import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { 
  ArrowLeft, 
  Radio, 
  User, 
  Hand, 
  FileText, 
  CheckCircle,
  WarningCircle,
  Trash,
  HandPointing
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getEmployees, 
  getPartners, 
  getPieces, 
  rfidCheckout
} from '../services/api';
import type { 
  Employee,
  Partner,
  Piece,
  Withdrawal
} from '../services/api';

export default function MobileRfidShowroom() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [scannedPieces, setScannedPieces] = useState<Piece[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWithdrawerType, setSelectedWithdrawerType] = useState<'colaborador' | 'parceiro'>('colaborador');
  const [selectedWithdrawerId, setSelectedWithdrawerId] = useState('');
  const [personName, setPersonName] = useState('');
  const [reason, setReason] = useState('Exibição em Showroom / Amostra');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<Withdrawal | null>(null);

  const sigCanvasRef = useRef<any>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load Withdrawing entities
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const emps = await getEmployees();
        setEmployees(emps.filter(e => e.is_active));

        const pts = await getPartners();
        setPartners(pts.filter(p => p.is_active));
      } catch (err) {
        addToast('Erro ao carregar colaboradores/parceiros', 'error');
      }
    };
    loadEntities();
  }, []);

  // Set default Withdrawer ID when type changes
  useEffect(() => {
    if (selectedWithdrawerType === 'colaborador' && employees.length > 0) {
      setSelectedWithdrawerId(employees[0].id);
    } else if (selectedWithdrawerType === 'parceiro' && partners.length > 0) {
      setSelectedWithdrawerId(partners[0].id);
    } else {
      setSelectedWithdrawerId('');
    }
  }, [selectedWithdrawerType, employees, partners]);

  const handleStartScanning = async () => {
    setIsScanning(true);
    setScannedPieces([]);
    setCheckoutResult(null);

    // Scan radar effect simulation
    setTimeout(async () => {
      try {
        // Fetch pieces in stock status
        const pieces = await getPieces('estoque');
        
        if (pieces.length > 0) {
          // Pull 2-3 random pieces from inventory to simulate showroom detection
          const count = Math.min(pieces.length, Math.floor(Math.random() * 2) + 2);
          const shuffled = [...pieces].sort(() => 0.5 - Math.random());
          const detected = shuffled.slice(0, count);
          setScannedPieces(detected);
          addToast(`${count} etiquetas RFID identificadas com sucesso!`, 'success');
        } else {
          // Fallback mockup pieces if database is completely empty
          const fallback: Piece[] = [
            {
              id: 'fallback-1',
              product_id: 'prod-1',
              rfid_epc: '3038BOAH001P887AC',
              size: 'M',
              status: 'estoque',
              created_at: new Date().toISOString(),
              product: {
                id: 'prod-1',
                reference: 'REF-887',
                name: 'Vestido Linho Sol',
                type: 'produto_acabado',
                base_price: 329.90,
                materials: [],
                created_at: new Date().toISOString()
              }
            },
            {
              id: 'fallback-2',
              product_id: 'prod-2',
              rfid_epc: '3038BOAH002G998CD',
              size: 'G',
              status: 'estoque',
              created_at: new Date().toISOString(),
              product: {
                id: 'prod-2',
                reference: 'REF-998',
                name: 'Camisa Algodão Leve',
                type: 'produto_acabado',
                base_price: 189.90,
                materials: [],
                created_at: new Date().toISOString()
              }
            }
          ];
          setScannedPieces(fallback);
          addToast('Antena simulada: 2 etiquetas padrão detectadas.', 'info');
        }
      } catch (err) {
        addToast('Erro ao ler antena RFID', 'error');
      } finally {
        setIsScanning(false);
      }
    }, 2500);
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  const handleCheckoutSubmit = async () => {
    if (scannedPieces.length === 0) {
      addToast('Erro: Nenhuma peça identificada na antena!', 'error');
      return;
    }
    if (!personName.trim()) {
      addToast('Por favor, insira o nome de quem está retirando', 'error');
      return;
    }
    if (!agreedTerms) {
      addToast('Você precisa aceitar os termos de responsabilidade financeira', 'error');
      return;
    }
    if (sigCanvasRef.current && sigCanvasRef.current.isEmpty()) {
      addToast('A assinatura digital do termo é obrigatória!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const epcs = scannedPieces.map(p => p.rfid_epc).filter((x): x is string => !!x);
      
      const payload = {
        rfid_epcs: epcs,
        employee_id: selectedWithdrawerType === 'colaborador' ? selectedWithdrawerId : undefined,
        partner_id: selectedWithdrawerType === 'parceiro' ? selectedWithdrawerId : undefined,
        person_name: personName,
        reason: reason,
        destination: 'Showroom Check-out RFID',
        replacement_cost_agreed: totalCost
      };

      const res = await rfidCheckout(payload);
      setCheckoutResult(res);
      addToast('Check-out concluído! Peças registradas no acervo do operador.', 'success');
    } catch (err: any) {
      addToast('Erro no checkout: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = scannedPieces.reduce((sum, p) => sum + (p.product?.base_price || 0), 0);

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
          <h1 className="font-outfit font-bold text-base leading-tight">RFID Showroom</h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Antena Bluetooth Simulada</p>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {!checkoutResult ? (
          <>
            {/* Bluetooth Antenna Radar Controller */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col items-center">
              {isScanning ? (
                /* Glowing pulses animation */
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-ping" />
                  <div className="absolute inset-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-pulse" />
                  <div className="absolute inset-8 rounded-full bg-indigo-500/25 border border-indigo-500/40" />
                  <Radio size={36} className="text-indigo-400 z-10 animate-spin" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Radio size={36} className="text-indigo-400" />
                </div>
              )}

              <div className="text-center space-y-1">
                <h2 className="font-outfit font-bold text-base">Antena de Showroom RFID</h2>
                <p className="text-xs text-dark-dim leading-relaxed max-w-[260px] mx-auto">
                  Aproxime as peças com tag RFID da antena e clique abaixo para detectar e listar os itens.
                </p>
              </div>

              <button 
                onClick={handleStartScanning}
                disabled={isScanning}
                className="btn-primary w-full py-3.5 justify-center font-bold text-sm"
              >
                {isScanning ? 'Varrendo Campo RFID...' : 'Ativar Varredura RFID'}
              </button>
            </div>

            {/* Scanned Items list */}
            {scannedPieces.length > 0 && (
              <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-dark-border/40 pb-3">
                  <h3 className="font-outfit font-bold text-sm text-indigo-300">Itens Identificados ({scannedPieces.length})</h3>
                  <span className="text-xs font-black text-white">R$ {totalCost.toFixed(2)} total</span>
                </div>

                <div className="space-y-3.5">
                  {scannedPieces.map(piece => (
                    <div 
                      key={piece.id}
                      className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-3 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-[9px] uppercase font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                          Tamanho {piece.size}
                        </span>
                        <h4 className="font-bold text-xs text-white mt-1.5">{piece.product?.name}</h4>
                        <p className="text-[9.5px] text-dark-dim font-mono mt-0.5">{piece.rfid_epc}</p>
                      </div>
                      <span className="text-xs font-black text-white">R$ {piece.product?.base_price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custody Form */}
            {scannedPieces.length > 0 && (
              <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="font-outfit font-bold text-sm text-teal-400 flex items-center gap-2">
                  <User size={18} />
                  Responsável pelo Recebimento
                </h3>

                <div className="space-y-4">
                  {/* Select withdrawer type */}
                  <div className="grid grid-cols-2 gap-2">
                    {['colaborador', 'parceiro'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedWithdrawerType(type as any)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                          selectedWithdrawerType === type 
                            ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow'
                            : 'bg-[#1A1C26] border-dark-border/60 text-dark-dim'
                        }`}
                      >
                        {type === 'colaborador' ? 'Colaborador Interno' : 'Parceiro Costura'}
                      </button>
                    ))}
                  </div>

                  {/* Select withdrawer entity */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-dark-dim font-bold uppercase block">Nome da Entidade</label>
                    <select
                      value={selectedWithdrawerId}
                      onChange={(e) => setSelectedWithdrawerId(e.target.value)}
                      className="w-full bg-[#1A1C26] border border-dark-border rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-teal-500"
                    >
                      {selectedWithdrawerType === 'colaborador' ? (
                        employees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                        ))
                      ) : (
                        partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Physical person name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-dark-dim font-bold uppercase block">Portador da Retirada (Quem veio buscar)</label>
                    <input 
                      type="text" 
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Nome completo do portador"
                      className="input-field"
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-dark-dim font-bold uppercase block">Finalidade / Observações</label>
                    <input 
                      type="text" 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Foto de campanha, amostra de facção"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Responsibility Term & Signature Canvas */}
            {scannedPieces.length > 0 && (
              <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="font-outfit font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <FileText size={18} />
                  Termo de Responsabilidade Custódia
                </h3>

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-3">
                  <p className="text-[11.5px] text-dark-dim leading-relaxed">
                    Eu, <strong className="text-white">{personName || '___________'}</strong>, assumo total custódia e responsabilidade pela integridade física das peças retiradas do acervo acima discriminadas. 
                  </p>
                  <p className="text-[11.5px] text-dark-dim leading-relaxed">
                    Comprometo-me a realizar a devolução das amostras limpas e intactas no prazo estipulado. Em caso de perda, avaria irreversível ou extravio, concordo com o ressarcimento financeiro integral do custo de reposição estimado em <strong className="text-indigo-400">R$ {totalCost.toFixed(2)}</strong>.
                  </p>

                  <label className="flex items-center gap-3.5 mt-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-dark-border text-indigo-600 focus:ring-indigo-500 bg-[#1A1C26]"
                    />
                    <span className="text-[11px] font-bold text-white select-none">Aceito as obrigações e custos descritos.</span>
                  </label>
                </div>

                {/* Signature Board */}
                <div className="space-y-2">
                  <span className="text-[10px] text-dark-dim font-bold uppercase block">Assinatura Digital do Portador</span>
                  
                  <div className="bg-dark-bg border border-dark-border/60 rounded-xl overflow-hidden relative">
                    <SignatureCanvas 
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
                      <span className="text-[9px] font-bold text-dark-dim uppercase">Assine aqui</span>
                    </div>
                  </div>
                </div>

                {/* Submit Checkout */}
                <button 
                  onClick={handleCheckoutSubmit}
                  disabled={isSubmitting}
                  className="btn-primary w-full py-4 justify-center font-bold text-sm shadow-lg mt-3"
                >
                  {isSubmitting ? 'Gerando Termo & Retirada...' : 'Assinar & Confirmar Retirada Showroom'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-dark-card border border-emerald-500/20 rounded-2xl p-6 text-center space-y-5 shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} weight="fill" />
            </div>

            <div className="space-y-2">
              <h2 className="font-outfit font-black text-xl">Check-out Concluído!</h2>
              <p className="text-xs text-dark-dim leading-relaxed px-2">
                O Termo de Responsabilidade Custódia foi assinado digitalmente e a retirada do showroom foi autorizada.
              </p>
            </div>

            <div className="bg-[#1A1C26] rounded-xl p-4.5 text-left border border-dark-border/40 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Código do Termo</span>
                <span className="text-emerald-400 font-mono font-bold">{checkoutResult.tracking_code}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Responsável</span>
                <span className="text-white font-bold">{checkoutResult.person_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Custo Estipulado</span>
                <span className="text-indigo-400 font-bold">R$ {checkoutResult.replacement_cost_agreed?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Custódia Auditada</span>
                <span className="text-emerald-400 font-bold">SIM (Auto-Confirmado)</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setCheckoutResult(null);
                setScannedPieces([]);
                setPersonName('');
                setAgreedTerms(false);
                navigate('/mobile');
              }}
              className="btn-primary w-full py-3.5 justify-center font-bold"
            >
              Voltar ao Showroom
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
