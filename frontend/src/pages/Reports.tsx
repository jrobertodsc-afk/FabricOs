import React, { useEffect, useState } from 'react';
import { ChartBar, DownloadSimple, Funnel, Users, Calendar, TrendUp, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { getProductionOrders, getPartners, getSettlements, getQualityStats } from '../services/api';
import type { ProductionOrder, Partner, Settlement, QualityStats } from '../services/api';

const Reports: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [qualityStats, setQualityStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [oData, pData, sData, qData] = await Promise.all([
          getProductionOrders(),
          getPartners(),
          getSettlements(),
          getQualityStats()
        ]);
        setOrders(oData.items);
        setPartners(pData);
        setSettlements(sData);
        setQualityStats(qData);
      } catch (error) {
        console.error("Failed to load report data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalProduced = orders.filter(o => o.current_stage === 'Finalizado').reduce((acc, o) => acc + o.total_quantity, 0);
  const activeOrders = orders.filter(o => o.current_stage !== 'Finalizado').length;

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Relatórios & BI</h1>
          <p className="text-dark-dim">Análise de produtividade e desempenho da sua fábrica.</p>
        </div>
        <button className="btn-secondary">
          <DownloadSimple size={18} weight="thin" />
          Exportar Excel
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
         <div className="card">
            <p className="text-[10px] font-bold text-dark-dim uppercase tracking-wider mb-2">Total Produzido (Pças)</p>
            <h2 className="text-3xl font-bold font-outfit text-zinc-100">{totalProduced.toLocaleString('pt-BR')}</h2>
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-3">
               <TrendUp size={14} weight="thin" /> +15.4% este mês
            </div>
         </div>
         <div className="card">
            <p className="text-[10px] font-bold text-dark-dim uppercase tracking-wider mb-2">Custo Médio / Peça</p>
            <h2 className="text-3xl font-bold font-outfit text-zinc-100">R$ 12,45</h2>
            <p className="text-zinc-500 text-[10px] mt-3">Baseado em 1.240 acertos</p>
         </div>
         <div className="card">
            <p className="text-[10px] font-bold text-dark-dim uppercase tracking-wider mb-2">Taxa de Defeitos</p>
            <h2 className="text-3xl font-bold font-outfit text-zinc-100">
               {qualityStats ? qualityStats.defect_rate.toFixed(1) : '0'}%
            </h2>
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-3">
               <WarningCircle size={14} weight="thin" /> Meta: abaixo de 2%
            </div>
         </div>
         <div className="card">
            <p className="text-[10px] font-bold text-dark-dim uppercase tracking-wider mb-2">Eficiência de Entrega</p>
            <h2 className="text-3xl font-bold font-outfit text-zinc-100">94%</h2>
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-3">
               <CheckCircle size={14} weight="thin" /> OPs entregues no prazo
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
        <div className="card flex flex-col !p-0 overflow-hidden">
          <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={18} className="text-primary" /> Ranking de Faccionistas
            </h3>
            <Funnel size={18} className="text-dark-dim cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-6">
             <div className="space-y-6">
                {partners.filter(p => p.type === 'faccionista').map(p => (
                   <div key={p.id}>
                      <div className="flex justify-between text-xs mb-2">
                         <span className="font-bold">{p.name}</span>
                         <span className="text-dark-dim">{orders.filter(o => o.partner_id === p.id).length} OPs</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, orders.filter(o => o.partner_id === p.id).length * 10)}%` }}></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="card flex flex-col !p-0 overflow-hidden">
          <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar size={18} className="text-info" /> Prazos e Vencimentos
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
             <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-dark-dim">
                   <tr>
                      <th className="px-6 py-3">OP</th>
                      <th className="px-6 py-3">Prazo</th>
                      <th className="px-6 py-3">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                   {orders.slice(0, 10).map(o => (
                      <tr key={o.id} className="text-xs">
                         <td className="px-6 py-4 font-bold">{o.order_number}</td>
                         <td className="px-6 py-4">{o.due_date ? new Date(o.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</td>
                         <td className="px-6 py-4">
                            <div className="tag-neutral flex items-center gap-1.5 w-fit">
                               <div className={`w-1.5 h-1.5 rounded-full ${o.current_stage === 'Finalizado' ? 'bg-success' : 'bg-warning'}`}></div>
                               {o.current_stage}
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
