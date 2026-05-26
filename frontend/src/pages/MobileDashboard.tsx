import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TShirt, 
  Scissors, 
  Kanban, 
  Truck, 
  ChartLine, 
  Bell, 
  CheckSquare, 
  ArrowRight, 
  ArrowClockwise,
  Barcode,
  Storefront,
  Radio,
  User,
  WarningCircle,
  ThumbsUp,
  QrCode,
  MapTrifold
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getProductionOrders, 
  updateProductionOrder,
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  syncSystem
} from '../services/api';
import type {
  Notification,
  ProductionOrder
} from '../services/api';

import { useLicense } from '../contexts/LicenseContext';

const DEPARTMENTS = [
  { id: 'Cadista', label: 'Cadista', icon: TShirt, color: 'from-indigo-500 to-purple-600' },
  { id: 'Corte', label: 'Corte', icon: Scissors, color: 'from-pink-500 to-rose-600' },
  { id: 'Produção', label: 'Produção', icon: Kanban, color: 'from-amber-500 to-orange-600' },
  { id: 'Logística', label: 'Logística', icon: Truck, color: 'from-teal-500 to-emerald-600' },
  { id: 'Planejamento', label: 'Planejamento', icon: ChartLine, color: 'from-blue-500 to-cyan-600' },
];

