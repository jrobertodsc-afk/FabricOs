import React, { useEffect, useState } from 'react';
import { Package, Plus, DotsThreeVertical, Calendar, User, ArrowRight } from '@phosphor-icons/react';
import { getProductionOrders, updateProductionOrder, getPartners, createProductionOrder, scanProductionOrder, getProducts, getProductionStages } from '../services/api';
import type { ProductionOrder, Partner, Product } from '../services/api';
import OPLabel from '../components/OPLabel';
import QRScanner from '../components/QRScanner';
import { QrCode, Scan } from '@phosphor-icons/react';

const STAGES = ["Corte", "Costura", "Acabamento", "Finalizado"];

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

  const loadData = async () => {
    try {
      const [ordersData, partnersData, productsData, stagesData] = await Promise.all([
        getProductionOrders(),
        getPartners(),
        getProducts(),
        getProductionStages()
      ]);
      setOrders(ordersData);
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
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];
      try {
        await updateProductionOrder(id, { current_stage: nextStage });
        loadData();
      } catch (error) {
        alert("Erro ao atualizar estágio");
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProductionOrder({
        ...newOrder,
        partner_id: newOrder.partner_id || null,
        product_id: newOrder.product_id || null
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
      loadData();
    } catch (error) {
      alert("Erro ao criar OP");
    }
  };

  const handleScan = async (orderNumber: string) => {
    try {
      await scanProductionOrder(orderNumber);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao processar scan");
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
                          className="p-1 text-dark-dim hover:text-primary transition-colors"
                          title="Imprimir Etiqueta"
                        >
                          <QrCode size={18} />
                        </button>
                        <button className="text-dark-dim hover:text-white"><DotsThreeVertical size={20} /></button>
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
                    type="number" required
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newOrder.total_quantity}
                    onChange={e => setNewOrder({...newOrder, total_quantity: parseInt(e.target.value)})}
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
                          setNewOrder({
                            ...newOrder,
                            size_grade: { ...newOrder.size_grade, [size]: val }
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
    </div>
  );
};

export default ProductionOrders;
