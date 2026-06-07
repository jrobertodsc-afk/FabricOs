import React, { useEffect, useState } from 'react';
import { Package, Plus, Ruler, ListChecks, ArrowLeft, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { getProducts, getMaterials, createProduct, createMaterial, updateProduct, deleteProduct, adjustFinishedStock, createPilotageCard } from '../services/api';
import type { Product, Material } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    reference: '',
    name: '',
    description: '',
    base_price: 0,
    materials: [] as { material_id: string, quantity: number }[],
    classification: 'produto_acabado' as 'produto_acabado' | 'acervo' | 'piloto',
    feedStock: false,
    stockQuantity: 1
  });

  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'un',
    stock_quantity: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const [pData, mData] = await Promise.all([
        getProducts(),
        getMaterials()
      ]);
      setProducts(pData);
      setMaterials(mData);
    } catch (error) {
      console.error("Failed to load products/materials", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          reference: newProduct.reference,
          name: newProduct.name,
          description: newProduct.description,
          type: newProduct.classification,
          base_price: newProduct.base_price,
          materials: newProduct.materials
        });
        addToast("Ficha Técnica atualizada com sucesso", "success");
      } else {
        const payload: any = {
          reference: newProduct.reference,
          name: newProduct.name,
          description: newProduct.description,
          type: newProduct.classification,
          base_price: newProduct.base_price,
          materials: newProduct.materials
        };
        
        if (newProduct.feedStock && newProduct.stockQuantity > 0) {
          payload.initial_stock = { 'U': newProduct.stockQuantity };
        }

        const createdProduct = await createProduct(payload);
        
        // Generate Pilotage Card if it's a pilot
        if (newProduct.classification === 'piloto') {
          await createPilotageCard({
            model_name: createdProduct.name,
            raw_material: 'A definir',
            family: 'A definir',
            pilot_name: 'A definir',
            patternmaker_name: 'A definir',
            size: 'A definir',
            status: 'em_ajuste'
          });
        }

        addToast("Ficha Técnica cadastrada com sucesso", "success");
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setNewProduct({ reference: '', name: '', description: '', base_price: 0, materials: [], classification: 'produto_acabado', feedStock: false, stockQuantity: 1 });
      loadData();
    } catch (error) {
      addToast(editingProduct ? "Erro ao atualizar ficha técnica" : "Erro ao cadastrar ficha técnica", "error");
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      addToast("Ficha Técnica excluída com sucesso", "success");
      setIsDeleteOpen(false);
      setProductToDelete(null);
      loadData();
    } catch (error) {
      addToast("Erro ao excluir ficha técnica", "error");
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      reference: product.reference,
      name: product.name,
      description: product.description || '',
      base_price: product.base_price || 0,
      materials: (product.materials || []).map(m => ({
        material_id: m.material_id,
        quantity: m.quantity
      })),
      classification: 'produto_acabado',
      feedStock: false,
      stockQuantity: 1
    });
    setIsProductModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMaterial(newMaterial);
      addToast("Insumo cadastrado com sucesso", "success");
      setIsMaterialModalOpen(false);
      setNewMaterial({ name: '', unit: 'un', stock_quantity: 0 });
      loadData();
    } catch (error) {
      addToast("Erro ao cadastrar insumo", "error");
    }
  };

  const addMaterialToProduct = () => {
    setNewProduct({
      ...newProduct,
      materials: [...newProduct.materials, { material_id: '', quantity: 1 }]
    });
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Produtos & Fichas Técnicas</h1>
          <p className="text-dark-dim">Cadastre seus modelos e os aviamentos necessários</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
            <input 
              type="text" 
              placeholder="Buscar ficha técnica..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all w-64"
            />
          </div>
          <button onClick={() => setIsMaterialModalOpen(true)} className="px-6 py-2 bg-white/5 border border-dark-border rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center gap-2">
            <Ruler size={20} />
            Cadastrar Insumo
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setNewProduct({ reference: '', name: '', description: '', base_price: 0, materials: [], classification: 'produto_acabado', feedStock: false, stockQuantity: 1 });
              setIsProductModalOpen(true);
            }} 
            className="btn-primary py-2"
          >
            <Plus size={20} weight="bold" />
            Nova Ficha Técnica
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p>Carregando...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full card flex flex-col items-center py-20 gap-4">
              <ListChecks size={48} weight="thin" />
              <p className="text-dark-dim">Nenhuma ficha técnica encontrada.</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} className="card group hover:border-primary/40 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  {p.image_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-dark-border/60 bg-dark-bg">
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="bg-primary/10 text-primary p-3 rounded-xl">
                      <Package size={24} weight="bold" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded uppercase tracking-widest">{p.reference}</span>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-dark-dim hover:text-primary transition-colors bg-white/5 rounded-lg opacity-0 group-hover:opacity-100">
                      <PencilSimple size={16} />
                    </button>
                    <button onClick={() => { setProductToDelete(p); setIsDeleteOpen(true); }} className="p-1.5 text-dark-dim hover:text-danger transition-colors bg-white/5 rounded-lg opacity-0 group-hover:opacity-100">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{p.name}</h3>
                <p className="text-dark-dim text-xs mb-4 line-clamp-2 flex-1">{p.description || 'Sem descrição'}</p>
                
                {p.type === 'piloto' && (
                  <div className="mb-6">
                    <button 
                      onClick={() => window.open(`/ficha/${p.id}`, '_blank')}
                      className="w-full py-2 bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <ListChecks size={16} />
                      Ver Ficha Técnica
                    </button>
                  </div>
                )}

                <div className="border-t border-dark-border pt-4">
                   <h4 className="text-[10px] uppercase font-bold text-dark-dim mb-3 tracking-widest">Insumos / Kit</h4>
                   <div className="space-y-2">
                      {(p.materials || []).map(pm => (
                        <div key={pm.id} className="flex justify-between text-xs">
                           <span className="text-dark-dim">{pm.material.name}</span>
                           <span className="font-bold">{pm.quantity} {pm.material.unit}</span>
                        </div>
                      ))}
                      {(p.materials || []).length === 0 && <p className="text-xs text-dark-dim italic">Nenhum insumo vinculado.</p>}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Novo Insumo */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Novo Insumo</h2>
            <form onSubmit={handleCreateMaterial} className="space-y-4">
               <div>
                  <label className="text-xs text-dark-dim mb-1 block">Nome do Aviamento/Insumo</label>
                  <input type="text" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="Ex: Zíper Invisível 15cm" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-dark-dim mb-1 block">Unidade</label>
                     <select className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}>
                        <option value="un">Unidade</option>
                        <option value="metros">Metros</option>
                        <option value="rolo">Rolo</option>
                        <option value="kg">KG</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-dark-dim mb-1 block">Estoque Inicial</label>
                     <input type="number" className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.stock_quantity} onChange={e => setNewMaterial({...newMaterial, stock_quantity: parseFloat(e.target.value)})} />
                  </div>
               </div>
               <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim">Cancelar</button>
                  <button type="submit" className="flex-1 btn-primary justify-center">Salvar</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Ficha Técnica */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-lg rounded-2xl p-6 h-[90vh] flex flex-col animate-scale-up">
            <h2 className="text-xl font-bold mb-6">{editingProduct ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-dark-dim mb-1 block">Referência</label>
                     <input type="text" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newProduct.reference} onChange={e => setNewProduct({...newProduct, reference: e.target.value})} placeholder="Ex: VEST-001" />
                  </div>
                  <div>
                     <label className="text-xs text-dark-dim mb-1 block">Nome do Produto</label>
                     <input type="text" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: Vestido Midi" />
                  </div>
               </div>
               
               <div>
                  <label className="text-xs text-dark-dim mb-1 block">Descrição / Notas de Modelagem</label>
                  <textarea className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none h-20 text-sm" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
               </div>

               {!editingProduct && (
                 <div className="bg-white/5 border border-dark-border rounded-xl p-4 mt-4 space-y-4">
                   <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Package size={18} /> Configuração de Peça</h3>
                   
                   <div>
                     <label className="text-xs text-dark-dim mb-1 block">Classificação (Apenas Novo Cadastro)</label>
                     <select 
                       className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                       value={newProduct.classification}
                       onChange={e => setNewProduct({...newProduct, classification: e.target.value as any})}
                     >
                       <option value="produto_acabado">Produto Acabado (Estoque Comercial)</option>
                       <option value="acervo">Peça de Acervo</option>
                       <option value="piloto">Peça Piloto</option>
                     </select>
                     {newProduct.classification === 'piloto' && (
                       <p className="text-xs text-primary mt-2 flex items-center gap-1">
                         * A ficha de pilotagem será criada automaticamente.
                       </p>
                     )}
                   </div>

                   <div className="flex items-center gap-3">
                     <input 
                       type="checkbox" 
                       id="feedStock"
                       checked={newProduct.feedStock}
                       onChange={e => setNewProduct({...newProduct, feedStock: e.target.checked})}
                       className="w-4 h-4 rounded border-dark-border bg-dark-bg text-primary focus:ring-primary focus:ring-offset-dark-card"
                     />
                     <label htmlFor="feedStock" className="text-sm font-bold text-white">Alimentar estoque imediatamente?</label>
                   </div>

                   {newProduct.feedStock && (
                     <div className="pl-7">
                       <label className="text-xs text-dark-dim mb-1 block">Quantidade Total</label>
                       <input 
                         type="number" 
                         min="1"
                         className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                         value={newProduct.stockQuantity}
                         onChange={e => setNewProduct({...newProduct, stockQuantity: parseInt(e.target.value) || 0})}
                       />
                       <p className="text-xs text-dark-dim mt-1">A quantidade será adicionada no tamanho 'U' no estoque selecionado.</p>
                     </div>
                   )}
                 </div>
               )}

               <div className="border-t border-dark-border pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Insumos (Composição)</h3>
                     <button type="button" onClick={addMaterialToProduct} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold">+ Adicionar</button>
                  </div>
                  
                  <div className="space-y-3">
                     {newProduct.materials.map((pm, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-end">
                           <div className="col-span-7">
                              <label className="text-[10px] text-dark-dim mb-1 block">Insumo</label>
                              <select 
                                 className="w-full bg-dark-bg border border-dark-border rounded-xl p-2 text-sm outline-none"
                                 value={pm.material_id}
                                 onChange={e => {
                                    const updated = [...newProduct.materials];
                                    updated[index].material_id = e.target.value;
                                    setNewProduct({...newProduct, materials: updated});
                                 }}
                              >
                                 <option value="">Selecione...</option>
                                 {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                              </select>
                           </div>
                           <div className="col-span-3">
                              <label className="text-[10px] text-dark-dim mb-1 block">Qtd por Peça</label>
                              <input 
                                 type="number" step="0.01"
                                 className="w-full bg-dark-bg border border-dark-border rounded-xl p-2 text-sm outline-none"
                                 value={pm.quantity}
                                 onChange={e => {
                                    const updated = [...newProduct.materials];
                                    updated[index].quantity = parseFloat(e.target.value) || 0;
                                    setNewProduct({...newProduct, materials: updated});
                                 }}
                              />
                           </div>
                           <div className="col-span-2">
                              <button 
                                 type="button"
                                 onClick={() => {
                                    const updated = newProduct.materials.filter((_, i) => i !== index);
                                    setNewProduct({...newProduct, materials: updated});
                                 }}
                                 className="w-full p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                              >
                                 Remover
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex gap-3 pt-6 sticky bottom-0 bg-dark-card pb-2">
                  <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 btn-primary justify-center">{editingProduct ? 'Atualizar Ficha Técnica' : 'Salvar Ficha Técnica'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ficha Técnica"
        message={`Tem certeza que deseja excluir a ficha técnica ${productToDelete?.reference}? Esta ação não pode ser desfeita e pode afetar Ordens de Produção existentes.`}
        confirmText="Excluir"
      />
    </div>
  );
};

export default Products;