export default function MobileDashboard() {
  const { enabledModules } = useLicense();

  const filteredDepts = DEPARTMENTS.filter(dept => {
    if (dept.id === 'Logística') {
      return enabledModules.includes('logistica');
    }
    return enabledModules.includes('producao');
  });

  const [selectedDept, setSelectedDept] = useState(() => filteredDepts[0]?.id || '');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (filteredDepts.length > 0 && !filteredDepts.some(d => d.id === selectedDept)) {
      setSelectedDept(filteredDepts[0].id);
    }
  }, [enabledModules]);


  // Load department notifications & active OPs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const notifs = await getNotifications(selectedDept, true);
      setNotifications(notifs);

      const ops = await getProductionOrders(0, 100);
      setProductionOrders(ops.items);
    } catch (err: any) {
      addToast('Erro ao carregar dados do setor: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(selectedDept);
      setNotifications([]);
      addToast('Notificações limpas!', 'success');
    } catch (err: any) {
      addToast('Erro ao ler notificações', 'error');
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast('Notificação arquivada', 'success');
    } catch (err: any) {
      addToast('Erro ao arquivar notificação', 'error');
    }
  };

  const handleSyncTrello = async () => {
    setSyncing(true);
    try {
      await syncSystem();
      addToast('Sincronização com o Trello concluída!', 'success');
      loadData();
    } catch (err: any) {
      addToast('Falha na sincronização: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAdvanceStage = async (orderId: string, currentStage: string) => {
    let nextStage = 'Costura';
    if (currentStage === 'Corte') nextStage = 'Costura';
    else if (currentStage === 'Costura') nextStage = 'Acabamento';
    else if (currentStage === 'Acabamento') nextStage = 'Estoque';

    try {
      await updateProductionOrder(orderId, { current_stage: nextStage });
      addToast(`OP atualizada para ${nextStage}!`, 'success');
      loadData();
    } catch (err: any) {
      addToast('Erro ao avançar estágio', 'error');
    }
  };

  // Filter orders by active stage per department view
  const deptOrders = productionOrders.filter(op => {
    if (selectedDept === 'Corte') return op.current_stage === 'Corte' && op.status === 'em_andamento';
    if (selectedDept === 'Produção') return op.status === 'em_andamento';
    return false;
  });

  const getDeptColor = () => {
    return DEPARTMENTS.find(d => d.id === selectedDept)?.color || 'from-indigo-500 to-purple-600';
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white pb-10">
      {/* Top Header */}
      <header className="bg-[#12141C] border-b border-dark-border/40 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg">
            <TShirt size={22} weight="bold" className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-outfit font-bold text-lg leading-tight tracking-wide">FabricOS</h1>
            <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Painel Setorial Mobile</p>
          </div>
        </div>
        <button 
          onClick={loadData}
          disabled={isLoading}
          className="p-2 rounded-lg bg-dark-border/30 border border-dark-border/50 text-dark-dim hover:text-white transition-all active:scale-95"
        >
          <ArrowClockwise size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Sector Carousel/Tabs */}
      <div className="px-4 py-6 overflow-x-auto flex gap-3 scrollbar-none">
        {filteredDepts.map(dept => {
          const Icon = dept.icon;
          const isSelected = selectedDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all duration-300 ${
                isSelected 
                  ? `bg-gradient-to-r ${dept.color} border-white/10 shadow-lg scale-102 font-bold`
                  : 'bg-dark-card border-dark-border/40 text-dark-dim hover:border-dark-border'
              }`}
            >
              <Icon size={20} weight={isSelected ? 'fill' : 'regular'} />
              <span className="text-sm font-outfit">{dept.label}</span>
            </button>
          );
        })}
      </div>

      <main className="px-4 space-y-6">
        {/* Notifications Section */}
        <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-dark-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-indigo-400" weight="fill" />
              <h2 className="font-outfit font-bold text-base">Alertas do Setor</h2>
              {notifications.length > 0 && (
                <span className="bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">
                  {notifications.length} novos
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold active:scale-95 transition-all"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-dark-dim">
              <ThumbsUp size={36} weight="duotone" className="text-emerald-500/60 mb-2" />
              <p className="text-sm font-medium">Tudo limpo por aqui!</p>
              <p className="text-xs mt-0.5 text-dark-dim/80">Nenhuma pendência recente detectada.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {notifications.map(n => (
                <div 
                  key={n.id}
                  className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-3.5 flex items-start justify-between gap-3 group hover:border-indigo-500/30 transition-all duration-200"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-tight">{n.title}</h3>
                    <p className="text-xs text-dark-dim leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-dark-dim/60 block mt-1">
                      {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleMarkOneRead(n.id)}
                    className="p-1 rounded-lg bg-dark-bg border border-dark-border/40 text-dark-dim hover:text-rose-400 transition-all"
                    title="Arquivar"
                  >
                    <CheckSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Dashboard Layout */}
        
        {/* CADISTA SETOR */}
        {selectedDept === 'Cadista' && (
          <div className="space-y-6">
            {/* Checklist */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4 flex items-center gap-2">
                <CheckSquare size={20} className="text-purple-400" />
                Fila de Trabalho - Modelista
              </h2>
              <ul className="space-y-3.5">
                {[
                  { label: 'Definição de Grades de Tamanho na Modelagem', done: true },
                  { label: 'Exportar Risco Digital das Coleções Ativas', done: false },
                  { label: 'Validar Ficha Técnica de Pilotos Aprovados BOAH', done: false }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-3 bg-dark-bg/40 border border-dark-border/20 rounded-xl">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className={`text-sm ${item.done ? 'text-dark-dim line-through decoration-white/20' : 'text-white font-medium'}`}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sync Trello Button */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-500/20 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div>
                <h3 className="font-outfit font-bold text-base text-indigo-300">Integração Trello Coleções</h3>
                <p className="text-xs text-dark-dim mt-1 leading-relaxed">
                  Busca novos cards de modelagem em quadros específicos do Trello de cada coleção e atualiza o acervo e fichas técnicas no FabricOS.
                </p>
              </div>
              <button 
                onClick={handleSyncTrello}
                disabled={syncing}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowClockwise size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando Trello...' : 'Sincronizar Coleções Trello'}
              </button>
            </div>
          </div>
        )}

        {/* CORTE SETOR */}
        {selectedDept === 'Corte' && (
          <div className="space-y-6">
            {/* active corte orders */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4 flex items-center gap-2">
                <Scissors size={20} className="text-pink-400" />
                Ordens na Fila de Corte ({deptOrders.length})
              </h2>

              {deptOrders.length === 0 ? (
                <div className="text-center py-8 text-dark-dim text-sm">
                  Nenhuma Ordem de Produção pendente de corte.
                </div>
              ) : (
                <div className="space-y-4">
                  {deptOrders.map(op => (
                    <div 
                      key={op.id}
                      className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-4 flex flex-col gap-3.5 hover:border-pink-500/30 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                            Ref: {op.product?.reference || 'N/A'}
                          </span>
                          <h3 className="font-bold text-sm text-white mt-1.5">{op.item_name}</h3>
                          <p className="text-xs text-dark-dim mt-0.5">OP #{op.order_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white">{op.total_quantity} pçs</p>
                          <p className="text-[10px] text-dark-dim mt-0.5">Grade: {Object.keys(op.size_grade || {}).length} tamanhos</p>
                        </div>
                      </div>

                      {op.size_grade && (
                        <div className="bg-dark-bg/60 p-2.5 rounded-lg border border-dark-border/20 flex gap-3 overflow-x-auto scrollbar-none">
                          {Object.entries(op.size_grade).map(([sz, qty]) => (
                            <div key={sz} className="text-center flex-shrink-0 min-w-10">
                              <p className="text-[10px] font-black text-pink-400">{sz}</p>
                              <p className="text-xs font-bold text-white">{qty}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <button 
                        onClick={() => handleAdvanceStage(op.id, 'Corte')}
                        className="w-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Scissors size={14} />
                        Confirmar Corte e Enviar para Costura
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUÇÃO SETOR */}
        {selectedDept === 'Produção' && (
          <div className="space-y-6">
            {/* Active production cards */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4 flex items-center gap-2">
                <Kanban size={20} className="text-amber-400" />
                Progresso Geral da Produção ({deptOrders.length})
              </h2>

              {deptOrders.length === 0 ? (
                <div className="text-center py-8 text-dark-dim text-sm">
                  Nenhuma Ordem de Produção ativa no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {deptOrders.map(op => (
                    <div 
                      key={op.id}
                      className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-4 flex flex-col gap-3 hover:border-amber-500/30 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-white">{op.item_name}</h3>
                          <p className="text-xs text-dark-dim">OP #{op.order_number}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                          {op.current_stage}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-dark-border/20">
                        <span className="text-xs text-dark-dim font-bold">Parceiro: {op.product?.reference || 'Boah Confecções'}</span>
                        <div className="flex gap-2">
                          {op.current_stage !== 'Estoque' && (
                            <button 
                              onClick={() => handleAdvanceStage(op.id, op.current_stage)}
                              className="bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-1"
                            >
                              Avançar
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGÍSTICA SETOR */}
        {selectedDept === 'Logística' && (
          <div className="space-y-6">
            {/* Quick Actions Mobiles */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-5 flex items-center gap-2">
                <Truck size={20} className="text-teal-400" />
                Operações de Logística
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {/* XML Reader Action */}
                <button 
                  onClick={() => navigate('/mobile/nfe')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <Barcode size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Leitor de XML NF-e</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Conciliar notas fiscais com grade OPs</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* Reparto split Action */}
                <button 
                  onClick={() => navigate('/mobile/reparto')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <Storefront size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Reparto por Loja</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Dividir estoque recém-chegado</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* RFID Showroom check-out */}
                <button 
                  onClick={() => navigate('/mobile/showroom')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <Radio size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">RFID Showroom</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Check-out de peças via antena bluetooth</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* Programação de Rotas Action */}
                <button 
                  onClick={() => navigate('/mobile/scheduling')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <MapTrifold size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Programação de Rotas</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Agendar cargas e transferências entre lojas</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* QR Code Scanner Action */}
                <button 
                  onClick={() => navigate('/mobile/scanner')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <QrCode size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Leitor de QR Code</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Escanear volume de carga com câmera do celular</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* Dispatch (Motoboy) Action */}
                <button 
                  onClick={() => navigate('/mobile/dispatch')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <Truck size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Expedição (Motoboy)</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Despachar carga com assinatura do motorista</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>

                {/* Receive (Estoquista) Action */}
                <button 
                  onClick={() => navigate('/mobile/recebimento')}
                  className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-dark-border/60 hover:border-teal-500/40 p-4.5 rounded-xl flex items-center justify-between text-left group transition-all duration-300 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-all">
                      <Storefront size={26} weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Recebimento de Lojas</h3>
                      <p className="text-xs text-dark-dim mt-0.5">Conferir grade e assinar termo de recebimento</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-dark-dim group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLANEJAMENTO SETOR */}
        {selectedDept === 'Planejamento' && (
          <div className="space-y-6">
            {/* KPI widgets */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-4.5 text-center">
                <p className="text-xs text-dark-dim font-bold uppercase">OPs Ativas</p>
                <p className="text-2xl font-black text-indigo-400 mt-2">
                  {productionOrders.filter(op => op.status === 'em_andamento').length}
                </p>
              </div>
              <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-4.5 text-center">
                <p className="text-xs text-dark-dim font-bold uppercase">Meta de Peças</p>
                <p className="text-2xl font-black text-teal-400 mt-2">
                  {productionOrders.reduce((sum, op) => sum + (op.total_quantity || 0), 0)}
                </p>
              </div>
            </div>

            {/* Stage Bar Charts */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
              <h2 className="font-outfit font-bold text-base mb-4">Gargalos Setoriais</h2>
              <div className="space-y-3.5">
                {[
                  { name: 'Corte', qty: productionOrders.filter(op => op.current_stage === 'Corte').length, color: 'bg-pink-500' },
                  { name: 'Costura', qty: productionOrders.filter(op => op.current_stage === 'Costura').length, color: 'bg-amber-500' },
                  { name: 'Acabamento', qty: productionOrders.filter(op => op.current_stage === 'Acabamento').length, color: 'bg-teal-500' },
                  { name: 'Estoque', qty: productionOrders.filter(op => op.current_stage === 'Estoque').length, color: 'bg-indigo-500' }
                ].map(stage => {
                  const maxVal = Math.max(...[1, productionOrders.length]);
                  const pct = (stage.qty / maxVal) * 100;
                  return (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>{stage.name}</span>
                        <span className="text-dark-dim">{stage.qty} ordens</span>
                      </div>
                      <div className="w-full bg-[#1A1C26] h-2.5 rounded-full overflow-hidden border border-dark-border/30">
                        <div 
                          className={`${stage.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
