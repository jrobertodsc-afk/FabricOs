import React, { useEffect, useState } from 'react';
import { Package, User, WhatsappLogo, CheckCircle, EnvelopeSimple, Camera, QrCode, X, Trash } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import { getWithdrawals, getPartners, returnWithdrawal, deleteWithdrawal, API_BASE_URL } from '../services/api';
import type { Withdrawal, Partner, ReturnPayload } from '../services/api';
import ReturnModal from '../components/ReturnModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const Withdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [activeQrWithdrawal, setActiveQrWithdrawal] = useState<Withdrawal | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const [wData, pData] = await Promise.all([
        getWithdrawals(),
        getPartners()
      ]);
      setWithdrawals(wData.items);
      setPartners(pData);
    } catch (error) {
      console.error("Failed to load withdrawals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReturnModal = (w: Withdrawal) => {
    setSelectedWithdrawal(w);
    setIsReturnOpen(true);
  };

  const handleWhatsApp = (w: Withdrawal) => {
    // Busca número no parceiro ou direto na retirada
    let phone = w.phone_number;
    let name = w.person_name;

    if (w.partner_id) {
      const partner = partners.find(p => p.id === w.partner_id);
      if (partner) {
        phone = partner.phone_number || phone;
        name = partner.name || name;
      }
    }

    if (!phone) {
      addToast("Nenhum número de telefone cadastrado para esta retirada.", "error");
      return;
    }

    // Limpa o número (apenas dígitos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Formata a data prevista
    let dateStr = "uma data a combinar";
    if (w.expected_return) {
      dateStr = new Date(w.expected_return).toLocaleDateString('pt-BR');
    }

    const trackingLink = w.tracking_code ? ` Acompanhe e assine pelo link oficial: ${window.location.origin}/track/${w.tracking_code}` : '';
    const message = `Olá ${name}, você tem uma devolução referente a ${w.item_name} agendada para o dia ${dateStr}. Por favor, confirme o status da devolução.${trackingLink}`;
    
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEmail = (w: Withdrawal) => {
    let email = w.email;
    if (w.partner_id) {
      const partner = partners.find(p => p.id === w.partner_id);
      if (partner) email = partner.email || email;
    }

    if (!email) {
      addToast("Nenhum e-mail cadastrado para esta retirada.", "error");
      return;
    }

    const trackingLink = w.tracking_code ? `\n\nAcompanhe e assine pelo link oficial:\n${window.location.origin}/track/${w.tracking_code}` : '';
    const subject = encodeURIComponent(`Controle de Retirada [${w.tracking_code || 'Novo'}]: ${w.item_name}`);
    const body = encodeURIComponent(`Olá,\n\nGostaríamos de falar sobre a retirada de ${w.item_name}.${trackingLink}\n\nAtenciosamente,\nEquipe FabricOS`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
  };

  const handleReturnSubmit = async (data: ReturnPayload) => {
    if (!selectedWithdrawal) return;
    try {
      await returnWithdrawal(selectedWithdrawal.id, data);
      setIsReturnOpen(false);
      setSelectedWithdrawal(null);
      addToast("Devolução registrada com sucesso", "success");
      loadData();
    } catch (error) {
      addToast("Erro ao registrar devolução", "error");
    }
  };

  const handleDelete = async () => {
    if (!withdrawalToDelete) return;
    try {
      await deleteWithdrawal(withdrawalToDelete.id);
      addToast("Retirada excluída com sucesso", "success");
      setIsDeleteOpen(false);
      setWithdrawalToDelete(null);
      loadData();
    } catch (error) {
      addToast("Erro ao excluir retirada", "error");
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (activeTab === 'pending') return w.status === 'Pendente';
    return w.status !== 'Pendente';
  });

  return (
    <div className="p-4 md:p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <span className="text-[9px] font-bold text-dark-dim uppercase tracking-[0.25em] mb-1 block">ESTOQUE EXTERNO</span>
          <h1 className="text-xl md:text-2xl font-light font-outfit text-white tracking-widest">CONTROLE DE RETIRADAS</h1>
          <p className="text-dark-dim text-[11px]">Rastreamento georreferenciado e controle de custódia de peças.</p>
        </div>
      </header>

      <div className="flex gap-1 mb-6 flex-shrink-0 bg-white/[0.01] w-fit p-1 rounded-md border border-dark-border">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-1.5 rounded font-semibold tracking-wider text-[10px] uppercase transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-white text-black font-bold' : 'text-dark-dim hover:bg-white/5'}`}
        >
          Em Andamento
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-1.5 rounded font-semibold tracking-wider text-[10px] uppercase transition-all cursor-pointer ${activeTab === 'completed' ? 'bg-white text-black font-bold' : 'text-dark-dim hover:bg-white/5'}`}
        >
          Histórico
        </button>
      </div>

      {loading ? (
        <p className="text-dark-dim text-xs">Carregando retiradas...</p>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-dark-card border border-dark-border rounded-lg shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border bg-white/[0.01]">
                <th className="p-3.5 text-[8px] font-bold text-dark-dim uppercase tracking-[0.22em]">Item / Serviço</th>
                <th className="p-3.5 text-[8px] font-bold text-dark-dim uppercase tracking-[0.22em]">Responsável</th>
                <th className="p-3.5 text-[8px] font-bold text-dark-dim uppercase tracking-[0.22em]">Previsão</th>
                <th className="p-3.5 text-[8px] font-bold text-dark-dim uppercase tracking-[0.22em]">Status</th>
                <th className="p-3.5 text-[8px] font-bold text-dark-dim uppercase tracking-[0.22em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40 text-[11px] text-slate-300">
              {filteredWithdrawals.map((w) => {
                const partner = w.partner_id ? partners.find(p => p.id === w.partner_id) : null;
                const isLate = w.status === 'Pendente' && w.expected_return && new Date(w.expected_return) < new Date();

                return (
                  <tr key={w.id} className="hover:bg-white/[0.01] transition-all duration-150">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-white/[0.01] rounded border border-white/5 flex items-center justify-center text-slate-300">
                          <Package size={14} weight="thin" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100">{w.item_name}</p>
                          <p className="text-[8px] text-dark-dim uppercase tracking-widest">
                            {w.tracking_code ? `${w.tracking_code} • ` : ''}{w.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-dark-dim" />
                        <span className="font-medium text-slate-300">{partner ? partner.name : w.person_name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {w.expected_return ? (
                        <span className={`font-medium ${isLate ? 'text-danger font-semibold' : 'text-slate-400'}`}>
                          {new Date(w.expected_return).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-dark-dim text-[10px]">Não definida</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-medium border border-white/5 bg-white/[0.01] text-slate-300">
                        <div className={`w-1 h-1 rounded-full ${
                          ['Concluída', 'ok'].includes(w.status) ? 'bg-success' :
                          w.status === 'defeito' ? 'bg-danger' :
                          w.status === 'parcial' ? 'bg-warning' :
                          isLate ? 'bg-danger animate-pulse' : 'bg-warning'
                        }`}></div>
                        {w.status === 'Pendente' && isLate ? 'Atrasada' : w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {w.tracking_code && (
                          <button 
                            onClick={() => setActiveQrWithdrawal(w)}
                            className="p-1.5 bg-white/[0.01] hover:bg-white/5 text-slate-300 rounded border border-white/10 cursor-pointer"
                            title="Visualizar QR Code de Rastreamento"
                          >
                            <QrCode size={13} weight="thin" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleWhatsApp(w)}
                          className="p-1.5 bg-white/[0.01] hover:bg-white/5 text-slate-300 rounded border border-white/10 cursor-pointer"
                          title="Cobrar via WhatsApp"
                        >
                          <WhatsappLogo size={13} weight="thin" />
                        </button>
                        <button 
                          onClick={() => handleEmail(w)}
                          className="p-1.5 bg-white/[0.01] hover:bg-white/5 text-slate-300 rounded border border-white/10 cursor-pointer"
                          title="Enviar E-mail"
                        >
                          <EnvelopeSimple size={13} weight="thin" />
                        </button>
                        {w.photo_urls && w.photo_urls.length > 0 && (
                          <button 
                            onClick={() => window.open(`${API_BASE_URL}${w.photo_urls![0]}`, '_blank')}
                            className="p-1.5 bg-white/[0.01] hover:bg-white/5 text-slate-300 rounded border border-white/10 cursor-pointer"
                            title="Ver Fotos"
                          >
                            <Camera size={13} weight="thin" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setWithdrawalToDelete(w); setIsDeleteOpen(true); }}
                          className="p-1.5 bg-white/[0.01] hover:bg-white/5 text-slate-300 rounded border border-white/10 cursor-pointer"


                          title="Excluir Retirada"
                        >
                          <Trash size={18} />
                        </button>
                        {w.status === 'Pendente' && (
                          <button 
                            onClick={() => openReturnModal(w)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-bold text-xs"
                          >
                            <CheckCircle size={16} />
                            Dar Baixa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredWithdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-dark-dim">
                    Nenhuma retirada encontrada nesta aba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedWithdrawal && (
        <ReturnModal 
          isOpen={isReturnOpen} 
          onClose={() => {
            setIsReturnOpen(false);
            setSelectedWithdrawal(null);
          }}
          onSubmit={handleReturnSubmit}
          withdrawal={selectedWithdrawal}
        />
      )}

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Retirada"
        message={`Tem certeza que deseja excluir a retirada de ${withdrawalToDelete?.item_name}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />

      {activeQrWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-6 relative">
            <button 
              onClick={() => setActiveQrWithdrawal(null)} 
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors text-dark-dim hover:text-white"
            >
              <X size={20} weight="bold" />
            </button>
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
                <QrCode size={28} weight="bold" />
              </div>
              <h3 className="text-lg font-bold font-outfit mb-1">Rastreamento de Retirada</h3>
              <p className="text-xs text-dark-dim mb-6">Escaneie o QR Code abaixo para acompanhar o status e validar as assinaturas</p>
              
              <div className="bg-white p-4 rounded-2xl mb-6 shadow-inner flex items-center justify-center">
                <QRCodeSVG 
                  value={`${window.location.origin}/track/${activeQrWithdrawal.tracking_code}`} 
                  size={180}
                  level="H"
                />
              </div>
              
              <span className="text-sm font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                {activeQrWithdrawal.tracking_code}
              </span>
              <p className="text-[10px] text-dark-dim mt-2 max-w-[240px]">
                Link público: <a href={`${window.location.origin}/track/${activeQrWithdrawal.tracking_code}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{window.location.origin}/track/{activeQrWithdrawal.tracking_code}</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
