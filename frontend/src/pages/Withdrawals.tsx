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
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Controle de Retiradas</h1>
          <p className="text-dark-dim">Gerencie entregas, devoluções e contate parceiros</p>
        </div>
      </header>

      <div className="flex gap-2 mb-6 flex-shrink-0 bg-dark-card w-fit p-1 rounded-xl border border-dark-border">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'pending' ? 'bg-primary/20 text-primary' : 'text-dark-dim hover:bg-white/5'}`}
        >
          Em Andamento
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'completed' ? 'bg-primary/20 text-primary' : 'text-dark-dim hover:bg-white/5'}`}
        >
          Histórico (Concluídas)
        </button>
      </div>

      {loading ? (
        <p className="text-dark-dim">Carregando retiradas...</p>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-dark-card border border-dark-border rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border bg-white/[0.02]">
                <th className="p-4 text-xs font-bold text-dark-dim uppercase tracking-widest">Item / Serviço</th>
                <th className="p-4 text-xs font-bold text-dark-dim uppercase tracking-widest">Responsável</th>
                <th className="p-4 text-xs font-bold text-dark-dim uppercase tracking-widest">Previsão</th>
                <th className="p-4 text-xs font-bold text-dark-dim uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-bold text-dark-dim uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-sm">
              {filteredWithdrawals.map((w) => {
                const partner = w.partner_id ? partners.find(p => p.id === w.partner_id) : null;
                const isLate = w.status === 'Pendente' && w.expected_return && new Date(w.expected_return) < new Date();

                return (
                  <tr key={w.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold">{w.item_name}</p>
                          <p className="text-[10px] text-dark-dim uppercase tracking-wider">
                            {w.tracking_code ? `${w.tracking_code} • ` : ''}{w.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-dark-dim" />
                        <span className="font-medium">{partner ? partner.name : w.person_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {w.expected_return ? (
                        <span className={`font-medium ${isLate ? 'text-danger' : ''}`}>
                          {new Date(w.expected_return).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-dark-dim text-xs">Não definida</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ['Concluída', 'ok'].includes(w.status) ? 'bg-success/10 text-success' :
                        w.status === 'defeito' ? 'bg-danger/10 text-danger' :
                        w.status === 'parcial' ? 'bg-warning/10 text-warning' :
                        isLate ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                      }`}>
                        {w.status === 'Pendente' && isLate ? 'Atrasada' : w.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {w.tracking_code && (
                          <button 
                            onClick={() => setActiveQrWithdrawal(w)}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                            title="Visualizar QR Code de Rastreamento"
                          >
                            <QrCode size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleWhatsApp(w)}
                          className="p-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors"
                          title="Cobrar via WhatsApp"
                        >
                          <WhatsappLogo size={18} weight="fill" />
                        </button>
                        <button 
                          onClick={() => handleEmail(w)}
                          className="p-2 bg-white/5 text-dark-dim rounded-lg hover:bg-white/10 transition-colors"
                          title="Enviar E-mail"
                        >
                          <EnvelopeSimple size={18} />
                        </button>
                        {w.photo_urls && w.photo_urls.length > 0 && (
                          <button 
                            onClick={() => window.open(`${API_BASE_URL}${w.photo_urls![0]}`, '_blank')}
                            className="p-2 bg-info/10 text-info rounded-lg hover:bg-info/20 transition-colors"
                            title="Ver Fotos"
                          >
                            <Camera size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => { setWithdrawalToDelete(w); setIsDeleteOpen(true); }}
                          className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
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
