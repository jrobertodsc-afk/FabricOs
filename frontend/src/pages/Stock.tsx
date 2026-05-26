import React, { useEffect, useState } from 'react';
import { Warehouse, MagnifyingGlass, ArrowsClockwise, ArrowUpRight, ArrowDownRight, Clock, Plus, Minus, ListChecks } from '@phosphor-icons/react';
import { getFinishedStock, adjustFinishedStock, getFinishedStockMovements, getProducts } from '../services/api';
import type { FinishedStockItem, FinishedStockMovement, Product } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const Stock: React.FC = () => {
  const [stockItems, setStockItems] = useState<FinishedStockItem[]>([]);
  const [movements, setMovements] = useState<FinishedStockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'producao' | 'acervo'>('producao');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panels
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // Adjustment state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [description, setDescription] = useState('');
  const [referenceOpId, setReferenceOpId] = useState('');
  const [qtyGrade, setQtyGrade] = useState<Record<string, number>>({
    PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0
  });

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockData, productsData] = await Promise.all([
        getFinishedStock(),
        getProducts()
      ]);
      setStockItems(stockData);
      setProducts(productsData);
      
      const movementData = await getFinishedStockMovements();
      setMovements(movementData);
    } catch (error) {
      console.error("Failed to load stock data", error);
      addToast("Erro ao carregar dados de estoque", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      addToast("Selecione um produto", "error");
      return;
    }

    // Verify if at least one quantity is > 0
    const totalQty = Object.values(qtyGrade).reduce((sum, val) => sum + val, 0);
    if (totalQty <= 0) {
      addToast("Insira a quantidade de pelo menos um tamanho", "error");
      return;
    }

    try {
      await adjustFinishedStock({
        product_id: selectedProductId,
        stock_type: activeTab,
        movement_type: movementType,
        quantity_grade: qtyGrade,
        description: description || `Ajuste manual de ${movementType === 'entrada' ? 'entrada' : 'saída'}`,
        reference_op_id: referenceOpId ? referenceOpId : undefined
      });

      addToast("Estoque ajustado com sucesso", "success");
      setIsAdjustModalOpen(false);
      resetAdjustmentForm();
      loadData();
    } catch (error: any) {
      console.error("Failed to adjust stock", error);
      addToast(error.response?.data?.detail || "Erro ao ajustar estoque", "error");
    }
  };

  const resetAdjustmentForm = () => {
    setSelectedProductId('');
    setMovementType('entrada');
    setDescription('');
    setReferenceOpId('');
    setQtyGrade({ PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0 });
  };

  const incrementSize = (size: string) => {
    setQtyGrade(prev => ({
      ...prev,
      [size]: (prev[size] || 0) + 1
    }));
  };

  const decrementSize = (size: string) => {
    setQtyGrade(prev => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) - 1)
    }));
  };

  const handleSizeChange = (size: string, val: string) => {
    const num = parseInt(val) || 0;
    setQtyGrade(prev => ({
      ...prev,
      [size]: Math.max(0, num)
    }));
  };

  const filteredStock = stockItems.filter(item => {
    const matchesTab = item.stock_type === activeTab;
    const matchesQuery = item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.product?.reference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const activeMovements = movements.filter(m => m.stock_type === activeTab);

  const getGridTotal = (grade: Record<string, number> = {}) => {
    return Object.values(grade).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Controle de Estoque Acabado</h1>
          <p className="text-dark-dim text-sm">Gerencie o acervo de pilotagem e o estoque comercial BOAH.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou ref..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all w-64"
            />
          </div>
          
          <button 
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="px-5 py-2 bg-white/5 border border-dark-border rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
          >
            <Clock size={18} />
            Histórico de Movimentos
          </button>

          <button 
            onClick={() => setIsAdjustModalOpen(true)}
            className="btn-primary py-2"
          >
            <Warehouse size={18} weight="bold" />
            Lançar Movimentação
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-dark-border mb-6 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('producao')}
          className={`px-6 py-3 font-outfit font-bold text-sm transition-all border-b-2 -mb-[2px] ${activeTab === 'producao' ? 'border-primary text-primary' : 'border-transparent text-dark-dim hover:text-white'}`}
        >
          Estoque Comercial (Vendas)
        </button>
        <button 
          onClick={() => setActiveTab('acervo')}
          className={`px-6 py-3 font-outfit font-bold text-sm transition-all border-b-2 -mb-[2px] ${activeTab === 'acervo' ? 'border-primary text-primary' : 'border-transparent text-dark-dim hover:text-white'}`}
        >
          Estoque de Acervo (Showroom / Pilotos)
        </button>
      </div>

      {/* Main Stock Table */}
      <div className="card flex-1 overflow-hidden flex flex-col !p-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-20 text-center text-dark-dim flex flex-col items-center justify-center gap-4">
              <ArrowsClockwise className="animate-spin text-primary" size={32} />
              <p>Sincronizando inventários acabados...</p>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-20 text-center text-dark-dim flex flex-col items-center gap-4">
              <Warehouse size={64} weight="thin" className="text-dark-dim/55" />
              <p className="text-sm font-medium">Nenhum produto cadastrado neste estoque.</p>
              <p className="text-xs text-dark-dim max-w-xs">Lance uma movimentação manual ou aprove uma Ficha de Pilotagem BOAH para catalogar itens no estoque.</p>
            </div>
          ) : (
            <div className="w-full text-left border-collapse">
              {/* Header */}
              <div className="grid grid-cols-12 table-header p-4 sticky top-0 bg-dark-card z-10 text-xs">
                <div className="col-span-4 font-black">Produto / Referência</div>
                <div className="col-span-7 grid grid-cols-6 text-center font-black">
                  <div>PP</div>
                  <div>P</div>
                  <div>M</div>
                  <div>G</div>
                  <div>GG</div>
                  <div>U</div>
                </div>
                <div className="col-span-1 text-right font-black">Total</div>
              </div>
              
              {/* Rows */}
              <div className="divide-y divide-dark-border">
                {filteredStock.map(item => {
                  const total = getGridTotal(item.size_grade);
                  return (
                    <div key={item.id} className="grid grid-cols-12 p-4 hover:bg-white/[0.02] transition-colors items-center">
                      <div className="col-span-4 flex flex-col gap-1">
                        <span className="font-bold text-sm text-white/90">{item.product?.name}</span>
                        <span className="text-[10px] font-bold bg-white/5 self-start px-2 py-0.5 rounded tracking-widest text-primary uppercase">{item.product?.reference}</span>
                      </div>
                      
                      <div className="col-span-7 grid grid-cols-6 text-center text-sm">
                        <div className={`font-mono ${item.size_grade?.PP > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.PP || 0}
                        </div>
                        <div className={`font-mono ${item.size_grade?.P > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.P || 0}
                        </div>
                        <div className={`font-mono ${item.size_grade?.M > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.M || 0}
                        </div>
                        <div className={`font-mono ${item.size_grade?.G > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.G || 0}
                        </div>
                        <div className={`font-mono ${item.size_grade?.GG > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.GG || 0}
                        </div>
                        <div className={`font-mono ${item.size_grade?.U > 0 ? 'text-white font-bold' : 'text-dark-dim/30'}`}>
                          {item.size_grade?.U || 0}
                        </div>
                      </div>
                      
                      <div className="col-span-1 text-right font-bold text-sm text-white font-outfit">
                        {total} <span className="text-[10px] font-medium text-dark-dim">un</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Movement Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-xl rounded-2xl p-6 h-[90vh] flex flex-col animate-scale-up">
            <h2 className="text-xl font-bold mb-1 font-outfit">Nova Movimentação de Estoque</h2>
            <p className="text-xs text-dark-dim mb-6">
              Registrar entrada ou saída manual no estoque: <strong className="text-primary">{activeTab === 'producao' ? 'Comercial' : 'Acervo'}</strong>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* Product Selection */}
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Modelo / Produto</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                  ))}
                </select>
              </div>

              {/* Movement Type & OP ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Tipo de Movimento</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementType('entrada')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 border transition-all ${movementType === 'entrada' ? 'bg-success/15 border-success text-success' : 'border-dark-border hover:bg-white/5 text-dark-dim'}`}
                    >
                      <ArrowUpRight size={16} />
                      Entrada (Aumento)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('saida')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 border transition-all ${movementType === 'saida' ? 'bg-danger/15 border-danger text-danger' : 'border-dark-border hover:bg-white/5 text-dark-dim'}`}
                    >
                      <ArrowDownRight size={16} />
                      Saída (Baixa)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">OP Vinculada (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ID ou Número da OP"
                    value={referenceOpId}
                    onChange={e => setReferenceOpId(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>

              {/* Sizing Grid Grid Controls */}
              <div className="border border-dark-border/40 rounded-xl p-4 bg-white/[0.01]">
                <h3 className="text-xs font-bold text-dark-dim uppercase tracking-wider mb-3">Grade de Quantidades</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(qtyGrade).map(size => (
                    <div key={size} className="flex flex-col gap-1 bg-dark-bg/60 p-2 rounded-lg border border-dark-border/60">
                      <span className="text-[10px] font-black text-dark-dim self-center">{size}</span>
                      <div className="flex justify-between items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decrementSize(size)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/80 active:scale-95"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <input
                          type="number"
                          value={qtyGrade[size] === 0 ? '' : qtyGrade[size]}
                          placeholder="0"
                          onChange={e => handleSizeChange(size, e.target.value)}
                          className="w-12 text-center bg-transparent border-none outline-none font-bold text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => incrementSize(size)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/80 active:scale-95"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs mt-4 font-bold text-dark-dim">
                  <span>Soma Total Lançada:</span>
                  <span className="text-white font-outfit">{getGridTotal(qtyGrade)} un</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Motivo / Descrição</label>
                <textarea
                  required
                  placeholder="Ex: Entrada por conclusão da OP 2043, ou Ajuste manual devido a refugo"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none h-16 text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 sticky bottom-0 bg-dark-card pb-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    resetAdjustmentForm();
                  }} 
                  className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5 transition-all text-sm font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary justify-center text-sm"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Audit Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-dark-card w-full max-w-lg border-l border-dark-border p-6 h-screen flex flex-col animate-slide-left shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold font-outfit">Linha de Tempo de Movimentações</h2>
                <p className="text-xs text-dark-dim">Histórico completo de auditoria de estoque</p>
              </div>
              <button 
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-xs font-bold text-primary hover:underline bg-white/5 px-3 py-1.5 rounded-lg border border-dark-border/40"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {activeMovements.length === 0 ? (
                <div className="text-center py-20 text-dark-dim flex flex-col items-center gap-2">
                  <ListChecks size={36} weight="thin" />
                  <p className="text-xs">Nenhum movimento registrado para este estoque.</p>
                </div>
              ) : (
                activeMovements.map((move, index) => {
                  const isEntrada = move.movement_type === 'entrada';
                  return (
                    <div key={move.id || index} className="p-4 bg-white/[0.01] hover:bg-white/[0.02] border border-dark-border/50 rounded-xl flex gap-4 items-start transition-colors">
                      <div className={`p-2 rounded-lg ${isEntrada ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {isEntrada ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-sm text-white/90 truncate">{move.product?.name || 'Produto'}</span>
                          <span className={`text-xs font-black font-outfit ${isEntrada ? 'text-success' : 'text-danger'}`}>
                            {isEntrada ? '+' : '-'}{move.total_quantity} un
                          </span>
                        </div>
                        <span className="text-[9px] font-bold bg-white/5 self-start px-2 py-0.5 rounded tracking-widest text-dark-dim uppercase">
                          {move.product?.reference}
                        </span>
                        
                        <p className="text-xs text-dark-dim mt-2 bg-dark-bg/60 p-2 rounded border border-dark-border/30">
                          {move.description}
                        </p>
                        
                        <div className="flex justify-between items-center mt-3 text-[10px] text-dark-dim font-bold uppercase">
                          <span>{new Date(move.created_at).toLocaleDateString('pt-BR')} às {new Date(move.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {move.reference_op_id && <span className="text-primary font-mono">OP: {String(move.reference_op_id).slice(0,8)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
