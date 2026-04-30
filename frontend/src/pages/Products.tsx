import React, { useEffect, useState } from 'react';
import { Package, Plus, Ruler, ListChecks, ArrowLeft } from '@phosphor-icons/react';
import { getProducts, getMaterials, createProduct, createMaterial } from '../services/api';
import type { Product, Material } from '../services/api';

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
    materials: [] as { material_id: string, quantity: number }[]
  });

  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'un',
    stock_quantity: 0
  });

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
      await createProduct(newProduct);
      setIsProductModalOpen(false);
      setNewProduct({ reference: '', name: '', description: '', base_price: 0, materials: [] });
      loadData();
    } catch (error) {
      alert("Erro ao cadastrar produto");
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMaterial(newMaterial);
      setIsMaterialModalOpen(false);
      setNewMaterial({ name: '', unit: 'un', stock_quantity: 0 });
      loadData();
    } catch (error) {
      alert("Erro ao cadastrar insumo");
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
        <div className="flex gap-3">
          <button onClick={() => setIsMaterialModalOpen(true)} className="px-6 py-3 bg-white/5 border border-dark-border rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center gap-2">
            <Ruler size={20} />
            Cadastrar Insumo
          </button>
          <button onClick={() => setIsProductModalOpen(true)} className="btn-primary">
            <Plus size={20} weight="bold" />
            Nova Ficha Técnica
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p>Carregando...</p>
          ) : products.length === 0 ? (
            <div className="col-span-full card flex flex-col items-center py-20 gap-4">
              <ListChecks size={48} weight="thin" />
              <p className="text-dark-dim">Nenhuma ficha técnica cadastrada.</p>
            </div>
          ) : (
            products.map(p => (
              <div key={p.id} className="card group hover:border-primary/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-xl">
                    <Package size={24} weight="bold" />
                  </div>
                  <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded uppercase tracking-widest">{p.reference}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{p.name}</h3>
                <p className="text-dark-dim text-xs mb-6 line-clamp-2">{p.description || 'Sem descrição'}</p>
                
                <div className="border-t border-dark-border pt-4">
                   <h4 className="text-[10px] uppercase font-bold text-dark-dim mb-3 tracking-widest">Insumos / Kit</h4>
                   <div className="space-y-2">
                      {p.materials.map(pm => (
                        <div key={pm.id} className="flex justify-between text-xs">
                           <span className="text-dark-dim">{pm.material.name}</span>
                           <span className="font-bold">{pm.quantity} {pm.material.unit}</span>
                        </div>
                      ))}
                      {p.materials.length === 0 && <p className="text-xs text-dark-dim italic">Nenhum insumo vinculado.</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-lg rounded-2xl p-6 h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-6">Nova Ficha Técnica</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4 flex-1 overflow-y-auto pr-2">
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
               
               <div className="flex gap-3 pt-6 sticky bottom-0 bg-dark-card">
                  <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim">Cancelar</button>
                  <button type="submit" className="flex-1 btn-primary justify-center">Salvar Ficha Técnica</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
