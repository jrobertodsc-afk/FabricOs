import React, { useEffect, useState } from 'react';
import { Package, Plus, DotsThreeVertical, Calendar, User, ArrowRight, Trash, ListDashes, SquaresFour, Scissors } from '@phosphor-icons/react';
import { getProductionOrders, updateProductionOrder, deleteProductionOrder, getPartners, createProductionOrder, scanProductionOrder, getProducts, getProductionStages } from '../services/api';
import type { ProductionOrder, Partner, Product, ProductionStage } from '../services/api';
import OPLabel from '../components/OPLabel';
import QRScanner from '../components/QRScanner';
import ConfirmDialog from '../components/ConfirmDialog';
import QualityModal from '../components/QualityModal';
import { useToast } from '../contexts/ToastContext';
import { QrCode, Scan, WarningCircle } from '@phosphor-icons/react';
import { registerQualityRecord } from '../services/api';
import type { QualityRecordPayload } from '../services/api';



const ProductionOrders: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [activeMacro, setActiveMacro] = useState<string>('Produção');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_number: '',
    item_name: '', // Alterado para iniciar vazio (Família)
    total_quantity: 0,
    price_per_piece: 0,
    partner_id: '',
    product_id: '',
    due_date: '',
    collection: '',
    nf_number: '',
    size_grade: {} as Record<string, number>,
    observations: '',
    fabric_description: '',
    risk_release_date: '',
    photo_url: '',
    shipping_date: '',
    launch_date: '',
    items: [] as any[],
    fabric_quantity_mts: 0,
    interfacing_quantity_mts: 0,
    lining_quantity_mts: 0,
    cutting_start: '',
    cutting_end: '',
    gluing_start: '',
    gluing_end: '',
    cut_separator_name: '',
    batidas_count: 0,
    trims: '',
    modeling_notes: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Phase 4 States
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);

  const [viewMode, setViewMode] = useState<'fila' | 'kanban' | 'collections'>('fila');

  // Celebration & Stock Intake States
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ProductionOrder | null>(null);
  const [selectedStockProductId, setSelectedStockProductId] = useState('');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Quality Control State
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [selectedOrderForQuality, setSelectedOrderForQuality] = useState<ProductionOrder | null>(null);

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
      setStages(stagesData.length > 0 ? stagesData : [
        {id: '1', name: 'Corte', macro_stage: 'Produção', order: 1}, 
        {id: '2', name: 'Costura', macro_stage: 'Produção', order: 2}, 
        {id: '3', name: 'Acabamento', macro_stage: 'Produção', order: 3}, 
        {id: '4', name: 'Finalizado', macro_stage: 'Produção', order: 4}
      ]);
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
    const currentIndex = stages.findIndex(s => s.name === currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1].name;
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

  const handleReleaseToProduction = async (id: string) => {
    try {
      await updateProductionOrder(id, { status: 'em_producao', current_stage: stages[0]?.name || 'Corte' });
      addToast("OP liberada para produção", "success");
      loadData();
    } catch (error) {
      addToast("Erro ao liberar OP", "error");
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalPhotoUrl = newOrder.photo_url;
      if (photoFile) {
        const { uploadImage } = await import('../services/api');
        const res = await uploadImage(photoFile);
        finalPhotoUrl = res.url;
      }

      const payload: any = {
        ...newOrder,
        photo_url: finalPhotoUrl,
        partner_id: newOrder.partner_id || undefined,
        product_id: newOrder.product_id || undefined
      };

      // Limpar campos de data vazios para evitar erro 422 no backend (espera datetime ou null)
      const dateFields = ['due_date', 'risk_release_date', 'shipping_date', 'launch_date', 'cutting_start', 'cutting_end', 'gluing_start', 'gluing_end', 'nf_date'];
      dateFields.forEach(field => {
        if (!payload[field]) {
          delete payload[field];
        }
      });

      await createProductionOrder(payload);
      setIsModalOpen(false);
      setNewOrder({ 
        order_number: '', 
        item_name: '', 
        total_quantity: 0, 
        price_per_piece: 0,
        partner_id: '', 
        product_id: '',
        due_date: '',
        collection: '',
        nf_number: '',
        size_grade: {},
        observations: '',
        fabric_description: '',
        risk_release_date: '',
        photo_url: '',
        shipping_date: '',
        launch_date: '',
        trims: '',
        modeling_notes: '',
        items: [],
        fabric_quantity_mts: 0,
        interfacing_quantity_mts: 0,
        lining_quantity_mts: 0,
        cutting_start: '',
        cutting_end: '',
        gluing_start: '',
        gluing_end: '',
        cut_separator_name: '',
        batidas_count: 0
      });
      setPhotoFile(null);
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

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { name: '', color: '', difficulty: 'M', sizes: { PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0 }, total: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...newOrder.items];
    newItems.splice(index, 1);
    recalculateTotal(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...newOrder.items];
    newItems[index][field] = value;
    setNewOrder({ ...newOrder, items: newItems });
  };

  const handleSizeChange = (index: number, size: string, value: number) => {
    const newItems = [...newOrder.items];
    newItems[index].sizes[size] = value;
    newItems[index].total = Object.values(newItems[index].sizes).reduce((a: any, b: any) => a + b, 0);
    recalculateTotal(newItems);
  };

  const recalculateTotal = (newItems: any[]) => {
    const newTotal = newItems.reduce((acc, curr) => acc + curr.total, 0);
    // Agregando o size_grade geral baseado nos itens
    const aggregatedGrade: Record<string, number> = { PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0 };
    newItems.forEach(item => {
      Object.entries(item.sizes).forEach(([s, q]) => {
        aggregatedGrade[s] += (q as number) || 0;
      });
    });
    setNewOrder({ ...newOrder, items: newItems, total_quantity: newTotal, size_grade: aggregatedGrade });
  };

  const openLabel = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsLabelOpen(true);
  };

  const handleQualitySubmit = async (data: QualityRecordPayload) => {
    if (!selectedOrderForQuality) return;
    try {
      await registerQualityRecord(selectedOrderForQuality.id, data);
      addToast("Defeito registrado com sucesso!", "success");
      setIsQualityModalOpen(false);
      setSelectedOrderForQuality(null);
    } catch (error) {
      console.error(error);
      addToast("Erro ao registrar qualidade", "error");
    }
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Ordens de Produção (OP)</h1>
          <p className="text-dark-dim">Acompanhe o fluxo de produção em tempo real</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-dark-bg/50 border border-dark-border rounded-xl flex items-center p-1">
            <button 
              onClick={() => setViewMode('fila')}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'fila' ? 'bg-primary/20 text-primary font-bold' : 'text-dark-dim hover:text-white'}`}
              title="Fila de Espera"
            >
              Fila
            </button>
            <div className="w-[1px] h-4 bg-dark-border mx-1"></div>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-primary/20 text-primary font-bold' : 'text-dark-dim hover:text-white'}`}
              title="Kanban (Produção)"
            >
              <SquaresFour size={20} weight={viewMode === 'kanban' ? 'bold' : 'regular'} />
              Kanban
            </button>
            <button 
              onClick={() => setViewMode('collections')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'collections' ? 'bg-primary/20 text-primary' : 'text-dark-dim hover:text-white'}`}
              title="Lista (Por Coleção)"
            >
              <ListDashes size={20} weight={viewMode === 'collections' ? 'bold' : 'regular'} />
            </button>
          </div>
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
      ) : viewMode === 'fila' ? (
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.filter(o => o.status === 'na_fila').length === 0 ? (
              <div className="col-span-full py-10 text-center border border-dashed border-dark-border rounded-2xl text-dark-dim">
                <p>Nenhuma OP na fila de espera no momento.</p>
              </div>
            ) : (
              orders.filter(o => o.status === 'na_fila').map(order => (
                <div key={order.id} className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-lg text-white">#{order.order_number}</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-dark-bg border border-dark-border rounded text-dark-dim uppercase tracking-wider">
                      Na Fila
                    </span>
                  </div>
                  <h4 className="font-bold mb-2">{order.item_name}</h4>
                  <div className="space-y-1 text-sm text-dark-dim mb-4">
                    <p>Coleção: <span className="text-white/80">{order.collection || 'N/I'}</span></p>
                    <p>Qtd Total: <span className="text-white/80">{order.total_quantity}</span></p>
                    <p>Tecido: <span className="text-white/80">{order.fabric_description || 'N/I'}</span></p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button 
                      onClick={() => handleReleaseToProduction(order.id)} 
                      className="flex-1 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
                    >
                      Liberar para Produção
                    </button>
                    <button 
                      onClick={() => openLabel(order)} 
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Ver Ficha"
                    >
                      <ListDashes size={18} className="text-dark-dim hover:text-white" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : viewMode === 'collections' ? (
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
          {Object.entries(
            orders.reduce((acc: any, o) => {
              const colName = o.collection || o.item_name || 'Diversos';
              if (!acc[colName]) acc[colName] = { total_qty: 0, total_cost: 0, ops: [] };
              acc[colName].ops.push(o);
              acc[colName].total_qty += o.total_quantity || 0;
              acc[colName].total_cost += (o.price_per_piece || 0) * (o.total_quantity || 0);
              return acc;
            }, {})
          ).map(([colName, data]: [string, any]) => (
            <div key={colName} className="bg-dark-card border border-dark-border rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-dark-border/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package size={24} className="text-primary" />
                  {colName}
                </h2>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-dark-dim text-xs">Total de Peças</p>
                    <p className="font-bold">{data.total_qty} un</p>
                  </div>
                  <div className="text-right">
                    <p className="text-dark-dim text-xs">Custo Total Previsto</p>
                    <p className="font-bold text-success">R$ {data.total_cost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.ops.map((order: any) => (
                  <div key={order.id} className="bg-dark-bg p-4 rounded-xl border border-dark-border/50 hover:border-primary/50 transition-colors flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-primary">#{order.order_number}</span>
                      <span className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded text-white">{order.current_stage}</span>
                    </div>
                    <h4 className="font-bold mb-1 truncate">{order.item_name}</h4>
                    <p className="text-xs text-dark-dim mb-3">Qtd: {order.total_quantity} • R$ {order.price_per_piece}/pc</p>
                    <div className="mt-auto flex gap-2">
                      <button onClick={() => openLabel(order)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">
                        Ficha
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex gap-2 mb-6 border-b border-dark-border/50 pb-0 overflow-x-auto">
            {Array.from(new Set(stages.map(s => s.macro_stage))).map(macro => (
              <button
                key={macro}
                onClick={() => setActiveMacro(macro)}
                className={`px-4 py-2 font-bold transition-all whitespace-nowrap border-b-2 ${
                  activeMacro === macro 
                    ? 'text-primary border-primary bg-primary/5' 
                    : 'text-dark-dim border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {macro}
              </button>
            ))}
          </div>

          <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {stages.filter(s => s.macro_stage === activeMacro).map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.name === 'Loja' ? 'bg-success' : 'bg-primary'}`}></div>
                  <h3 className="font-bold font-outfit uppercase tracking-widest text-xs">{stage.name}</h3>
                </div>
                <span className="bg-white/5 text-dark-dim px-2 py-0.5 rounded text-[10px] font-bold">
                  {orders.filter(o => o.current_stage === stage.name && o.status !== 'na_fila').length}
                </span>
              </div>
              
              <div className="flex-1 space-y-4 min-h-[200px]">
                {orders.filter(o => o.current_stage === stage.name && o.status !== 'na_fila').map(order => {
                  const isCorte = stage.macro_stage === 'Corte';
                  const isCuttingNow = isCorte && !!order.cutting_start;
                
                return (
                <div key={order.id} className={`bg-dark-card border rounded-2xl p-4 transition-all group flex flex-col ${isCuttingNow ? 'border-emerald-500/30 hover:border-emerald-500' : 'border-dark-border hover:border-primary/50'}`}>
                    {order.product?.image_url && (
                      <div className="w-full h-24 rounded-lg overflow-hidden mb-3 border border-dark-border/40 bg-dark-bg relative">
                        <img 
                          src={order.product.image_url} 
                          alt={order.item_name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-black text-lg text-white group-hover:text-primary transition-colors">
                        {(activeMacro === 'Estilo' || activeMacro === 'Desenvolvimento') ? 'Demanda' : `#${order.order_number}`}
                      </span>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${
                          isCorte ? (isCuttingNow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-warning/20 text-warning') 
                                  : 'bg-primary/20 text-primary'
                        }`}>
                          {isCorte ? (isCuttingNow ? 'Em Corte' : 'Aguardando') : stage.name}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openLabel(order); }}
                            className="p-1 text-dark-dim hover:text-primary bg-white/5 rounded" 
                            title="Imprimir Etiqueta"
                          >
                            <QrCode size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedOrderForQuality(order); setIsQualityModalOpen(true); }}
                            className="p-1 text-dark-dim hover:text-warning bg-white/5 rounded" 
                            title="Controle de Qualidade"
                          >
                            <WarningCircle size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); setIsDeleteOpen(true); }}
                            className="p-1 text-dark-dim hover:text-danger bg-white/5 rounded" 
                            title="Cancelar OP"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-sm mb-3">{order.item_name}</h3>
                    
                    <div className="text-xs text-dark-dim mb-4 space-y-1">
                      {order.collection && <p><span className="text-white/40">Família:</span> {order.collection}</p>}
                      {order.fabric_description && <p><span className="text-white/40">Tecido:</span> {order.fabric_description}</p>}
                      {order.fabric_quantity_mts != null && <p><span className="text-white/40">Metragem:</span> {order.fabric_quantity_mts} m</p>}
                      {order.nf_number && <p><span className="text-white/40">NF:</span> <span className="text-success">{order.nf_number}</span></p>}
                      
                      {isCorte ? (
                        isCuttingNow && order.cut_separator_name && (
                          <p><span className="text-emerald-400/60">Cortador:</span> <span className="text-emerald-400 font-bold">{order.cut_separator_name}</span></p>
                        )
                      ) : (
                        <p><span className="text-white/40">Faccionista:</span> <span className="text-white font-bold">{partners.find(p => p.id === order.partner_id)?.name || 'Sem parceiro'}</span></p>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-dark-border/50 w-full flex justify-between items-center text-[10px] font-bold text-white/50">
                      <span>Qtd Total: {order.total_quantity}</span>
                      {stage.name !== "Loja" && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStage(order.id, stage.name);
                          }}
                          className={`group-hover:translate-x-1 transition-transform flex items-center gap-1 ${
                            isCuttingNow ? 'text-emerald-400' : 'text-primary'
                          }`}
                        >
                          Avançar <ArrowRight size={12} weight="bold" />
                        </button>
                      )}
                    </div>
                </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
        </div>
      )}

      {/* Modal Nova OP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-2xl p-6 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
            <h2 className="text-xl font-bold mb-6">Lançar Nova OP</h2>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Seção 1: Cabeçalho */}
              <div className="bg-dark-bg/30 p-4 rounded-xl border border-dark-border/40 space-y-4">
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Package size={16} /> Identificação e Tecido
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Código do Tecido</label>
                    <input 
                      type="text" required placeholder="Ex: Tecido-001"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.order_number}
                      onChange={e => setNewOrder({...newOrder, order_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Família / Modelo</label>
                    <input 
                      type="text" placeholder="Ex: Camisetas" required
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm mb-2"
                      value={newOrder.item_name}
                      onChange={e => setNewOrder({...newOrder, item_name: e.target.value})}
                    />
                    <select
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm text-dark-dim"
                      value={newOrder.product_id || ''}
                      onChange={(e) => {
                        const prodId = e.target.value;
                        if (!prodId) {
                           setNewOrder({...newOrder, product_id: ''});
                           return;
                        }
                        const selectedProd = products.find(p => p.id === prodId);
                        if (selectedProd) {
                           setNewOrder({
                             ...newOrder, 
                             product_id: prodId,
                             item_name: selectedProd.name,
                             price_per_piece: selectedProd.base_price || 0,
                             photo_url: selectedProd.image_url || newOrder.photo_url,
                             trims: selectedProd.trims || newOrder.trims,
                             modeling_notes: selectedProd.modeling_notes || newOrder.modeling_notes
                           });
                        }
                      }}
                    >
                      <option value="">(Opcional) Vincular a Produto Trello/Catálogo...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.reference ? `(${p.reference})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block text-success">Custo por Peça (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" placeholder="Ex: 15.50"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-success outline-none text-sm font-bold text-success"
                      value={newOrder.price_per_piece || ''}
                      onChange={e => setNewOrder({...newOrder, price_per_piece: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Mês e Ano (Opcional)</label>
                    <input 
                      type="text" placeholder="Ex: 05/2026"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.collection}
                      onChange={e => setNewOrder({...newOrder, collection: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-dim mb-1">Nome da Faccionista</label>
                    <input 
                      type="text" 
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.nf_number}
                      onChange={e => setNewOrder({...newOrder, nf_number: e.target.value})}
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Data de Liberação do Risco</label>
                    <input 
                      type="date"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.risk_release_date}
                      onChange={e => setNewOrder({...newOrder, risk_release_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Foto do Modelo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setPhotoFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm text-dark-dim file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Data de Envio</label>
                    <input 
                      type="date"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.shipping_date}
                      onChange={e => setNewOrder({...newOrder, shipping_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Data de Lançamento</label>
                    <input 
                      type="date"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.launch_date}
                      onChange={e => setNewOrder({...newOrder, launch_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Descrição do Tecido / Composição</label>
                  <input 
                    type="text" placeholder="Ex: 100% Algodão, Gramatura 180g"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newOrder.fabric_description}
                    onChange={e => setNewOrder({...newOrder, fabric_description: e.target.value})}
                  />
                </div>
              </div>

              {/* Seção 2: Tabela de Modelos (Dinâmica) */}
              <div className="bg-dark-bg/30 p-4 rounded-xl border border-dark-border/40 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <DotsThreeVertical size={16} /> Modelos na Grade
                  </h3>
                  <button type="button" onClick={handleAddItem} className="text-xs font-bold bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 flex items-center gap-1">
                    <Plus size={14} /> Adicionar Modelo
                  </button>
                </div>
                
                {newOrder.items.length === 0 ? (
                  <p className="text-xs text-dark-dim text-center py-4">Nenhum modelo adicionado. Clique no botão acima para começar.</p>
                ) : (
                  <div className="space-y-4">
                    {newOrder.items.map((item, index) => (
                      <div key={index} className="p-3 border border-dark-border rounded-xl bg-dark-card/50 space-y-3 relative">
                        <button type="button" onClick={() => handleRemoveItem(index)} className="absolute top-2 right-2 text-dark-dim hover:text-danger">
                          <Trash size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-3 pr-6">
                          <div>
                            <label className="text-[10px] text-dark-dim mb-1 block">Nome do Modelo</label>
                            <input 
                              type="text" required placeholder="Ex: Blusa Anair"
                              className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-sm outline-none focus:border-primary"
                              value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-dark-dim mb-1 block">Cor da Variante</label>
                            <input 
                              type="text" placeholder="Ex: Preto"
                              className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-sm outline-none focus:border-primary"
                              value={item.color} onChange={e => handleItemChange(index, 'color', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-dim mb-2 block">Grade de Tamanhos (Qtd)</label>
                          <div className="flex gap-2">
                            {['PP', 'P', 'M', 'G', 'GG', 'U'].map(size => (
                              <div key={size} className="flex-1 text-center">
                                <span className="text-[9px] font-bold text-dark-dim">{size}</span>
                                <input 
                                  type="number" min="0" placeholder="0"
                                  className="w-full bg-dark-bg border border-dark-border rounded p-1 text-center text-xs outline-none focus:border-primary"
                                  value={item.sizes[size] || ''} onChange={e => handleSizeChange(index, size, parseInt(e.target.value) || 0)}
                                />
                              </div>
                            ))}
                            <div className="flex-1 text-center bg-primary/5 rounded border border-primary/20">
                              <span className="text-[9px] font-bold text-primary">Total</span>
                              <div className="text-sm font-bold mt-1 text-white">{item.total}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-dark-border/40 pt-3 mt-2">
                  <span className="text-sm text-dark-dim">Quantidade Total OP:</span>
                  <span className="text-xl font-bold text-primary">{newOrder.total_quantity} <span className="text-xs font-normal text-dark-dim">peças</span></span>
                </div>
              </div>

              {/* Seção 3: Rodapé e Metragens do Corte */}
              <div className="bg-dark-bg/30 p-4 rounded-xl border border-dark-border/40 space-y-4">
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Package size={16} /> Metragens e Tempos de Corte
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Metragem Tecido (mts)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.fabric_quantity_mts || ''} onChange={e => setNewOrder({...newOrder, fabric_quantity_mts: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Metragem Entretela (mts)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.interfacing_quantity_mts || ''} onChange={e => setNewOrder({...newOrder, interfacing_quantity_mts: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Metragem Forro (mts)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.lining_quantity_mts || ''} onChange={e => setNewOrder({...newOrder, lining_quantity_mts: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-dark-dim mb-1 block uppercase font-bold">Início e Fim do Corte</label>
                    <div className="flex gap-2">
                      <input type="date" className="w-1/2 bg-dark-bg border border-dark-border rounded-lg p-2 text-xs" title="Início" value={newOrder.cutting_start} onChange={e => setNewOrder({...newOrder, cutting_start: e.target.value})} />
                      <input type="date" className="w-1/2 bg-dark-bg border border-dark-border rounded-lg p-2 text-xs" title="Fim" value={newOrder.cutting_end} onChange={e => setNewOrder({...newOrder, cutting_end: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-dark-dim mb-1 block uppercase font-bold">Início e Fim da Colagem</label>
                    <div className="flex gap-2">
                      <input type="date" className="w-1/2 bg-dark-bg border border-dark-border rounded-lg p-2 text-xs" title="Início" value={newOrder.gluing_start} onChange={e => setNewOrder({...newOrder, gluing_start: e.target.value})} />
                      <input type="date" className="w-1/2 bg-dark-bg border border-dark-border rounded-lg p-2 text-xs" title="Fim" value={newOrder.gluing_end} onChange={e => setNewOrder({...newOrder, gluing_end: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Responsável pelo Corte/Separação</label>
                    <input 
                      type="text" placeholder="Nome do cortador/separador"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm"
                      value={newOrder.cut_separator_name} onChange={e => setNewOrder({...newOrder, cut_separator_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-dim mb-1 block">Quantidade de Batidas</label>
                    <input 
                      type="number" placeholder="Ex: 2"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                      value={newOrder.batidas_count || ''} onChange={e => setNewOrder({...newOrder, batidas_count: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="bg-dark-bg/30 p-4 rounded-xl border border-dark-border/40 space-y-4">
                <div className="flex flex-col">
                  <label className="text-xs text-dark-dim mb-1 font-semibold">Observações Gerais</label>
                  <textarea 
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm min-h-[80px]"
                    placeholder="Adicione observações para a equipe"
                    value={newOrder.observations || ''}
                    onChange={e => setNewOrder({...newOrder, observations: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-dark-dim mb-1 font-semibold text-blue-400">Aviamentos (Trello)</label>
                    <textarea 
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-blue-400 outline-none text-sm min-h-[80px]"
                      placeholder="Ex: 1 zíper de metal 40cm..."
                      value={newOrder.trims || ''}
                      onChange={e => setNewOrder({...newOrder, trims: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-dark-dim mb-1 font-semibold text-blue-400">Comentários da Modelagem (Trello)</label>
                    <textarea 
                      className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-blue-400 outline-none text-sm min-h-[80px]"
                      placeholder="Ex: Prova 26/01: diminuir 5cm da barra..."
                      value={newOrder.modeling_notes || ''}
                      onChange={e => setNewOrder({...newOrder, modeling_notes: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary justify-center">Gerar Ordem de Produção</button>
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
      />
      
      <QRScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />

      <QualityModal 
        isOpen={isQualityModalOpen}
        onClose={() => { setIsQualityModalOpen(false); setSelectedOrderForQuality(null); }}
        onSubmit={handleQualitySubmit}
        orderNumber={selectedOrderForQuality?.order_number || ''}
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
