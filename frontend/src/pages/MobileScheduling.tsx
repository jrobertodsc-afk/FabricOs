import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapTrifold, 
  Storefront, 
  User, 
  Barcode, 
  Calendar,
  Plus, 
  Trash,
  CheckCircle,
  QrCode,
  WarningCircle,
  Truck
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getProducts, 
  getFinishedStock, 
  createDistribution,
  getDistributions
} from '../services/api';
import type { 
  Product,
  FinishedStockItem,
  Distribution
} from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const STORES = ['Loja Jardins', 'Loja Ipanema', 'Loja Leblon', 'Loja Barra', 'Loja Showroom'];
const SIZES = ['PP', 'P', 'M', 'G', 'GG'];

export default function MobileScheduling() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferType, setTransferType] = useState<'envio' | 'transferencia'>('envio');
  const [originStore, setOriginStore] = useState('Loja Jardins');
  const [targetStore, setTargetStore] = useState('Loja Ipanema');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [nfNumber, setNfNumber] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [sizeGrade, setSizeGrade] = useState<Record<string, number>>({
    'PP': 0, 'P': 0, 'M': 0, 'G': 0, 'GG': 0
  });

  const [stockItem, setStockItem] = useState<FinishedStockItem | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledRoutes, setScheduledRoutes] = useState<Distribution[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  
  // Last created distribution details to show QR code
  const [lastCreatedDist, setLastCreatedDist] = useState<Distribution | null>(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load products list and scheduled routes
  const loadInitialData = async () => {
    try {
      const prods = await getProducts();
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err: any) {
      addToast('Erro ao carregar produtos', 'error');
    }

    loadRoutes();
  };

  const loadRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const data = await getDistributions();
      // Show only scheduled routes (Fase 7)
      setScheduledRoutes(data.filter(d => d.is_scheduled === true));
    } catch (err: any) {
      addToast('Erro ao carregar programações', 'error');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load finished stock balance dynamically to check availability
  useEffect(() => {
    if (!selectedProductId) return;

    const loadStockBalance = async () => {
      setIsLoadingStock(true);
      try {
        const type = transferType === 'transferencia' ? `loja:${originStore}` : 'producao';
        const stocks = await getFinishedStock(type as any, selectedProductId);
        if (stocks.length > 0) {
          setStockItem(stocks[0]);
        } else {
          setStockItem(null);
        }
      } catch (err: any) {
        setStockItem(null);
      } finally {
        setIsLoadingStock(false);
      }
    };

    loadStockBalance();
  }, [selectedProductId, transferType, originStore]);

  const handleSizeQtyChange = (size: string, qty: number) => {
    setSizeGrade(prev => ({
      ...prev,
      [size]: Math.max(0, qty)
    }));
  };

  const handleSaveRoute = async () => {
    if (!selectedProductId) {
      addToast('Selecione um produto!', 'error');
      return;
    }
    if (!assignedDriver.trim()) {
      addToast('Informe o nome do motorista credenciado!', 'error');
      return;
    }
    if (!nfNumber.trim()) {
      addToast('Informe o número da NF-e para transporte!', 'error');
      return;
    }

    const totalQty = Object.values(sizeGrade).reduce((sum, q) => sum + q, 0);
    if (totalQty <= 0) {
      addToast('Informe a quantidade de peças da grade!', 'error');
      return;
    }

    // Verify stock availability
    if (stockItem) {
      for (const [size, qty] of Object.entries(sizeGrade)) {
        const available = stockItem.size_grade[size] || 0;
        if (qty > available) {
          addToast(`Quantidade insuficiente para o tamanho ${size}! Disponível: ${available}`, 'error');
          return;
        }
      }
    } else {
      addToast('Sem saldo de estoque disponível na origem selecionada!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        product_id: selectedProductId,
        store_name: targetStore,
        size_grade: sizeGrade,
        total_quantity: totalQty,
        status: 'pendente',
        transfer_type: transferType,
        origin_store: transferType === 'transferencia' ? originStore : 'producao',
        assigned_driver: assignedDriver,
        nf_number: nfNumber,
        is_scheduled: true,
        scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString()
      };

      const newDist = await createDistribution(payload as any);
      setLastCreatedDist(newDist);
      addToast('Rota Programada com Sucesso!', 'success');
      
      // Reset form
      setSizeGrade({ 'PP': 0, 'P': 0, 'M': 0, 'G': 0, 'GG': 0 });
      setAssignedDriver('');
      setNfNumber('');
      setScheduledDate('');
      
      // Reload routes list
      await loadRoutes();
    } catch (err: any) {
      addToast('Erro ao programar rota: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white pb-10">
      {/* Header */}
      <header className="bg-[#12141C] border-b border-dark-border/40 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-lg bg-dark-border/30 border border-dark-border/50 text-dark-dim hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-outfit font-bold text-base leading-tight">Programação de Rotas</h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Logística e Transferências</p>
        </div>
      </header>

      <main className="px-4 py-5 space-y-6">
        
        {/* QR Code Modal / Card for Last Created Volume */}
        {lastCreatedDist && (
          <div className="bg-gradient-to-br from-indigo-950/40 to-teal-950/20 border border-teal-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-teal-400">
              <CheckCircle size={22} weight="fill" />
              <h3 className="font-outfit font-bold text-sm">Volume Criado & Agendado!</h3>
            </div>
            
            <div className="bg-[#12141C]/80 border border-dark-border/40 rounded-xl p-4 flex flex-col items-center text-center space-y-4">
              <p className="text-xs text-dark-dim">Cole esta Guia no volume físico para conferência em trânsito</p>
              
              {/* Dynamic QR Code */}
              <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/40">
                <QRCodeSVG 
                  value={lastCreatedDist.id} 
                  size={150} 
                  level="Q"
                  includeMargin={false}
                />
              </div>
              
              <div className="space-y-1.5 w-full">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded">
                  NF-e: {lastCreatedDist.nf_number}
                </span>
                <h4 className="text-sm font-bold text-white mt-1">{lastCreatedDist.product?.name || 'Volume Acabado'}</h4>
                <p className="text-[10px] text-dark-dim">ID: {lastCreatedDist.id}</p>
                <div className="grid grid-cols-2 gap-2 text-left pt-2.5 border-t border-dark-border/20 text-xs">
                  <div>
                    <span className="text-dark-dim text-[10px] block">Origem</span>
                    <span className="font-semibold text-white">{lastCreatedDist.transfer_type === 'transferencia' ? lastCreatedDist.origin_store : 'Fábrica (Expedição)'}</span>
                  </div>
                  <div>
                    <span className="text-dark-dim text-[10px] block">Destino</span>
                    <span className="font-semibold text-white">{lastCreatedDist.store_name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-dark-dim text-[10px] block">Motorista Autorizado</span>
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Truck size={14} className="text-teal-400" />
                      {lastCreatedDist.assigned_driver}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setLastCreatedDist(null)}
              className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              OK, Criar Nova Programação
            </button>
          </div>
        )}

        {/* Scheduling Form */}
        <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="font-outfit font-bold text-base flex items-center gap-2 border-b border-dark-border/30 pb-3">
            <MapTrifold size={20} className="text-indigo-400" />
            Nova Guia de Transporte
          </h2>

          <div className="space-y-4">
            {/* Operation Type Switch */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Tipo de Rota</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferType('envio')}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                    transferType === 'envio'
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                      : 'bg-dark-bg border-dark-border/40 text-dark-dim'
                  }`}
                >
                  <Truck className="inline mr-1.5" size={16} />
                  Envio Fábrica ➔ Loja
                </button>
                <button
                  type="button"
                  onClick={() => setTransferType('transferencia')}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                    transferType === 'transferencia'
                      ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                      : 'bg-dark-bg border-dark-border/40 text-dark-dim'
                  }`}
                >
                  <Storefront className="inline mr-1.5" size={16} />
                  Transferência Loja ➔ Loja
                </button>
              </div>
            </div>

            {/* Origin Dropdown (Only for Transferencia) */}
            {transferType === 'transferencia' && (
              <div className="space-y-1.5">
                <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Loja de Origem</label>
                <select
                  value={originStore}
                  onChange={(e) => setOriginStore(e.target.value)}
                  className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 text-sm text-white font-medium focus:border-teal-500 outline-none"
                >
                  {STORES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Destination Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Loja de Destino</label>
              <select
                value={targetStore}
                onChange={(e) => setTargetStore(e.target.value)}
                className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 text-sm text-white font-medium focus:border-indigo-500 outline-none"
              >
                {STORES.filter(st => transferType === 'envio' || st !== originStore).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Product Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Produto Referência</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 text-sm text-white font-medium focus:border-indigo-500 outline-none"
              >
                {products.map(prod => (
                  <option key={prod.id} value={prod.id}>{prod.name} ({prod.reference})</option>
                ))}
              </select>
            </div>

            {/* Active Stock Balance Warning */}
            {isLoadingStock ? (
              <div className="text-xs text-dark-dim animate-pulse">Consultando estoque disponível...</div>
            ) : stockItem ? (
              <div className="bg-[#12141C] border border-dark-border/30 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[10px] text-dark-dim font-bold uppercase">Saldo Disponível na Origem:</span>
                <div className="flex gap-3 overflow-x-auto scrollbar-none py-1">
                  {Object.entries(stockItem.size_grade || {}).map(([sz, qty]) => (
                    <div key={sz} className="text-center min-w-8 bg-[#1A1C26] p-1.5 rounded border border-dark-border/20">
                      <p className="text-[10px] text-indigo-400 font-bold">{sz}</p>
                      <p className="text-xs font-bold text-white">{qty}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-xs flex items-center gap-2">
                <WarningCircle size={18} />
                <span>Nenhum estoque disponível para este produto na origem selecionada!</span>
              </div>
            )}

            {/* Grade Input Form */}
            <div className="space-y-2">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Grade Faturada para Envio</label>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map(size => {
                  const available = stockItem?.size_grade[size] || 0;
                  return (
                    <div key={size} className="bg-dark-bg border border-dark-border/40 rounded-xl p-2 text-center flex flex-col items-center">
                      <span className="text-[10px] font-black text-indigo-300 block">{size}</span>
                      <input 
                        type="number"
                        min="0"
                        value={sizeGrade[size]}
                        onChange={(e) => handleSizeQtyChange(size, parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-transparent font-bold text-sm text-white focus:outline-none border-b border-dark-border/30 focus:border-indigo-500 py-1"
                        placeholder="0"
                      />
                      <span className="text-[9px] text-dark-dim/60 block mt-1">Disp: {available}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motorista */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Nome do Motorista / Motoboy Autorizado</label>
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-dark-dim">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={assignedDriver}
                  onChange={(e) => setAssignedDriver(e.target.value)}
                  placeholder="Nome Completo do Condutor"
                  className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 pl-10 text-sm text-white font-medium focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* NF-e */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Nota Fiscal Eletrônica (NF-e)</label>
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-dark-dim">
                  <Barcode size={18} />
                </div>
                <input
                  type="text"
                  value={nfNumber}
                  onChange={(e) => setNfNumber(e.target.value)}
                  placeholder="Ex: 000.124.590-SP"
                  className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 pl-10 text-sm text-white font-medium focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Data Agendada */}
            <div className="space-y-1.5">
              <label className="text-xs text-dark-dim font-bold uppercase tracking-wider">Data e Hora Programada</label>
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-dark-dim">
                  <Calendar size={18} />
                </div>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-[#1A1C26] border border-dark-border/50 rounded-xl p-3.5 pl-10 text-sm text-white font-medium focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveRoute}
              disabled={isSubmitting || !stockItem}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-bold text-sm py-4 rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              <Plus size={18} weight="bold" />
              {isSubmitting ? 'Programando Rota...' : 'Agendar Rota & Gerar QR Code'}
            </button>

          </div>
        </div>

        {/* List of Active Scheduled Routes */}
        <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl">
          <h3 className="font-outfit font-bold text-base mb-4 flex items-center gap-2">
            <Truck size={20} className="text-teal-400" />
            Minhas Programações de Rota ({scheduledRoutes.length})
          </h3>

          {isLoadingRoutes ? (
            <div className="text-center py-6 text-dark-dim animate-pulse">Carregando agendamentos...</div>
          ) : scheduledRoutes.length === 0 ? (
            <div className="text-center py-8 text-dark-dim text-sm">
              Nenhuma rota agendada no momento.
            </div>
          ) : (
            <div className="space-y-3.5">
              {scheduledRoutes.map(route => (
                <div 
                  key={route.id}
                  onClick={() => setLastCreatedDist(route)}
                  className="bg-[#1A1C26] border border-dark-border/30 rounded-xl p-4 flex flex-col gap-3 hover:border-teal-500/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        route.transfer_type === 'transferencia' ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {route.transfer_type === 'transferencia' ? 'Transferência' : 'Envio Fábrica'}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-2">{route.product?.name || 'Grade Faturada'}</h4>
                      <p className="text-xs text-dark-dim mt-0.5">NF-e: {route.nf_number}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        route.status === 'pendente' 
                          ? 'bg-amber-500/10 text-amber-400'
                          : route.status === 'em_transito'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {route.status.toUpperCase()}
                      </span>
                      <p className="text-xs font-black text-white mt-2">{route.total_quantity} pçs</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t border-dark-border/20">
                    <div>
                      <span className="text-dark-dim text-[9px] block">Origem / Destino</span>
                      <span className="text-white font-medium">
                        {route.transfer_type === 'transferencia' ? route.origin_store : 'Fábrica'} ➔ {route.store_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-dark-dim text-[9px] block">Motorista</span>
                      <span className="text-white font-medium">{route.assigned_driver}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-teal-400 font-bold bg-teal-500/5 py-1.5 rounded">
                    <QrCode size={14} />
                    Ver QR Code e Ficha Digital
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
