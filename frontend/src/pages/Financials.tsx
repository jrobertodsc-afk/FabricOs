import React, { useEffect, useState } from 'react';
import { CurrencyDollar, Receipt, Warning, CheckCircle, FileArrowDown } from '@phosphor-icons/react';
import { getSettlements, getPartners, getProductionOrders, createSettlement } from '../services/api';
import type { Settlement, Partner, ProductionOrder } from '../services/api';

const Financials: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    order_id: '',
    deductions: 0
  });

  const loadData = async () => {
    try {
      const [settData, partData, ordData] = await Promise.all([
        getSettlements(),
        getPartners(),
        getProductionOrders()
      ]);
      setSettlements(settData);
      setPartners(partData);
      setOrders(ordData.filter(o => o.current_stage === 'Finalizado'));
    } catch (error) {
      console.error("Failed to load financials", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSettlement(newSettlement);
      setIsModalOpen(false);
      setNewSettlement({ order_id: '', deductions: 0 });
      loadData();
    } catch (error) {
      alert("Erro ao realizar acerto");
    }
  };

  const totalPayable = settlements.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.net_amount, 0);

  return (
    <div className="p-8 h-screen flex flex-col overflow-hidden">
      <header className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Acerto de Faccionistas</h1>
          <p className="text-dark-dim">Controle de pagamentos e fechamentos de produção</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <CurrencyDollar size={20} weight="bold" />
          Realizar Acerto
        </button>
      </header>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8 flex-shrink-0">
        <div className="card bg-warning/5 border-warning/20">
          <p className="text-dark-dim text-xs uppercase font-bold tracking-widest mb-1">Total Pendente</p>
          <h2 className="text-3xl font-bold text-warning font-outfit">
            R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="card bg-success/5 border-success/20">
          <p className="text-dark-dim text-xs uppercase font-bold tracking-widest mb-1">Total Pago (Mês)</p>
          <h2 className="text-3xl font-bold text-success font-outfit">R$ 0,00</h2>
        </div>
        <div className="card bg-blue-500/5 border-blue-500/20">
          <p className="text-dark-dim text-xs uppercase font-bold tracking-widest mb-1">Aglomeração de OPs</p>
          <h2 className="text-3xl font-bold text-blue-500 font-outfit">{settlements.length}</h2>
        </div>
      </div>

      {/* Settlement Table */}
      <section className="card !p-0 overflow-hidden flex-1 flex flex-col">
        <div className="p-6 border-b border-dark-border flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-bold">Histórico de Fechamentos</h3>
          <button className="text-xs flex items-center gap-2 text-primary hover:underline">
            <FileArrowDown size={18} /> Exportar CSV
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-dark-card z-10">
              <tr className="table-header">
                <th className="px-6 py-4">OP</th>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">NF</th>
                <th className="px-6 py-4">Bruto</th>
                <th className="px-6 py-4">Descontos</th>
                <th className="px-6 py-4">Líquido</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {settlements.map(s => {
                const partner = partners.find(p => p.id === s.partner_id);
                const order = orders.find(o => o.id === s.order_id);
                return (
                  <tr key={s.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Receipt size={16} className="text-dark-dim" />
                        <span className="font-bold text-xs">#{order?.order_number || 'OP'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{partner?.name || '---'}</td>
                    <td className="px-6 py-4 text-sm text-dark-dim">{s.nf_number || '---'}</td>
                    <td className="px-6 py-4 text-sm text-dark-dim">R$ {s.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-danger">- R$ {s.deductions.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">R$ {s.net_amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.status === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {settlements.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-dark-dim flex flex-col items-center gap-3">
                  <CurrencyDollar size={48} weight="thin" />
                  Nenhum acerto realizado.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Realizar Acerto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CurrencyDollar size={24} className="text-primary" />
              Novo Fechamento
            </h2>
            <form onSubmit={handleCreateSettlement} className="space-y-4">
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Selecione a OP Finalizada</label>
                <select 
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                  value={newSettlement.order_id}
                  onChange={e => setNewSettlement({...newSettlement, order_id: e.target.value})}
                  required
                >
                  <option value="">Escolha uma OP</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>OP #{o.order_number} - {o.item_name}</option>
                  ))}
                </select>
                {orders.length === 0 && <p className="text-[10px] text-danger mt-1">Nenhuma OP no estágio "Finalizado" disponível.</p>}
              </div>
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Deduções / Multas (R$)</label>
                <input 
                  type="number" step="0.01"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                  value={newSettlement.deductions}
                  onChange={e => setNewSettlement({...newSettlement, deductions: parseFloat(e.target.value)})}
                />
                <p className="text-[10px] text-dark-dim mt-1">Ex: Desconto por peças com defeito ou atraso.</p>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <p className="text-xs text-dark-dim mb-1">Resumo do Cálculo:</p>
                <p className="text-sm font-bold">Total Bruto: <span className="text-white">Qtd OP * Preço/Peça</span></p>
                <p className="text-sm font-bold">Líquido: <span className="text-primary">Bruto - Deduções</span></p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary justify-center">Confirmar Acerto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financials;
