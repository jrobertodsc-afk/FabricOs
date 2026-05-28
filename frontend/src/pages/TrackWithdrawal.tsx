import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Calendar, 
  User, 
  MapPin, 
  Note, 
  ShieldCheck, 
  Fingerprint, 
  Image, 
  ArrowLeft,
  WarningCircle
} from '@phosphor-icons/react';
import { trackWithdrawal, API_BASE_URL } from '../services/api';
import type { Withdrawal } from '../services/api';

const TrackWithdrawal: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        if (!code) return;
        const data = await trackWithdrawal(code);
        setWithdrawal(data);
      } catch (err: any) {
        console.error("Error fetching tracking data:", err);
        setError(err.response?.data?.detail || "Código de rastreamento inválido ou não encontrado.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrackingData();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-dark-dim text-sm font-semibold animate-pulse">Carregando dados de rastreamento...</p>
      </div>
    );
  }

  if (error || !withdrawal) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-danger/10 border border-danger/20 p-4 rounded-full text-danger mb-6">
          <WarningCircle size={48} weight="bold" />
        </div>
        <h1 className="text-2xl font-bold font-outfit mb-2">Rastreamento não encontrado</h1>
        <p className="text-dark-dim max-w-md mb-8">{error || "Não conseguimos localizar nenhuma retirada com o código fornecido."}</p>
        <button 
          onClick={() => navigate('/login')} 
          className="btn-secondary"
        >
          <ArrowLeft size={16} />
          Voltar para o Início
        </button>
      </div>
    );
  }

  const isCompleted = ['Concluída', 'ok'].includes(withdrawal.status);
  const isPending = withdrawal.status === 'Pendente';
  const isDefective = withdrawal.status === 'defeito';
  const isPartial = withdrawal.status === 'parcial';

  // Calculate total pieces
  const totalPieces = withdrawal.items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-inter pb-20">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[240px] bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none blur-3xl rounded-full" />

      {/* Top Header / Nav */}
      <div className="border-b border-dark-border bg-dark-bg/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 p-2 rounded text-slate-300">
              <ShieldCheck size={18} weight="thin" />
            </div>
            <div>
              <span className="text-[8px] text-dark-dim uppercase tracking-[0.25em] font-bold block leading-none">FabricOS</span>
              <h1 className="text-xs font-light font-outfit text-white tracking-wider">Validador Oficial</h1>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')} 
            className="text-[10px] font-semibold text-slate-300 hover:text-white transition-colors bg-white/5 px-2.5 py-1.5 rounded border border-white/10 cursor-pointer"
          >
            Acessar Sistema
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8 relative z-10">
        {/* Status banner */}
        <div className="card mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dark-card border border-dark-border">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider">
                {withdrawal.tracking_code}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-medium border border-white/5 bg-white/[0.01] text-slate-300">
                <div className={`w-1 h-1 rounded-full ${
                  isCompleted ? 'bg-success' :
                  isDefective ? 'bg-danger' :
                  isPartial ? 'bg-warning' :
                  'bg-warning'
                }`}></div>
                {withdrawal.status === 'Pendente' ? 'Em Aberto / Com Parceiro' : `Devolvido (${withdrawal.status.toUpperCase()})`}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-light font-outfit text-white tracking-wide">{withdrawal.item_name}</h2>
            <p className="text-dark-dim text-[10px] mt-1">Registrado em {new Date(withdrawal.created_at).toLocaleString('pt-BR')}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-0.5">
            <span className="text-[9px] text-dark-dim uppercase tracking-wider font-bold">Total de Peças</span>
            <span className="text-2xl font-bold text-white font-outfit">{totalPieces} <span className="text-xs font-normal text-dark-dim">unidades</span></span>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="card mb-6">
          <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-dark-dim mb-6">Status da Movimentação</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
            
            {/* Step 1 */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded bg-success/15 border border-success/25 flex items-center justify-center text-success flex-shrink-0">
                <CheckCircle size={14} weight="thin" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-200">Retirada Autorizada</h4>
                <p className="text-[10px] text-dark-dim">Saída liberada pelo estoque</p>
              </div>
            </div>

            {/* Line connector */}
            <div className={`hidden md:block h-[1px] w-12 ${isPending ? 'bg-dark-border' : 'bg-success/50'}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 border ${
                isPending 
                  ? 'bg-warning/15 border-warning/25 text-warning animate-pulse' 
                  : 'bg-success/15 border-success/25 text-success'
              }`}>
                {isPending ? <Clock size={14} weight="thin" /> : <CheckCircle size={14} weight="thin" />}
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-200">Com o Responsável</h4>
                <p className="text-[10px] text-dark-dim">Peças em posse externa</p>
              </div>
            </div>

            {/* Line connector */}
            <div className="hidden md:block h-[1px] w-12 bg-dark-border" />

            {/* Step 3 */}
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 border ${
                isPending 
                  ? 'bg-black/40 border-dark-border text-dark-dim' 
                  : isCompleted 
                    ? 'bg-success/15 border-success/25 text-success' 
                    : isDefective 
                      ? 'bg-danger/15 border-danger/25 text-danger' 
                      : 'bg-warning/15 border-warning/25 text-warning'
              }`}>
                <Package size={14} weight="thin" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-200">Retornado ao Estoque</h4>
                <p className="text-[10px] text-dark-dim">
                  {isPending ? 'Aguardando baixa' : `Baixa em ${new Date(withdrawal.created_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>

          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Center Details (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Responsável e Destino */}
            <div className="card">
              <h3 className="text-sm font-bold font-outfit mb-6 border-b border-dark-border/40 pb-3">Dados Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User size={20} className="text-primary mt-1" />
                  <div>
                    <span className="text-xs text-dark-dim block">Responsável</span>
                    <span className="font-bold text-sm">{withdrawal.person_name}</span>
                    {withdrawal.phone_number && (
                      <span className="text-xs text-dark-dim block mt-0.5">{withdrawal.phone_number}</span>
                    )}
                    {withdrawal.email && (
                      <span className="text-xs text-dark-dim block">{withdrawal.email}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-primary mt-1" />
                  <div>
                    <span className="text-xs text-dark-dim block">Destino / Local</span>
                    <span className="font-bold text-sm">{withdrawal.destination || "Não informado"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-primary mt-1" />
                  <div>
                    <span className="text-xs text-dark-dim block">Previsão de Retorno</span>
                    <span className="font-bold text-sm">
                      {withdrawal.expected_return 
                        ? new Date(withdrawal.expected_return).toLocaleDateString('pt-BR') 
                        : "Não definida"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Note size={20} className="text-primary mt-1" />
                  <div>
                    <span className="text-xs text-dark-dim block">Motivo da Retirada</span>
                    <span className="font-bold text-sm">{withdrawal.reason}</span>
                  </div>
                </div>
              </div>

              {withdrawal.notes && (
                <div className="mt-6 bg-white/[0.02] border border-dark-border p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-black text-dark-dim tracking-wider block mb-1">Observações de Saída</span>
                  <p className="text-sm text-dark-dim leading-relaxed">{withdrawal.notes}</p>
                </div>
              )}
            </div>

            {/* Items List / Grade */}
            <div className="card">
              <h3 className="text-sm font-bold font-outfit mb-6 border-b border-dark-border/40 pb-3">Grade de Peças Retiradas</h3>
              <div className="overflow-hidden rounded-xl border border-dark-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-dark-dim text-[10px] uppercase tracking-widest font-black border-b border-dark-border">
                    <tr>
                      <th className="px-6 py-3">Tamanho</th>
                      <th className="px-6 py-3 text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {withdrawal.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4 font-bold">{item.size}</td>
                        <td className="px-6 py-4 text-right text-primary font-black">{item.quantity} peças</td>
                      </tr>
                    ))}
                    {(!withdrawal.items || withdrawal.items.length === 0) && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-dark-dim">
                          Nenhum item listado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Devolução Details card (only if not Pending) */}
            {!isPending && (
              <div className="card border-success/30 bg-success/[0.02]">
                <h3 className="text-sm font-bold font-outfit mb-6 text-success border-b border-success/15 pb-3">Detalhes do Retorno (Baixa)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <span className="text-xs text-dark-dim block">Estado de Devolução</span>
                    <span className={`font-bold text-sm ${isCompleted ? 'text-success' : 'text-warning'}`}>
                      {isCompleted ? "Tudo OK / Completo" : withdrawal.status === 'defeito' ? "Com Defeito / Avaria" : "Ficou Pendente (Parcial)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-dark-dim block">Comprovado por fotos</span>
                    <span className="text-sm font-medium">
                      {withdrawal.return_photo_urls && withdrawal.return_photo_urls.length > 0 
                        ? `${withdrawal.return_photo_urls.length} foto(s) registrada(s)` 
                        : "Nenhuma foto registrada"}
                    </span>
                  </div>
                </div>

                {/* Return Photos */}
                {withdrawal.return_photo_urls && withdrawal.return_photo_urls.length > 0 && (
                  <div className="mb-6">
                    <span className="text-[10px] uppercase font-black text-dark-dim tracking-wider block mb-3">Fotos da Devolução</span>
                    <div className="flex flex-wrap gap-4">
                      {withdrawal.return_photo_urls.map((photo, i) => (
                        <a 
                          key={i} 
                          href={`${API_BASE_URL}${photo}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-20 h-20 rounded-lg overflow-hidden border border-dark-border hover:border-primary transition-colors bg-dark-bg block"
                        >
                          <img src={`${API_BASE_URL}${photo}`} alt="Defeito/Avaria" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Signature Sidebar (1 col) */}
          <div className="flex flex-col gap-8">
            
            {/* Signature Upon Delivery */}
            <div className="card flex flex-col items-center text-center">
              <Fingerprint size={32} className="text-primary mb-3" />
              <h3 className="text-sm font-bold font-outfit mb-1">Assinatura de Retirada</h3>
              <p className="text-[10px] text-dark-dim mb-4">Capturada digitalmente na entrega</p>
              
              <div className="w-full aspect-[4/3] bg-dark-bg rounded-xl border border-dark-border flex items-center justify-center p-2 overflow-hidden">
                {withdrawal.signature_url ? (
                  <img 
                    src={`${API_BASE_URL}${withdrawal.signature_url}`} 
                    alt="Assinatura de Entrega" 
                    className="max-h-full max-w-full object-contain invert brightness-200" 
                  />
                ) : (
                  <span className="text-xs text-dark-dim">Sem assinatura registrada</span>
                )}
              </div>
            </div>

            {/* Signature Upon Return */}
            <div className="card flex flex-col items-center text-center">
              <ShieldCheck size={32} className={`${isPending ? 'text-dark-dim' : 'text-success'} mb-3`} />
              <h3 className="text-sm font-bold font-outfit mb-1">Assinatura de Devolução</h3>
              <p className="text-[10px] text-dark-dim mb-4">Capturada digitalmente na devolução</p>
              
              <div className="w-full aspect-[4/3] bg-dark-bg rounded-xl border border-dark-border flex items-center justify-center p-2 overflow-hidden">
                {withdrawal.return_signature_url ? (
                  <img 
                    src={`${API_BASE_URL}${withdrawal.return_signature_url}`} 
                    alt="Assinatura de Retorno" 
                    className="max-h-full max-w-full object-contain invert brightness-200" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-dark-dim p-4">
                    <Clock size={20} />
                    <span className="text-[11px]">Aguardando devolução</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security validation */}
            <div className="bg-white/[0.01] border border-dark-border rounded-2xl p-4 text-center">
              <span className="text-[9px] uppercase font-black text-success tracking-widest block mb-1">✓ Registro Autenticado</span>
              <p className="text-[10px] text-dark-dim leading-relaxed">
                Este registro é gerado e validado de forma exclusiva. O QR Code e a chave associada garantem o histórico auditável do lote.
              </p>
            </div>

          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto mt-20 text-center text-dark-dim text-xs">
        <p>© 2025 FabricOS - Validador Oficial de Retiradas e Lotes</p>
      </footer>
    </div>
  );
};

export default TrackWithdrawal;
