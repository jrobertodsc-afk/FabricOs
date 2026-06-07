import React, { useState, useEffect } from 'react';
import { Scissors, Check, X, Clock, Ruler, Stack, User, CaretRight, CheckCircle } from '@phosphor-icons/react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const MobileCutting: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const { addToast } = useToast();

  // Form states
  const [cutSeparatorName, setCutSeparatorName] = useState('');
  const [fabricQty, setFabricQty] = useState('');
  const [batidasCount, setBatidasCount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    fetchOrdersAndStages();
  }, []);

  const fetchOrdersAndStages = async () => {
    setLoading(true);
    try {
      const [resOrders, resStages] = await Promise.all([
        api.get('/api/production/orders'),
        api.get('/api/production/stages')
      ]);
      
      const stagesData = resStages.data;
      setStages(stagesData);

      const corteStages = stagesData.filter((s: any) => s.macro_stage === 'Corte').map((s: any) => s.name);
      const dataArray = resOrders.data.items || resOrders.data;
      
      const cuttingOrders = dataArray.filter((o: any) => 
        o.current_stage && corteStages.includes(o.current_stage) && o.status !== 'na_fila'
      );
      setOrders(cuttingOrders);
    } catch (error) {
      console.error(error);
      addToast("Erro ao carregar OPs do corte.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setCutSeparatorName(order.cut_separator_name || '');
    setFabricQty(order.fabric_quantity_mts?.toString() || '');
    setBatidasCount(order.batidas_count?.toString() || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);

    try {
      let payload: any = {};
      const currentIndex = stages.findIndex(s => s.name === selectedOrder.current_stage);
      const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1].name : selectedOrder.current_stage;

      if (!selectedOrder.cutting_start) {
        payload.cutting_start = new Date().toISOString();
      }
      
      payload.cut_separator_name = cutSeparatorName || selectedOrder.cut_separator_name;
      payload.current_stage = nextStage;
      
      if (fabricQty) payload.fabric_quantity_mts = parseFloat(fabricQty);
      if (batidasCount) payload.batidas_count = parseInt(batidasCount);

      await api.patch(`/api/production/orders/${selectedOrder.id}`, payload);
      
      addToast(`Avançado para ${nextStage}!`, "success");
      setSelectedOrder(null);
      fetchOrdersAndStages();
    } catch (error) {
      console.error(error);
      addToast("Erro ao salvar dados.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedOrder) {
    const isCuttingNow = !!selectedOrder.cutting_start;

    return (
      <div className="flex flex-col h-screen bg-dark-bg p-4 md:p-8 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          <button 
            onClick={() => setSelectedOrder(null)}
            className="mb-6 flex items-center gap-2 text-dark-dim hover:text-white transition-colors"
          >
            <CaretRight size={20} className="rotate-180" />
            Voltar para a Lista
          </button>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-6 border-b border-dark-border/50 pb-6">
              <div className="bg-primary/20 text-primary p-4 rounded-xl">
                <Scissors size={32} weight="bold" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-outfit uppercase">OP #{selectedOrder.order_number}</h1>
                <p className="text-white/80 font-bold">{selectedOrder.item_name}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isCuttingNow ? (
                <div>
                  <label className="text-sm font-bold text-white/90 block mb-2 flex items-center gap-2">
                    <User size={18} className="text-primary" /> Seu Nome (Responsável)
                  </label>
                  <input 
                    type="text" 
                    required
                    value={cutSeparatorName}
                    onChange={(e) => setCutSeparatorName(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: João Silva"
                  />
                </div>
              ) : (
                <>
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl mb-4">
                    <p className="text-sm text-primary font-bold">Cortador: <span className="text-white">{cutSeparatorName}</span></p>
                    <p className="text-xs text-primary/70 mt-1">Corte iniciado às {new Date(selectedOrder.cutting_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-white/90 block mb-2 flex items-center gap-2">
                        <Ruler size={18} className="text-primary" /> Tecido Gasto (Metros)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={fabricQty}
                        onChange={e => setFabricQty(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-lg focus:border-primary outline-none"
                        placeholder="Ex: 12.5"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-white/90 block mb-2 flex items-center gap-2">
                        <Stack size={18} className="text-primary" /> Qtd Batidas / Enfesto
                      </label>
                      <input 
                        type="number" 
                        value={batidasCount}
                        onChange={e => setBatidasCount(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-lg focus:border-primary outline-none"
                        placeholder="Ex: 5"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-6 border-t border-dark-border/50">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(30,136,229,0.3)] disabled:opacity-50"
                >
                  <CheckCircle size={24} weight="fill" />
                  {submitting ? 'Aguarde...' : (!isCuttingNow ? 'Confirmar Início de Corte' : 'Confirmar e Avançar Etapa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex flex-col h-screen overflow-hidden">
      <header className="mb-8 flex items-center gap-4">
        <div className="bg-primary/20 text-primary p-3 rounded-xl">
          <Scissors size={28} weight="bold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-outfit text-white">Controle de Corte</h1>
          <p className="text-sm text-dark-dim">Selecione uma OP para informar os dados</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 bg-dark-card border border-dark-border border-dashed rounded-2xl text-dark-dim">
            <Check size={48} className="mb-2 text-dark-dim/50" />
            <p className="font-bold text-lg text-white">Nenhuma OP no Corte</p>
            <p className="text-sm">Todas as ordens já foram processadas ou avançaram de estágio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => {
              const isCuttingNow = !!order.cutting_start;
              return (
                <button 
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`border rounded-2xl p-5 text-left transition-all group flex flex-col h-full ${
                    isCuttingNow 
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500' 
                      : 'bg-dark-card border-dark-border hover:border-primary'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-black text-xl text-white group-hover:text-primary transition-colors">#{order.order_number}</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1 ${
                      isCuttingNow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-warning/20 text-warning'
                    }`}>
                      <Clock size={14} /> {isCuttingNow ? 'Em Corte' : 'Aguardando Corte'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{order.item_name}</h3>
                  <div className="text-sm text-dark-dim mb-4 space-y-1">
                    {order.collection && <p><span className="text-white/40">Família:</span> {order.collection}</p>}
                    {order.fabric_description && <p><span className="text-white/40">Tecido:</span> {order.fabric_description}</p>}
                    {order.fabric_quantity_mts != null && <p><span className="text-white/40">Metragem:</span> {order.fabric_quantity_mts} m</p>}
                    {isCuttingNow && order.cut_separator_name && (
                      <p><span className="text-emerald-400/60">Cortador:</span> <span className="text-emerald-400 font-bold">{order.cut_separator_name}</span></p>
                    )}
                    {(!isCuttingNow && order.observations) && <p className="line-clamp-2 mt-2 pt-2 border-t border-dark-border/30">{order.observations}</p>}
                  </div>
                  <div className="mt-auto pt-4 border-t border-dark-border/50 w-full flex justify-between items-center text-xs font-bold text-white/50">
                    <span>Qtd Total: {order.total_quantity}</span>
                    <span className={`group-hover:translate-x-1 transition-transform flex items-center gap-1 ${
                      isCuttingNow ? 'text-emerald-400' : 'text-primary'
                    }`}>
                      {isCuttingNow ? 'Finalizar Corte' : 'Iniciar'} <CaretRight size={14} weight="bold" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileCutting;
