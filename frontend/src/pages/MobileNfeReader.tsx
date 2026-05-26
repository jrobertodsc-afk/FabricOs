import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Barcode, 
  ArrowLeft, 
  CheckCircle, 
  Warning, 
  Info,
  Stack,
  Scissors
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getXmlReconciliation, 
  confirmXmlReconciliation
} from '../services/api';
import type { 
  XmlReconciliationSuggestion
} from '../services/api';

export default function MobileNfeReader() {
  const [nfeKey, setNfeKey] = useState('');
  const [suggestion, setSuggestion] = useState<XmlReconciliationSuggestion | null>(null);
  const [physicalGrade, setPhysicalGrade] = useState<Record<string, number>>({});
  const [losses, setLosses] = useState<Record<string, number>>({});
  const [rawMaterialBatch, setRawMaterialBatch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Simulated scanner key fill
  const handleSimulateScan = () => {
    // Standard 44-digit NF-e key where invoice number is represented
    const mockKey = "35260512345678000190550010000001231008765432";
    setNfeKey(mockKey);
    addToast('Código de barras simulado com sucesso!', 'info');
  };

  const handleSearchNfe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfeKey.trim()) {
      addToast('Por favor, informe ou bipe a chave da NF-e', 'error');
      return;
    }

    setIsSearching(true);
    setSuggestion(null);
    setSuccessData(null);
    try {
      const res = await getXmlReconciliation(nfeKey);
      setSuggestion(res);
      
      // Pre-fill physical grade with suggested grade for ease
      setPhysicalGrade({ ...res.suggested_size_grade });
      
      // Initialize losses at 0
      const initialLosses: Record<string, number> = {};
      Object.keys(res.suggested_size_grade).forEach(size => {
        initialLosses[size] = 0;
      });
      setLosses(initialLosses);
      
      addToast('Grade de NF-e e OP correspondente encontradas!', 'success');
    } catch (err: any) {
      addToast('Erro ao buscar NF-e: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePhysicalGradeChange = (size: string, val: number) => {
    setPhysicalGrade(prev => ({
      ...prev,
      [size]: Math.max(0, val)
    }));
  };

  const handleLossChange = (size: string, val: number) => {
    setLosses(prev => ({
      ...prev,
      [size]: Math.max(0, val)
    }));
  };

  const handleConfirmReconciliation = async () => {
    if (!suggestion) return;

    setIsSubmitting(true);
    try {
      // Calculate adjusted reconciled grade: subtract any physical losses from physical grade
      // or post the actual count. The backend XML endpoint handles pieces creation.
      // Let's pass the physical checked grade
      const payload = {
        reconciled_size_grade: physicalGrade,
        raw_material_batch: rawMaterialBatch || undefined,
        nf_number: suggestion.nf_number
      };

      const res = await confirmXmlReconciliation(suggestion.order_id, payload);
      setSuccessData(res);
      addToast('Conciliação física confirmada com sucesso!', 'success');
    } catch (err: any) {
      addToast('Erro na conciliação: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get discrepancy
  const getDiscrepancy = (size: string) => {
    const sug = suggestion?.suggested_size_grade[size] || 0;
    const phys = physicalGrade[size] || 0;
    return phys - sug;
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white pb-10">
      {/* Navigation Header */}
      <header className="bg-[#12141C] border-b border-dark-border/40 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-lg bg-dark-border/30 border border-dark-border/50 text-dark-dim hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-outfit font-bold text-base leading-tight">Conferência NF-e</h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Módulo de Recebimento</p>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Scanner Simulation */}
        {!suggestion && !successData && (
          <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="relative w-24 h-24 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 overflow-hidden group">
                <Barcode size={48} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                {/* Neon line scanning effect */}
                <div className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_10px_#10B981] animate-bounce top-0" />
              </div>
              <h2 className="font-outfit font-bold text-base">Aponte o Leitor ou Insira a Chave</h2>
              <p className="text-xs text-dark-dim leading-relaxed">
                Leia o código de barras de 44 dígitos impresso no DANFE recebido para carregar os dados de produção correspondentes.
              </p>
            </div>

            <form onSubmit={handleSearchNfe} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-dark-dim font-bold uppercase tracking-wider block">Chave de Acesso NF-e</label>
                <input 
                  type="text" 
                  value={nfeKey}
                  onChange={(e) => setNfeKey(e.target.value)}
                  placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                  maxLength={44}
                  className="input-field text-center font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal py-3.5 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleSimulateScan}
                  className="btn-secondary py-3.5 flex justify-center items-center"
                >
                  Bipar NF-e Mock
                </button>
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="btn-primary py-3.5 flex justify-center items-center"
                >
                  {isSearching ? 'Buscando...' : 'Carregar Ordem'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Suggestion & Physical Reconciliation Details */}
        {suggestion && !successData && (
          <div className="space-y-6">
            {/* Found OP Info Card */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-start border-b border-dark-border/40 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    NF-e Conciliada: #{suggestion.nf_number}
                  </span>
                  <h3 className="font-outfit font-black text-lg text-white mt-2 leading-tight">{suggestion.product_name}</h3>
                  <p className="text-xs text-dark-dim mt-0.5">OP #{suggestion.order_number}</p>
                </div>
                <div className="text-right bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                  <p className="text-xs text-dark-dim font-bold">Volume Total</p>
                  <p className="text-base font-black text-indigo-400 mt-0.5">{suggestion.total_quantity} pçs</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-dark-dim font-bold block">FACÇÃO ORIGEM</span>
                  <span className="text-white font-black block mt-0.5 text-sm">{suggestion.partner_name || 'Interna'}</span>
                </div>
                <div>
                  <span className="text-dark-dim font-bold block">TIPO NF-e</span>
                  <span className="text-white font-black block mt-0.5 text-sm">Retorno de Industrialização</span>
                </div>
              </div>
            </div>

            {/* Reconciliation Grid */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-outfit font-bold text-base flex items-center gap-2 text-indigo-300">
                  <Stack size={18} />
                  Conferência Física por Tamanho
                </h3>
                <p className="text-xs text-dark-dim mt-0.5">Informe as quantidades reais que entraram no acervo físico.</p>
              </div>

              <div className="space-y-3.5 mt-4">
                {Object.keys(suggestion.suggested_size_grade).map(size => {
                  const sugVal = suggestion.suggested_size_grade[size] || 0;
                  const physVal = physicalGrade[size] || 0;
                  const diff = getDiscrepancy(size);

                  return (
                    <div 
                      key={size}
                      className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-3 flex items-center justify-between gap-4"
                    >
                      <div className="w-10">
                        <span className="text-base font-black text-indigo-400">{size}</span>
                      </div>

                      {/* Suggested */}
                      <div className="text-center w-16">
                        <span className="text-[10px] text-dark-dim font-bold block">Sugerido</span>
                        <span className="text-sm font-bold text-white block mt-0.5">{sugVal}</span>
                      </div>

                      {/* Discrepancy indicator */}
                      <div className="w-14 text-center">
                        <span className="text-[10px] text-dark-dim font-bold block">Desvio</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded block mt-0.5 ${
                          diff === 0 
                            ? 'bg-dark-border/40 text-dark-dim' 
                            : diff > 0 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>

                      {/* Input for physical */}
                      <div className="w-20">
                        <input 
                          type="number"
                          value={physVal}
                          onChange={(e) => handlePhysicalGradeChange(size, parseInt(e.target.value) || 0)}
                          className="w-full bg-dark-bg border border-dark-border rounded-lg text-center p-2 text-sm font-bold outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Avarias e Lote de Matéria Prima */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="font-outfit font-bold text-base text-rose-400 flex items-center gap-2">
                <Warning size={18} />
                Controle de Custódia e Avarias
              </h3>
              
              <div className="space-y-4">
                {/* Rolo de Tecido */}
                <div className="space-y-2">
                  <label className="text-xs text-dark-dim font-bold uppercase tracking-wider block">Lote de Matéria-Prima (Rolo de Tecido)</label>
                  <input 
                    type="text"
                    value={rawMaterialBatch}
                    onChange={(e) => setRawMaterialBatch(e.target.value)}
                    placeholder="Ex: ROLO-LINHO-877"
                    className="input-field"
                  />
                </div>

                <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl flex items-start gap-3">
                  <Info size={20} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-dark-dim leading-relaxed">
                    Eventuais faltas físicas de grade (desvios negativos) serão automaticamente computadas como avarias/perdas pendentes no FabricOS em desfavor do parceiro costureiro/facção.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button 
                onClick={() => setSuggestion(null)}
                className="btn-secondary py-3.5 w-1/3 flex justify-center font-bold"
              >
                Voltar
              </button>
              <button 
                onClick={handleConfirmReconciliation}
                disabled={isSubmitting}
                className="btn-primary py-3.5 w-2/3 flex justify-center font-bold"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        )}

        {/* Success screen */}
        {successData && (
          <div className="bg-dark-card border border-emerald-500/20 rounded-2xl p-6 text-center space-y-5 shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} weight="fill" />
            </div>

            <div className="space-y-2">
              <h2 className="font-outfit font-black text-xl">Conciliação Concluída!</h2>
              <p className="text-xs text-dark-dim leading-relaxed px-2">
                O recebimento físico da NF-e foi homologado. A grade física foi registrada e os saldos foram atualizados.
              </p>
            </div>

            <div className="bg-[#1A1C26] rounded-xl p-4.5 text-left border border-dark-border/40 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Código do Retorno</span>
                <span className="text-emerald-400 font-bold">Sucesso</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Mensagem</span>
                <span className="text-white font-medium text-right max-w-[180px] truncate">{successData.message}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Peças RFID Geradas</span>
                <span className="text-indigo-400 font-bold">{successData.pieces_created || 0} unidades</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setSuggestion(null);
                setSuccessData(null);
                setNfeKey('');
                navigate('/mobile');
              }}
              className="btn-primary w-full py-3.5 justify-center font-bold"
            >
              Voltar ao Início
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
