import React, { useEffect, useState } from 'react';
import { Package, Plus, DotsThreeVertical, Calendar, User, ArrowRight, Trash } from '@phosphor-icons/react';
import { getProductionOrders, updateProductionOrder, deleteProductionOrder, getPartners, createProductionOrder, scanProductionOrder, getProducts, getProductionStages } from '../services/api';
import type { ProductionOrder, Partner, Product } from '../services/api';
import OPLabel from '../components/OPLabel';
import QRScanner from '../components/QRScanner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { QrCode, Scan } from '@phosphor-icons/react';



const ProductionOrders: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_number: '',
    item_name: '',
    total_quantity: 0,
    partner_id: '',
    product_id: '',
    due_date: '',
    collection: '',
    nf_number: '',
    size_grade: {} as Record<string, number>,
    observations: ''
  });

  // Phase 4 States
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);

  // Celebration & Stock Intake States
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ProductionOrder | null>(null);
  const [selectedStockProductId, setSelectedStockProductId] = useState('');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const [ordersData, partnersData, productsData, stagesData] = await Promise.all([
        getProductionOrders(),
        getPartners(),
        getProducts(),
        getProductionStages()
      ]);
      setOrders(ordersData.items);
      setPartners(partnersData);
      setProducts(productsData);
      setStages(stagesData.length > 0 ? stagesData.map(s => s.name) : ["Corte", "Costura", "Acabamento", "Finalizado"]);
    } catch (error) {
      console.error("Failed to load production data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMoveStage = async (id: string, currentStage: string) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        await updateProductionOrder(id, { current_stage: nextStage });
        addToast(`OP movida para ${nextStage}`, "success");
        
        // Se a OP foi finalizada, dispara modal de celebração e entrada de estoque
        if (nextStage === 'Finalizado') {
          const completed = orders.find(o => o.id === id);
          if (completed) {
            setCompletedOrder(completed);
            setSelectedStockProductId(completed.product_id || '');
            setIsCelebrationOpen(true);
          }
        }
        
        loadData();
      } catch (error) {
        addToast("Erro ao atualizar estágio", "error");
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProductionOrder({
        ...newOrder,
        partner_id: newOrder.partner_id || undefined,
        product_id: newOrder.product_id || undefined
      });
      setIsModalOpen(false);
      setNewOrder({ 
        order_number: '', 
        item_name: '', 
        total_quantity: 0, 
        partner_id: '', 
        product_id: '',
        due_date: '',
        collection: '',
        nf_number: '',
        size_grade: {},
        observations: ''
      });
      addToast("OP criada com sucesso", "success");
      loadData();
    } catch (error) {
      addToast("Erro ao criar OP", "error");
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteProductionOrder(orderToDelete.id);
      addToast("OP cancelada com sucesso", "success");
      setIsDeleteOpen(false);
      setOrderToDelete(null);
      loadData();
    } catch (error) {
      addToast("Erro ao cancelar OP", "error");
    }
  };

  const handleScan = async (orderNumber: string) => {
    try {
      await scanProductionOrder(orderNumber);
      addToast("Leitura processada com sucesso!", "success");
      loadData();
    } catch (error: any) {
      addToast(error.response?.data?.detail || "Erro ao processar scan", "error");
    }
  };

  const openLabel = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsLabelOpen(true);
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Ordens de Produção (OP)</h1>
          <p className="text-dark-dim">Acompanhe o fluxo de produção em tempo real</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-dark-border rounded-xl font-bold hover:bg-white/10 transition-colors"
          >
            <Scan size={20} weight="bold" className="text-primary" />
            Escanear
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={20} weight="bold" />
            Nova OP
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-dark-dim">Carregando OPs...</p>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-80 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage === 'Finalizado' ? 'bg-success' : 'bg-primary'}`}></div>
                <h3 className="font-bold font-outfit uppercase tracking-widest text-xs">{stage}</h3>
              </div>
              <span className="bg-white/5 text-dark-dim px-2 py-0.5 rounded text-[10px] font-bold">
                {orders.filter(o => o.current_stage === stage).length}
              </span>
            </div>
            
            <div className="flex-1 space-y-4 min-h-[200px]">
              {orders.filter(o => o.current_stage === stage).map(order => (
                <div key={order.id} className="card !p-4 group cursor-pointer hover:border-primary/40 transition-all border-l-4 border-l-primary/20">
                    {order.product?.image_url && (
                      <div className="w-full h-28 rounded-lg overflow-hidden mb-3 border border-dark-border/40 bg-dark-bg relative">
                        <img 
                          src={order.product.image_url} 
                          alt={order.item_name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-wider">
                        #{order.order_number}
                      </span>
                      {order.nf_number && (
                        <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded uppercase tracking-wider ml-2">
                          NF: {order.nf_number}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openLabel(order)}
                          className="p-1.5 text-dark-dim hover:text-primary transition-colors bg-white/5 rounded-lg"
                          title="Imprimir Etiqueta"
                        >
                          <QrCode size={16} />
                        </button>
                        <button 
                          onClick={() => { setOrderToDelete(order); setIsDeleteOpen(true); }}
                          className="p-1.5 text-dark-dim hover:text-danger transition-colors bg-white/5 rounded-lg"
                          title="Cancelar OP"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm mb-2">{order.item_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-dark-dim mb-4">
                      <Package size={14} />
                      <span>{order.total_quantity} peças</span>
                    </div>
                    
                    <div className="flex items-center gap-3 border-t border-dark-border pt-4">
                      <div className="flex-1 flex items-center gap-2 text-[10px] text-dark-dim">
                        <User size={14} />
                        <span className="truncate">{partners.find(p => p.id === order.partner_id)?.name || 'Sem parceiro'}</span>
                      </div>
                      {stage !== "Finalizado" && (
                        <button 
                          onClick={() => handleMoveStage(order.id, stage)}
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                          title="Mover para o próximo estágio"
                        >
                          <ArrowRight size={14} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova OP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Lançar Nova OP</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Número da OP</label>
                  <input 
                    type="text" required placeholder="Ex: 2025-001"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newOrder.order_number}
                    onChange={e => setNewOrder({...newOrder, order_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Qtd Total</label>
                  <input 
                    type="number" required readOnly
                    className="w-full bg-dark-bg/50 border border-dark-border rounded-xl p-3 outline-none text-dark-dim cursor-not-allowed"
                    value={newOrder.total_quantity}
                    title="Calculado automaticamente pela grade de tamanhos"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Referência / Produto Acabado</label>
                <div className="flex gap-3">
                   <select 
                     className="w-1/3 bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm"
                     value={newOrder.product_id}
                     onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        setNewOrder({
                           ...newOrder, 
                           product_id: e.target.value,
                           item_name: prod ? prod.name : newOrder.item_name
                        });
                     }}
                   >
                     <option value="">Manual...</option>
                     {products.map(p => <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>)}
                   </select>
                   <input 
                     type="text" required placeholder="Nome do Produto"
                     className="flex-1 bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                     value={newOrder.item_name}
                     onChange={e => setNewOrder({...newOrder, item_name: e.target.value})}
                   />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Coleção</label>
                  <input 
                    type="text" placeholder="Ex: Verão 2025"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newOrder.collection}
                    onChange={e => setNewOrder({...newOrder, collection: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Parceiro (Opcional)</label>
                  <select 
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newOrder.partner_id}
                    onChange={e => setNewOrder({...newOrder, partner_id: e.target.value})}
                  >
                    <option value="">Selecione um parceiro</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-dim uppercase mb-2">Nota Fiscal (Industrialização)</label>
                <input 
                  type="text" 
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                  value={newOrder.nf_number}
                  onChange={e => setNewOrder({...newOrder, nf_number: e.target.value})}
                  placeholder="Ex: 000.123.456"
                />
              </div>

              <div>
                <label className="text-xs text-dark-dim mb-3 block">Grade de Tamanhos (Lista Suspensa)</label>
                <div className="grid grid-cols-3 gap-3">
                  {['PP', 'P', 'M', 'G', 'GG', 'U'].map(size => (
                    <div key={size} className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-dark-dim">{size}</span>
                      <input 
                        type="number" min="0" placeholder="0"
                        className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-xs focus:border-primary outline-none"
                        value={newOrder.size_grade[size] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newSizeGrade = { ...newOrder.size_grade, [size]: val };
                          const newTotal = Object.values(newSizeGrade).reduce((acc, curr) => acc + curr, 0);
                          setNewOrder({
                            ...newOrder,
                            size_grade: newSizeGrade,
                            total_quantity: newTotal
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-dark-dim mb-1 block">Observações Técnicas</label>
                <textarea 
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none h-20 text-sm"
                  placeholder="Ex: Usar linha reforçada no gancho..."
                  value={newOrder.observations}
                  onChange={e => setNewOrder({...newOrder, observations: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary justify-center">Lançar OP</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Phase 4 Components */}
      <OPLabel 
        isOpen={isLabelOpen} 
        onClose={() => setIsLabelOpen(false)} 
        order={selectedOrder}
        partnerName={partners.find(p => p.id === selectedOrder?.partner_id)?.name}
      />
      
      <QRScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Cancelar OP"
        message={`Tem certeza que deseja cancelar a OP #${orderToDelete?.order_number}? Esta ação removerá a OP do fluxo e reverterá insumos reservados, caso existam.`}
        confirmText="Cancelar OP"
      />

      {/* Modal de Celebração e Entrada em Estoque Comercial */}
      {isCelebrationOpen && completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6 text-center relative overflow-hidden animate-scale-up">
            {/* Visual glow decoration */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-success/20 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-6 border border-success/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Package size={32} weight="fill" className="animate-bounce" />
            </div>
            
            <h2 className="text-2xl font-black font-outfit text-white mb-2">🎉 OP Concluída com Sucesso!</h2>
            <p className="text-xs text-dark-dim mb-6">
              A OP <strong className="text-white">#{completedOrder.order_number}</strong> ({completedOrder.item_name}) foi finalizada. Deseja dar entrada automática em estoque comercial?
            </p>

            <div className="border border-dark-border/40 rounded-xl p-4 bg-white/[0.01] mb-6 text-left">
              <h3 className="text-[10px] font-black text-dark-dim uppercase tracking-wider mb-2">Grade Produzida</h3>
              <div className="grid grid-cols-6 gap-2 text-center">
                {['PP', 'P', 'M', 'G', 'GG', 'U'].map(size => {
                  const qty = completedOrder.size_grade?.[size] || 0;
                  return (
                    <div key={size} className="bg-dark-bg/60 p-1.5 rounded border border-dark-border/40">
                      <span className="block text-[8px] font-black text-dark-dim uppercase">{size}</span>
                      <span className={`font-mono font-bold text-xs ${qty > 0 ? 'text-white' : 'text-white/20'}`}>{qty}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs mt-4 font-bold text-dark-dim border-t border-dark-border/40 pt-2">
                <span>Total de Peças:</span>
                <span className="text-success font-outfit">{completedOrder.total_quantity} un</span>
              </div>
            </div>

            {/* Selector if no linked product exists */}
            {!completedOrder.product_id && (
              <div className="text-left mb-6">
                <label className="text-xs text-dark-dim mb-1 block">Vincular a qual Ficha Técnica no catálogo?</label>
                <select
                  value={selectedStockProductId}
                  onChange={e => setSelectedStockProductId(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-warning mt-1.5">A OP precisa estar associada a um produto do catálogo para lançar as peças em estoque acabado.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={(!completedOrder.product_id && !selectedStockProductId) || isSubmittingIntake}
                onClick={async () => {
                  try {
                    setIsSubmittingIntake(true);
                    
                    // Link catalog product if missing
                    if (!completedOrder.product_id && selectedStockProductId) {
                      await updateProductionOrder(completedOrder.id, { product_id: selectedStockProductId });
                    }
                    
                    const prodId = completedOrder.product_id || selectedStockProductId;
                    const { adjustFinishedStock } = await import('../services/api');
                    await adjustFinishedStock({
                      product_id: prodId,
                      stock_type: 'producao',
                      movement_type: 'entrada',
                      quantity_grade: completedOrder.size_grade || {},
                      description: `Entrada automática via conclusão da OP #${completedOrder.order_number}`,
                      reference_op_id: completedOrder.id
                    });

                    addToast("Lote lançado com sucesso no Estoque Comercial!", "success");
                    setIsCelebrationOpen(false);
                    setCompletedOrder(null);
                  } catch (error) {
                    console.error("Auto-intake failed", error);
                    addToast("Erro ao dar entrada automática das peças.", "error");
                  } finally {
                    setIsSubmittingIntake(false);
                  }
                }}
                className="w-full btn-primary justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSubmittingIntake ? 'Lançando estoque acabados...' : '📥 Confirmar Entrada no Estoque'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCelebrationOpen(false);
                  setCompletedOrder(null);
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-dark-border text-dark-dim hover:text-white"
              >
                Apenas Fechar (Descartar Entrada)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionOrders;
