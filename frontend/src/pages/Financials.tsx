import React, { useEffect, useState } from 'react';
import { CurrencyDollar, Receipt, FileArrowDown, CheckCircle, Clock } from '@phosphor-icons/react';
import { getSettlements, getPartners, getProductionOrders, createSettlement, updateSettlement } from '../services/api';
import type { Settlement, Partner, ProductionOrder } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const Financials: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    order_id: '',
    deductions: 0
  });

  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const [settData, partData, ordData] = await Promise.all([
        getSettlements(),
        getPartners(),
        getProductionOrders()
      ]);
      setSettlements(settData);
      setPartners(partData);
      setOrders(ordData.items.filter(o => o.current_stage === 'Finalizado'));
    } catch (error) {
      console.error("Failed to load financials", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSettlement(newSettlement);
      addToast("Acerto realizado com sucesso!", "success");
      setIsModalOpen(false);
      setNewSettlement({ order_id: '', deductions: 0 });
      loadData();
    } catch (error) {
      addToast("Erro ao realizar acerto", "error");
    }
  };

  const toggleStatus = async (settlement: Settlement) => {
    const newStatus = settlement.status === 'pago' ? 'pendente' : 'pago';
    try {
      await updateSettlement(settlement.id, { status: newStatus });
      addToast(`Acerto marcado como ${newStatus}`, "success");
      loadData();
    } catch (error) {
      addToast("Erro ao atualizar status do acerto", "error");
    }
  };

  const filteredSettlements = settlements.filter(s => {
    if (!filterMonth) return true;
    const sDate = new Date(s.created_at);
    const filterYear = parseInt(filterMonth.split('-')[0]);
    const filterM = parseInt(filterMonth.split('-')[1]) - 1;
    return sDate.getFullYear() === filterYear && sDate.getMonth() === filterM;
  });

  const totalPayable = filteredSettlements.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.net_amount, 0);
  const totalPaid = filteredSettlements.filter(s => s.status === 'pago').reduce((acc, s) => acc + s.net_amount, 0);

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
          <h2 className="text-3xl font-bold text-success font-outfit">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="card bg-blue-500/5 border-blue-500/20">
          <p className="text-dark-dim text-xs uppercase font-bold tracking-widest mb-1">Total de Acertos (Mês)</p>
          <h2 className="text-3xl font-bold text-blue-500 font-outfit">{filteredSettlements.length}</h2>
        </div>
      </div>

      {/* Settlement Table */}
      <section className="card !p-0 overflow-hidden flex-1 flex flex-col">
        <div className="p-6 border-b border-dark-border flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-bold">Histórico de Fechamentos</h3>
          <div className="flex gap-4">
            <input 
              type="month" 
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-sm focus:border-primary outline-none"
            />
            <button className="text-xs flex items-center gap-2 text-primary hover:underline">
              <FileArrowDown size={18} /> Exportar CSV
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-auto">
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
              {filteredSettlements.map(s => {
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
                      <button 
                        onClick={() => toggleStatus(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm ${s.status === 'pago' ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-warning/10 text-warning hover:bg-warning/20'}`}
                        title={s.status === 'pago' ? "Marcar como Pendente" : "Marcar como Pago"}
                      >
                        {s.status === 'pago' ? <CheckCircle size={14} weight="bold" /> : <Clock size={14} weight="bold" />}
                        {s.status}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSettlements.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-dark-dim flex flex-col items-center gap-3">
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
