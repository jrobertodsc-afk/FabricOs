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
import { trackWithdrawal } from '../services/api';
import type { Withdrawal } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

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
    <div className="min-h-screen bg-dark-bg text-white font-inter pb-20">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none blur-3xl rounded-full" />

      {/* Top Header / Nav */}
      <div className="border-b border-dark-border/40 bg-dark-bg/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 border border-primary/20 p-2 rounded-xl text-primary">
              <ShieldCheck size={24} weight="bold" />
            </div>
            <div>
              <span className="text-xs text-dark-dim uppercase tracking-widest font-black">FabricOS</span>
              <h1 className="text-sm font-bold -mt-1 font-outfit">Validador de Retirada</h1>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')} 
            className="text-xs text-dark-dim hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-dark-border/60"
          >
            Acessar Sistema
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8 relative z-10">
        {/* Status banner */}
        <div className="card mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-dark-card to-dark-card/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                {withdrawal.tracking_code}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isCompleted ? 'bg-success/10 text-success border-success/20' :
                isDefective ? 'bg-danger/10 text-danger border-danger/20' :
                isPartial ? 'bg-warning/10 text-warning border-warning/20' :
                'bg-warning/10 text-warning border-warning/20'
              }`}>
                {withdrawal.status === 'Pendente' ? 'Em Aberto / Com Parceiro' : `Devolvido (${withdrawal.status.toUpperCase()})`}
              </span>
            </div>
            <h2 className="text-2xl font-bold font-outfit">{withdrawal.item_name}</h2>
            <p className="text-dark-dim text-sm mt-1">Registrado em {new Date(withdrawal.created_at).toLocaleString('pt-BR')}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-xs text-dark-dim">Total de Peças</span>
            <span className="text-3xl font-black text-primary font-outfit">{totalPieces} <span className="text-sm font-normal text-dark-dim">unidades</span></span>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="card mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-dark-dim mb-6">Status da Movimentação</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
            
            {/* Step 1 */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-full bg-success/20 border border-success/30 flex items-center justify-center text-success flex-shrink-0">
                <CheckCircle size={20} weight="fill" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Retirada Autorizada</h4>
                <p className="text-xs text-dark-dim">Saída liberada pelo estoque</p>
              </div>
            </div>

            {/* Line connector */}
            <div className={`hidden md:block h-[2px] w-12 bg-gradient-to-r ${isPending ? 'from-success to-dark-border' : 'from-success to-success'}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-4 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                isPending 
                  ? 'bg-warning/20 border-warning/30 text-warning animate-pulse' 
                  : 'bg-success/20 border-success/30 text-success'
              }`}>
                {isPending ? <Clock size={20} weight="fill" /> : <CheckCircle size={20} weight="fill" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">Com o Responsável</h4>
                <p className="text-xs text-dark-dim">Peças em posse externa</p>
              </div>
            </div>

            {/* Line connector */}
            <div className={`hidden md:block h-[2px] w-12 bg-gradient-to-r ${isPending ? 'from-dark-border to-dark-border' : 'from-success to-success'}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-4 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                isPending 
                  ? 'bg-dark-bg border-dark-border text-dark-dim' 
                  : isCompleted 
                    ? 'bg-success/20 border-success/30 text-success' 
                    : isDefective 
                      ? 'bg-danger/20 border-danger/30 text-danger' 
                      : 'bg-warning/20 border-warning/30 text-warning'
              }`}>
                <Package size={20} weight={isPending ? 'thin' : 'fill'} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Retornado ao Estoque</h4>
                <p className="text-xs text-dark-dim">
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
