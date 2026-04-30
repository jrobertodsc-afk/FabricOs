import React, { useEffect, useState } from 'react';
import { 
  ChartLineUp, Package, Users, Receipt, Warning, 
  MagnifyingGlass, Plus, ClockCounterClockwise, 
  ListChecks, Gear, Ruler, ChartBar, Scissors, TShirt, CoatHanger
} from '@phosphor-icons/react';
import { 
  getWithdrawals, getProductionOrders, 
  getPartners, getSettlements, createWithdrawal, returnWithdrawal 
} from '../services/api';
import type { Withdrawal, ProductionOrder, Partner, Settlement } from '../services/api';

// Components
import Partners from './Partners';
import ProductionOrders from './ProductionOrders';
import Financials from './Financials';
import Products from './Products';
import Settings from './Settings';
import History from './History';
import Materials from './Materials';
import Reports from './Reports';
import WithdrawalModal from '../components/WithdrawalModal';
import ReturnModal from '../components/ReturnModal';

const Dashboard: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'partners' | 'production' | 'financials' | 'products' | 'materials' | 'settings' | 'history' | 'reports'>('dashboard');
  
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
      setWithdrawals(wData);
      setOrders(oData);
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

  const renderSidebarItem = (id: typeof view, label: string, icon: any) => (
    <a 
      href="#" 
      onClick={() => setView(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === id ? 'bg-primary/10 text-primary shadow-sm shadow-primary/10' : 'text-dark-dim hover:text-white hover:bg-white/5'}`}
    >
      {React.createElement(icon, { size: 20, weight: view === id ? "bold" : "regular" })}
      <span className={view === id ? "font-bold" : ""}>{label}</span>
    </a>
  );

  const renderDashboard = () => (
    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black font-outfit tracking-tight">FabricOS Intelligence</h1>
          <p className="text-dark-dim text-sm font-medium">Monitorando {orders.length} lotes em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
             <div className="text-right">
                <p className="text-xs font-bold text-white">Roberto Nascimento</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrador</p>
             </div>
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">
                RN
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
          placeholder="Pesquisar por OP, Faccionista ou Referência de Produto..." 
          className="w-full bg-dark-card/50 border border-dark-border rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-primary focus:bg-dark-card transition-all shadow-inner"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
           <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-dark-dim">Ctrl</kbd>
           <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-dark-dim">K</kbd>
        </div>
      </div>

      {/* Stats Grid */}
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
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-4 h-full group">
                <div className="w-full bg-white/[0.03] rounded-t-2xl relative flex-1 overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/40 to-primary group-hover:to-primary-hover transition-all duration-700 rounded-t-2xl shadow-[0_-5px_15px_rgba(79,70,229,0.2)]" 
                    style={{ height: `${[40, 70, 45, 90, 65, 30, 20][i]}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-3 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 font-black shadow-2xl scale-90 group-hover:scale-100">
                      {[120, 210, 140, 280, 190, 90, 50][i]} pçs
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-black text-dark-dim uppercase tracking-[0.2em]">{day}</span>
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

  return (
    <div className="flex h-screen bg-dark-bg text-white font-inter overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-dark-card border-r border-dark-border flex flex-col">
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 rotate-3">
              <TShirt size={26} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-outfit tracking-tighter leading-none">FabricOS</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Smart Factory</p>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="text-[10px] font-black text-dark-dim uppercase tracking-[0.2em] mb-4 ml-2">Menu Principal</p>
            {renderSidebarItem('dashboard', 'Dashboard', ChartLineUp)}
            {renderSidebarItem('production', 'Produção (OP)', Package)}
            {renderSidebarItem('partners', 'Faccionistas', Users)}
            {renderSidebarItem('financials', 'Financeiro (Acerto)', Receipt)}
            
            <p className="text-[10px] font-black text-dark-dim uppercase tracking-[0.2em] mb-4 mt-8 ml-2">Almoxarifado</p>
            {renderSidebarItem('materials', 'Estoque Insumos', Ruler)}
            {renderSidebarItem('products', 'Fichas Técnicas', ListChecks)}
            
            <p className="text-[10px] font-black text-dark-dim uppercase tracking-[0.2em] mb-4 mt-8 ml-2">Sistema</p>
            {renderSidebarItem('history', 'Auditoria (Logs)', ClockCounterClockwise)}
            {renderSidebarItem('reports', 'Relatórios & BI', ChartBar)}
            {renderSidebarItem('settings', 'Configurações', Gear)}
          </nav>
        </div>

        <div className="p-8 space-y-6">
           <button 
            onClick={() => {
              localStorage.removeItem('fabricos_token');
              window.location.reload();
            }}
            className="flex items-center gap-3 text-danger font-bold text-xs uppercase tracking-[0.2em] hover:bg-danger/10 p-3 rounded-xl w-full transition-all border border-transparent hover:border-danger/20"
          >
            Sair do Sistema
          </button>
          
          <div className="pt-6 border-t border-dark-border/50 flex justify-between items-center">
            <div>
               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Enterprise</p>
               <p className="text-[10px] text-white/10 font-medium">Build 2026.04</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-dark-bg to-dark-card/20">
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'dashboard' && renderDashboard()}
          {view === 'partners' && <Partners />}
          {view === 'production' && <ProductionOrders />}
          {view === 'financials' && <Financials />}
          {view === 'products' && <Products />}
          {view === 'settings' && <Settings />}
          {view === 'history' && <History />}
          {view === 'reports' && <Reports />}
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
