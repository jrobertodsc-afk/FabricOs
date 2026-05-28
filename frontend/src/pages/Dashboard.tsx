import React, { useEffect, useState, useMemo } from 'react';
import { 
  ChartLineUp, Package, Users, Receipt, Warning, 
  MagnifyingGlass, Plus, ClockCounterClockwise, 
  ListChecks, Gear, Ruler, ChartBar, Scissors, TShirt, CoatHanger, List
} from '@phosphor-icons/react';
import { 
  getWithdrawals, getProductionOrders, 
  getPartners, getSettlements, createWithdrawal, returnWithdrawal 
} from '../services/api';
import type { Withdrawal, ProductionOrder, Partner, Settlement } from '../services/api';

// Components
import Partners from './Partners';
import Withdrawals from './Withdrawals';
import ProductionOrders from './ProductionOrders';
import Financials from './Financials';
import Products from './Products';
import Settings from './Settings';
import History from './History';
import Materials from './Materials';
import Reports from './Reports';
import Stock from './Stock';
import Pilotage from './Pilotage';
import WithdrawalModal from '../components/WithdrawalModal';
import ReturnModal from '../components/ReturnModal';
import Sidebar from '../components/Sidebar';
import type { ViewType } from '../components/Sidebar';

import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>('dashboard');

  // Decodifica o nome do usuário do token JWT (sem biblioteca extra)
  const userInfo = useMemo(() => {
    try {
      const token = localStorage.getItem('fabricos_token');
      if (!token) return { name: 'Usuário', role: 'user', initials: 'U' };
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name: string = payload.full_name ?? payload.name ?? payload.sub ?? 'Usuário';
      const role: string = payload.role ?? 'user';
      const roleLabel = role === 'admin' ? 'Administrador' : role === 'manager' ? 'Gerente' : 'Usuário';
      const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
      return { name, role: roleLabel, initials };
    } catch {
      return { name: 'Usuário', role: 'Usuário', initials: 'U' };
    }
  }, []);
  
  // Data States
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  const loadDashboardData = async () => {
    try {
      const [wData, oData, pData, sData] = await Promise.all([
        getWithdrawals(),
        getProductionOrders(),
        getPartners(),
        getSettlements()
      ]);
      setWithdrawals(wData.items);   // Extrai .items da resposta paginada
      setOrders(oData.items);        // Extrai .items da resposta paginada
      setPartners(pData);
      setSettlements(sData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateWithdrawal = async (data: any) => {
    try {
      await createWithdrawal(data);
      setIsWithdrawalOpen(false);
      loadDashboardData();
    } catch (error) {
      alert("Erro ao registrar retirada");
    }
  };

  const handleReturnWithdrawal = async (data: any) => {
    if (!selectedWithdrawal) return;
    try {
      await returnWithdrawal(selectedWithdrawal.id, data);
      setIsReturnOpen(false);
      setSelectedWithdrawal(null);
      loadDashboardData();
    } catch (error) {
      alert("Erro ao registrar devolução");
    }
  };

  // Skeleton para cards de estatísticas enquanto carrega
  const renderSkeletonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card animate-pulse bg-dark-card border border-dark-border">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-white/5 rounded w-8 h-8" />
          </div>
          <div className="h-2 bg-white/5 rounded w-16 mb-2" />
          <div className="h-5 bg-white/5 rounded w-10" />
        </div>
      ))}
    </div>
  );

  // Gráfico dinâmico: contagem de OPs criadas nos últimos 7 dias
  const chartData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const label = days[d.getDay()];
      const count = orders.filter(o => {
        const created = new Date(o.created_at);
        return (
          created.getDate() === d.getDate() &&
          created.getMonth() === d.getMonth() &&
          created.getFullYear() === d.getFullYear()
        );
      }).length;
      return { label, count };
    });
  }, [orders]);

  const chartMax = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);

  const renderDashboard = () => (
    <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
        <div>
          <span className="text-[9px] font-bold text-dark-dim uppercase tracking-[0.25em] mb-1 block">SISTEMA INTEGRADO</span>
          <h1 className="text-xl md:text-2xl font-light font-outfit tracking-widest text-white">FABRICOS</h1>
          <p className="text-dark-dim text-[11px] font-normal">Visão operacional unificada e controle de ativos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-3 py-1.5 rounded-md">
             <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-100 max-w-[120px] truncate">{userInfo.name}</p>
                <p className="text-[8px] font-bold text-dark-dim uppercase tracking-widest">{userInfo.role}</p>
             </div>
             <div className="w-7 h-7 bg-white/5 border border-white/10 rounded flex items-center justify-center font-bold text-white text-[10px] shadow-sm">
                {userInfo.initials}
             </div>
          </div>
          <button 
            onClick={() => setIsWithdrawalOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} weight="thin" />
            Nova Retirada
          </button>
        </div>
      </header>

      {/* Global Search with Predictive Suggestion Style */}
      <div className="relative mb-6 group">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim/40 group-focus-within:text-white transition-colors" size={16} />
        <input 
          type="text" 
          placeholder="Pesquisar lotes, fichas técnicas, parceiros ou estoques..." 
          className="w-full bg-black/40 border border-dark-border rounded-md py-2.5 pl-10 pr-4 md:pr-24 text-xs focus:outline-none focus:border-white/20 focus:bg-dark-card transition-all text-white placeholder:text-dark-dim/35"
        />
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 gap-1">
           <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-dark-dim/80">Ctrl</kbd>
           <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-dark-dim/80">K</kbd>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? renderSkeletonCards() : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-white/5 text-slate-300 rounded border border-white/5 group-hover:border-white/15 transition-all">
              <Scissors size={18} weight="thin" />
            </div>
            <span className="text-slate-300 text-[9px] font-semibold flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider">
              <ChartLineUp size={11} /> +12%
            </span>
          </div>
          <h3 className="text-dark-dim text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Produção Ativa</h3>
          <p className="text-xl font-bold font-outfit text-white leading-none">{orders.filter(o => o.current_stage !== 'Finalizado').length}</p>
        </div>

        <div className="card group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-white/5 text-slate-300 rounded border border-white/5 group-hover:border-white/15 transition-all">
              <Users size={18} weight="thin" />
            </div>
          </div>
          <h3 className="text-dark-dim text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Faccionistas</h3>
          <p className="text-xl font-bold font-outfit text-white leading-none">{partners.filter(p => p.type === 'faccionista').length}</p>
        </div>

        <div className="card group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-white/5 text-slate-300 rounded border border-white/5 group-hover:border-white/15 transition-all">
              <Warning size={18} weight="thin" />
            </div>
            <span className="w-1.5 h-1.5 bg-warning rounded-full animate-ping"></span>
          </div>
          <h3 className="text-dark-dim text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Pendências</h3>
          <p className="text-xl font-bold font-outfit text-slate-200 leading-none">{withdrawals.filter(w => w.status === 'Pendente').length}</p>
        </div>

        <div className="card group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-white/5 text-slate-300 rounded border border-white/5 group-hover:border-white/15 transition-all">
              <Receipt size={18} weight="thin" />
            </div>
          </div>
          <h3 className="text-dark-dim text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Acertos (Mês)</h3>
          <p className="text-xl font-bold font-outfit text-slate-200 leading-none">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
              settlements.reduce((acc, s) => acc + s.net_amount, 0)
            )}
          </p>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          <div className="p-4 border-b border-dark-border flex justify-between items-center bg-white/[0.01]">
            <h3 className="font-bold text-xs flex items-center gap-2 text-slate-100">
               <ChartBar size={16} className="text-slate-300" weight="thin" /> Fluxo de Expedição
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[8px] font-bold text-dark-dim uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-white"></div> Lotes
              </span>
            </div>
          </div>
          
          <div className="h-[240px] flex items-end justify-between gap-5 p-6">
            {chartData.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-2.5 h-full group">
                <div className="w-full bg-white/[0.01] border border-white/[0.03] rounded-sm relative flex-1 overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-white group-hover:bg-slate-300 transition-all duration-300 rounded-sm" 
                    style={{ height: count === 0 ? '4%' : `${Math.round((count / chartMax) * 100)}%` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-2 py-0.5 rounded text-[9px] text-white opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold shadow-xl whitespace-nowrap z-20">
                      {count} Lote{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-dark-dim uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col !p-0 overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-white/[0.01]">
            <h3 className="font-bold text-xs flex items-center gap-2 text-slate-100">
               <CoatHanger size={16} className="text-slate-300" weight="thin" /> Carga por Estágio
            </h3>
          </div>
          <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {[
                { label: 'Corte', count: orders.filter(o => o.current_stage === 'Corte').length },
                { label: 'Costura', count: orders.filter(o => o.current_stage === 'Costura').length },
                { label: 'Acabamento', count: orders.filter(o => o.current_stage === 'Acabamento').length },
                { label: 'Finalizado', count: orders.filter(o => o.current_stage === 'Finalizado').length },
              ].map(item => (
                <div key={item.label} className="group cursor-default">
                  <div className="flex justify-between text-[9px] mb-1.5 font-bold">
                    <span className="uppercase tracking-widest text-dark-dim group-hover:text-white transition-colors flex items-center gap-2">
                       <div className="w-1 h-1 rounded-full bg-slate-400"></div> {item.label}
                    </span>
                    <span className="bg-white/5 border border-white/5 px-1.5 py-0.2 rounded text-[8px] text-dark-dim">{item.count} Lotes</span>
                  </div>
                  <div className="h-1 w-full bg-white/[0.01] rounded-full overflow-hidden border border-white/[0.03]">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-700" 
                      style={{ width: `${orders.length > 0 ? (item.count / orders.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-white/[0.01] border border-white/[0.04] rounded-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1 bg-white/5 text-slate-300 rounded">
                    <Gear size={12} weight="thin" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Inteligência Operacional</p>
                </div>
                <p className="text-[10px] text-dark-dim leading-relaxed font-normal">
                  Identificados <b>{orders.filter(o => o.current_stage === 'Costura').length} lotes</b> em costura. Recomenda-se acerto com faccionistas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-dark-bg text-slate-200 font-inter overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, toggled via isSidebarOpen */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar view={view} setView={(v) => { setView(v); setIsSidebarOpen(false); }} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-dark-bg w-full lg:w-auto">
        
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden p-3.5 border-b border-dark-border bg-dark-card flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
              <TShirt size={14} weight="thin" className="text-white" />
            </div>
            <h1 className="text-sm font-black font-outfit text-white tracking-wider">FABRICOS</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 bg-dark-bg rounded border border-dark-border text-white"
          >
            <List size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'dashboard' && renderDashboard()}
          {view === 'withdrawals' && <Withdrawals />}
          {view === 'partners' && <Partners />}
          {view === 'production' && <ProductionOrders />}
          {view === 'financials' && <Financials />}
          {view === 'products' && <Products />}
          {view === 'materials' && <Materials />}
          {view === 'settings' && <Settings />}
          {view === 'history' && <History />}
          {view === 'reports' && <Reports />}
          {view === 'stock' && <Stock />}
          {view === 'pilotage' && <Pilotage />}
        </div>
      </main>

      <WithdrawalModal 
        isOpen={isWithdrawalOpen} 
        onClose={() => setIsWithdrawalOpen(false)} 
        onSubmit={handleCreateWithdrawal}
      />
      <ReturnModal 
        isOpen={isReturnOpen} 
        onClose={() => setIsReturnOpen(false)} 
        onSubmit={handleReturnWithdrawal}
        withdrawal={selectedWithdrawal}
      />
    </div>
  );
};

export default Dashboard;

