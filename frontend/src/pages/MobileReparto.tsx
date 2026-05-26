import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Storefront, 
  Info, 
  Warning, 
  CheckCircle,
  Plus,
  Trash
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { 
  getProducts, 
  getFinishedStock, 
  createDistribution
} from '../services/api';
import type { 
  Product,
  FinishedStockItem
} from '../services/api';

interface StoreAllocation {
  store_name: string;
  size_grade: Record<string, number>;
}

export default function MobileReparto() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stockType, setStockType] = useState<'producao' | 'acervo'>('producao');
  const [stockItem, setStockItem] = useState<FinishedStockItem | null>(null);
  const [allocations, setAllocations] = useState<StoreAllocation[]>([
    { store_name: 'Loja Jardins', size_grade: {} },
    { store_name: 'Loja Ipanema', size_grade: {} }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load products list
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const prods = await getProducts();
        setProducts(prods);
        if (prods.length > 0) {
          setSelectedProductId(prods[0].id);
        }
      } catch (err: any) {
        addToast('Erro ao carregar produtos', 'error');
      }
    };
    loadProducts();
  }, []);

  // Load selected finished stock item details
  useEffect(() => {
    if (!selectedProductId) return;

    const loadStock = async () => {
      setIsLoading(true);
      try {
        const stocks = await getFinishedStock(stockType, selectedProductId);
        if (stocks.length > 0) {
          setStockItem(stocks[0]);
          
          // Reset Allocations size grades with sizes from stock
          const sizes = Object.keys(stocks[0].size_grade || {});
          setAllocations(prev => prev.map(alloc => {
            const grade: Record<string, number> = {};
            sizes.forEach(sz => {
              grade[sz] = 0;
            });
            return { ...alloc, size_grade: grade };
          }));
        } else {
          setStockItem(null);
          setAllocations(prev => prev.map(alloc => ({ ...alloc, size_grade: {} })));
        }
      } catch (err: any) {
        addToast('Erro ao carregar saldos de estoque', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadStock();
  }, [selectedProductId, stockType]);

  const handleAddStore = () => {
    const sizes = Object.keys(stockItem?.size_grade || {});
    const grade: Record<string, number> = {};
    sizes.forEach(sz => {
      grade[sz] = 0;
    });

    setAllocations(prev => [
      ...prev,
      { store_name: `Loja ${prev.length + 1}`, size_grade: grade }
    ]);
  };

  const handleRemoveStore = (idx: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStoreNameChange = (idx: number, name: string) => {
    setAllocations(prev => {
      const copy = [...prev];
      copy[idx].store_name = name;
      return copy;
    });
  };

  const handleSizeQtyChange = (storeIdx: number, size: string, qty: number) => {
    setAllocations(prev => {
      const copy = [...prev];
      copy[storeIdx].size_grade = {
        ...copy[storeIdx].size_grade,
        [size]: Math.max(0, qty)
      };
      return copy;
    });
  };

  // Calculate sum per size allocated across all stores
  const getAllocatedQtyForSize = (size: string) => {
    return allocations.reduce((sum, alloc) => sum + (alloc.size_grade[size] || 0), 0);
  };

  // Check if allocations exceed available stock
  const isOverAllocated = (size: string) => {
    const available = stockItem?.size_grade[size] || 0;
    const allocated = getAllocatedQtyForSize(size);
    return allocated > available;
  };

  const handleSaveDistribution = async () => {
    if (!stockItem) return;

    // Check all sizes for overallocation
    const sizes = Object.keys(stockItem.size_grade || {});
    let hasError = false;
    sizes.forEach(sz => {
      if (isOverAllocated(sz)) {
        hasError = true;
      }
    });

    if (hasError) {
      addToast('Erro: Distribuição excede a quantidade disponível em estoque!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save all store allocations
      for (const alloc of allocations) {
        // Calculate total allocated quantity for this store
        const total = Object.values(alloc.size_grade).reduce((sum, q) => sum + q, 0);
        if (total <= 0) continue;

        await createDistribution({
          product_id: stockItem.product_id,
          store_name: alloc.store_name,
          size_grade: alloc.size_grade,
          total_quantity: total,
          status: 'pendente'
        });
      }

      setSuccess(true);
      addToast('Distribuição (Reparto) salva e liberada!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar reparto: ' + (err.response?.data?.detail || err.message), 'error');
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
          <h1 className="font-outfit font-bold text-base leading-tight">Reparto por Loja</h1>
          <p className="text-[10px] text-dark-dim uppercase font-bold tracking-wider">Divisão de Estoque Acabado</p>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {!success ? (
          <>
            {/* Filters / Product selection */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4">
              <h2 className="font-outfit font-bold text-base flex items-center gap-2 text-indigo-300">
                <Storefront size={20} />
                Origem da Distribuição
              </h2>

              <div className="space-y-4">
                {/* Product selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-dark-dim font-bold uppercase block">Produto Referência</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#1A1C26] border border-dark-border rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>[{p.reference}] {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Stock Type selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-dark-dim font-bold uppercase block">Estoque Origem</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['producao', 'acervo'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setStockType(type as any)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                          stockType === type 
                            ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300 shadow'
                            : 'bg-[#1A1C26] border-dark-border/60 text-dark-dim'
                        }`}
                      >
                        {type === 'producao' ? 'Estoque Produção' : 'Estoque Acervo'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Available stock grade display */}
            <div className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-dark-dim block">Saldos Disponíveis em Estoque</span>
              
              {isLoading ? (
                <div className="text-center py-4 text-xs text-dark-dim">Carregando saldos...</div>
              ) : stockItem ? (
                <div className="grid grid-cols-5 gap-2.5">
                  {Object.entries(stockItem.size_grade || {}).map(([size, qty]) => {
                    const allocated = getAllocatedQtyForSize(size);
                    const rem = qty - allocated;
                    return (
                      <div key={size} className="bg-dark-bg/60 border border-dark-border/30 rounded-xl p-2.5 text-center">
                        <p className="text-[11px] font-black text-indigo-400">{size}</p>
                        <p className="text-sm font-black text-white mt-0.5">{qty}</p>
                        <span className={`text-[9px] font-bold block mt-1 ${rem < 0 ? 'text-rose-400' : 'text-dark-dim/80'}`}>
                          ({rem} rest)
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-rose-400 flex items-center justify-center gap-1.5 bg-rose-500/5 rounded-xl border border-rose-500/10">
                  <Warning size={16} />
                  Nenhum saldo físico encontrado neste estoque.
                </div>
              )}
            </div>

            {/* allocations section */}
            {stockItem && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-outfit font-bold text-base">Alocação de Lojas</h3>
                  <button 
                    onClick={handleAddStore}
                    className="flex items-center gap-1 text-xs text-indigo-400 font-bold active:scale-95 transition-all"
                  >
                    <Plus size={14} />
                    Adicionar Loja
                  </button>
                </div>

                <div className="space-y-5">
                  {allocations.map((alloc, storeIdx) => (
                    <div 
                      key={storeIdx}
                      className="bg-dark-card border border-dark-border/50 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center border-b border-dark-border/40 pb-3">
                        <input 
                          type="text"
                          value={alloc.store_name}
                          onChange={(e) => handleStoreNameChange(storeIdx, e.target.value)}
                          className="bg-transparent font-outfit font-bold text-sm text-white outline-none border-b border-transparent focus:border-indigo-500 max-w-[200px]"
                        />
                        {allocations.length > 1 && (
                          <button 
                            onClick={() => handleRemoveStore(storeIdx)}
                            className="p-1.5 rounded-lg bg-dark-bg border border-dark-border/40 text-dark-dim hover:text-rose-400 transition-all"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>

                      {/* Grade inputs */}
                      <div className="grid grid-cols-4 gap-3">
                        {Object.keys(stockItem.size_grade || {}).map(size => (
                          <div key={size} className="space-y-1">
                            <span className="text-[10px] text-dark-dim font-bold block text-center">{size}</span>
                            <input 
                              type="number"
                              value={alloc.size_grade[size] || 0}
                              onChange={(e) => handleSizeQtyChange(storeIdx, size, parseInt(e.target.value) || 0)}
                              className={`w-full bg-[#1A1C26] border rounded-lg text-center p-2 text-xs font-bold outline-none focus:border-indigo-500 ${
                                isOverAllocated(size) ? 'border-rose-500/60 bg-rose-500/5' : 'border-dark-border/60'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirm */}
                <button 
                  onClick={handleSaveDistribution}
                  disabled={isSubmitting}
                  className="btn-primary w-full py-4 justify-center font-bold text-sm shadow-lg mt-4"
                >
                  {isSubmitting ? 'Confirmando Distribuição...' : 'Liberar Reparto de Estoque'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-dark-card border border-emerald-500/20 rounded-2xl p-6 text-center space-y-5 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} weight="fill" />
            </div>

            <div className="space-y-2">
              <h2 className="font-outfit font-black text-xl">Reparto Concluído!</h2>
              <p className="text-xs text-dark-dim leading-relaxed px-2">
                Os lotes de reparto foram validados e marcados para expedição imediata para as respectivas filiais.
              </p>
            </div>

            <div className="bg-[#1A1C26] rounded-xl p-4.5 text-left border border-dark-border/40 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Produto</span>
                <span className="text-indigo-400 font-bold">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-dim font-bold">Lojas Atendidas</span>
                <span className="text-white font-bold">{allocations.map(a => a.store_name).join(', ')}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setSuccess(false);
                navigate('/mobile');
              }}
              className="btn-primary w-full py-3.5 justify-center font-bold"
            >
              Voltar ao Painel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
