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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/5 rounded-xl w-12 h-12" />
          </div>
          <div className="h-2.5 bg-white/5 rounded w-24 mb-3" />
          <div className="h-8 bg-white/5 rounded w-16" />
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
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-outfit tracking-tight">FabricOS Intelligence</h1>
          <p className="text-dark-dim text-sm font-medium">Monitorando {orders.length} lotes em tempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
             <div className="text-right">
                <p className="text-xs font-bold text-white max-w-[100px] truncate">{userInfo.name}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{userInfo.role}</p>
             </div>
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">
                {userInfo.initials}
             </div>
          </div>
          <button 
            onClick={() => setIsWithdrawalOpen(true)}
            className="btn-primary"
          >
            <Plus size={20} weight="bold" />
            Nova Retirada
          </button>
        </div>
      </header>

      {/* Global Search with Predictive Suggestion Style */}
      <div className="relative mb-10 group">
        <MagnifyingGlass className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={22} />
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          className="w-full bg-dark-card/50 border border-dark-border rounded-2xl py-4 pl-14 pr-4 md:pr-24 text-sm focus:outline-none focus:border-primary focus:bg-dark-card transition-all shadow-inner"
        />
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 gap-2">
           <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-dark-dim">Ctrl</kbd>
           <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-dark-dim">K</kbd>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? renderSkeletonCards() : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg shadow-primary/5">
              <Scissors size={24} weight="bold" />
            </div>
            <span className="text-success text-[10px] font-black flex items-center gap-1 bg-success/10 px-2.5 py-1 rounded-full uppercase tracking-tighter">
              <ChartLineUp size={14} /> +12%
            </span>
          </div>
          <h3 className="text-dark-dim text-[10px] font-black uppercase tracking-[0.15em] mb-1">Produção Ativa</h3>
          <p className="text-3xl font-black font-outfit leading-none">{orders.filter(o => o.current_stage !== 'Finalizado').length}</p>
        </div>

        <div className="card group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-info/10 text-info rounded-xl group-hover:bg-info group-hover:text-white transition-all duration-500">
              <Users size={24} weight="bold" />
            </div>
          </div>
          <h3 className="text-dark-dim text-[10px] font-black uppercase tracking-[0.15em] mb-1">Faccionistas</h3>
          <p className="text-3xl font-black font-outfit leading-none">{partners.filter(p => p.type === 'faccionista').length}</p>
        </div>

        <div className="card group border-l-4 border-l-warning">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-warning/10 text-warning rounded-xl group-hover:bg-warning group-hover:text-white transition-all duration-500">
              <Warning size={24} weight="bold" />
            </div>
          </div>
          <h3 className="text-dark-dim text-[10px] font-black uppercase tracking-[0.15em] mb-1">Pendências</h3>
          <p className="text-3xl font-black font-outfit leading-none text-warning">{withdrawals.filter(w => w.status === 'Pendente').length}</p>
        </div>

        <div className="card group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-success/10 text-success rounded-xl group-hover:bg-success group-hover:text-white transition-all duration-500">
              <Receipt size={24} weight="bold" />
            </div>
          </div>
          <h3 className="text-dark-dim text-[10px] font-black uppercase tracking-[0.15em] mb-1">Acertos (Mês)</h3>
          <p className="text-3xl font-black font-outfit leading-none">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
              settlements.reduce((acc, s) => acc + s.net_amount, 0)
            )}
          </p>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          <div className="p-6 border-b border-dark-border flex justify-between items-center bg-white/[0.02]">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <ChartBar size={20} className="text-primary" /> Fluxo de Expedição
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-dark-dim uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div> Produzido
              </span>
            </div>
          </div>
          
          <div className="h-[280px] flex items-end justify-between gap-6 p-8">
            {chartData.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-4 h-full group">
                <div className="w-full bg-white/[0.03] rounded-t-2xl relative flex-1 overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/40 to-primary group-hover:to-primary-hover transition-all duration-700 rounded-t-2xl shadow-[0_-5px_15px_rgba(79,70,229,0.2)]" 
                    style={{ height: count === 0 ? '4%' : `${Math.round((count / chartMax) * 100)}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-3 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 font-black shadow-2xl scale-90 group-hover:scale-100 whitespace-nowrap">
                      {count} OP{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-black text-dark-dim uppercase tracking-[0.2em]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col !p-0 overflow-hidden">
          <div className="p-6 border-b border-dark-border bg-white/[0.02]">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <CoatHanger size={20} className="text-info" /> Carga por Estágio
            </h3>
          </div>
          <div className="p-8 space-y-8 flex-1">
            {[
              { label: 'Corte', color: 'bg-primary', count: orders.filter(o => o.current_stage === 'Corte').length },
              { label: 'Costura', color: 'bg-info', count: orders.filter(o => o.current_stage === 'Costura').length },
              { label: 'Acabamento', color: 'bg-warning', count: orders.filter(o => o.current_stage === 'Acabamento').length },
              { label: 'Finalizado', color: 'bg-success', count: orders.filter(o => o.current_stage === 'Finalizado').length },
            ].map(item => (
              <div key={item.label} className="group cursor-default">
                <div className="flex justify-between text-[11px] mb-3 font-black">
                  <span className="uppercase tracking-[0.2em] text-dark-dim group-hover:text-white transition-colors flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div> {item.label}
                  </span>
                  <span className="bg-white/5 px-2 py-0.5 rounded-md">{item.count} OPs</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)]`} 
                    style={{ width: `${orders.length > 0 ? (item.count / orders.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}

            <div className="mt-auto p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-110 transition-transform duration-700">
                 <TShirt size={100} weight="fill" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl">
                    <Gear size={20} weight="bold" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Inteligência Operacional</p>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-medium">
                  Identificamos <b>{orders.filter(o => o.current_stage === 'Costura').length} OPs</b> represadas no estágio de costura. 
                  Sugerimos priorizar o acerto com faccionistas externos.
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
    <div className="flex h-screen bg-dark-bg text-white font-inter overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, toggled via isSidebarOpen */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar view={view} setView={(v) => { setView(v); setIsSidebarOpen(false); }} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-dark-bg to-dark-card/20 w-full lg:w-auto">
        
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden p-4 border-b border-dark-border flex items-center justify-between bg-dark-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TShirt size={18} weight="bold" className="text-white" />
            </div>
            <h1 className="text-lg font-black font-outfit text-white">FabricOS</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-dark-bg rounded-lg border border-dark-border text-white"
          >
            <List size={24} />
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
