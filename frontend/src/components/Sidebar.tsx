import React from 'react';
import { 
  ChartLineUp, Package, Users, Receipt, Truck,
  ClockCounterClockwise, ListChecks, Gear, Ruler, ChartBar, TShirt, Warehouse, Tag
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export type ViewType = 'dashboard' | 'withdrawals' | 'partners' | 'production' | 'financials' | 'products' | 'materials' | 'settings' | 'history' | 'reports' | 'stock' | 'pilotage';

interface SidebarProps {
  view: ViewType;
  setView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ view, setView }) => {
  const navigate = useNavigate();

  const renderSidebarItem = (id: ViewType, label: string, icon: any) => (
    <button 
      onClick={() => setView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === id ? 'bg-primary/10 text-primary shadow-sm shadow-primary/10' : 'text-dark-dim hover:text-white hover:bg-white/5'}`}
    >
      {React.createElement(icon, { size: 20, weight: view === id ? "bold" : "regular" })}
      <span className={view === id ? "font-bold" : ""}>{label}</span>
    </button>
  );

  return (
    <aside className="w-72 bg-dark-card border-r border-dark-border flex flex-col h-full shrink-0">
      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 rotate-3">
            <TShirt size={26} weight="bold" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-outfit tracking-tighter leading-none text-white">FabricOS</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Smart Factory</p>
          </div>
        </div>

        <nav className="space-y-2">
          <p className="text-[10px] font-black text-dark-dim uppercase tracking-[0.2em] mb-4 ml-2">Menu Principal</p>
          {renderSidebarItem('dashboard', 'Dashboard', ChartLineUp)}
          {renderSidebarItem('withdrawals', 'Retiradas', Truck)}
          {renderSidebarItem('production', 'Produção (OP)', Package)}
          {renderSidebarItem('partners', 'Faccionistas', Users)}
          {renderSidebarItem('financials', 'Financeiro (Acerto)', Receipt)}
          
          <p className="text-[10px] font-black text-dark-dim uppercase tracking-[0.2em] mb-4 mt-8 ml-2">Almoxarifado & Acervo</p>
          {renderSidebarItem('materials', 'Estoque Insumos', Ruler)}
          {renderSidebarItem('stock', 'Estoque Acabado', Warehouse)}
          {renderSidebarItem('products', 'Fichas Técnicas', ListChecks)}
          {renderSidebarItem('pilotage', 'Pilotagem (BOAH)', Tag)}
          
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
            localStorage.removeItem('fabricos_tenant_id');
            navigate('/login');
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
  );
};

export default Sidebar;
