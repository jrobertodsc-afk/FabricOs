import React, { useEffect, useState } from 'react';
import { Ruler, Plus, MagnifyingGlass, Warning, ArrowUp, ArrowDown, Package, Coins, PencilSimple, Trash } from '@phosphor-icons/react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, adjustMaterialStock } from '../services/api';
import type { Material, StockAdjustmentPayload } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'un',
    stock_quantity: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [adjustData, setAdjustData] = useState<StockAdjustmentPayload>({
    quantity: 0,
    reason: '',
    type: 'add'
  });

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error("Failed to load materials", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, newMaterial);
        addToast("Insumo atualizado com sucesso", "success");
      } else {
        await createMaterial(newMaterial);
        addToast("Insumo cadastrado com sucesso", "success");
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      setNewMaterial({ name: '', unit: 'un', stock_quantity: 0 });
      loadData();
    } catch (error) {
      addToast(editingMaterial ? "Erro ao atualizar insumo" : "Erro ao cadastrar insumo", "error");
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    try {
      await deleteMaterial(materialToDelete.id);
      addToast("Insumo excluído com sucesso", "success");
      setIsDeleteOpen(false);
      setMaterialToDelete(null);
      loadData();
    } catch (error) {
      addToast("Erro ao excluir insumo", "error");
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    try {
      await adjustMaterialStock(adjustingMaterial.id, adjustData);
      addToast("Estoque ajustado com sucesso", "success");
      setIsAdjustModalOpen(false);
      setAdjustingMaterial(null);
      setAdjustData({ quantity: 0, reason: '', type: 'add' });
      loadData();
    } catch (error) {
      addToast("Erro ao ajustar estoque", "error");
    }
  };

  const openEdit = (material: Material) => {
    setEditingMaterial(material);
    setNewMaterial({
      name: material.name,
      unit: material.unit,
      stock_quantity: material.stock_quantity
    });
    setIsModalOpen(true);
  };

  const openAdjust = (material: Material, type: 'add' | 'subtract') => {
    setAdjustingMaterial(material);
    setAdjustData({ quantity: 0, reason: '', type });
    setIsAdjustModalOpen(true);
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Almoxarifado & Insumos</h1>
          <p className="text-dark-dim">Controle de estoque de aviamentos e matérias-primas.</p>
        </div>
        <button 
          onClick={() => {
            setEditingMaterial(null);
            setNewMaterial({ name: '', unit: 'un', stock_quantity: 0 });
            setIsModalOpen(true);
          }} 
          className="btn-primary"
        >
          <Plus size={20} weight="bold" />
          Novo Insumo
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Package size={24} weight="bold" />
            </div>
            <div>
              <p className="text-dark-dim text-xs uppercase font-bold tracking-widest">Total de Itens</p>
              <h3 className="text-2xl font-bold font-outfit">{materials.length}</h3>
            </div>
          </div>
        </div>
        <div className="card bg-warning/5 border-warning/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning/10 text-warning rounded-xl">
              <Warning size={24} weight="bold" />
            </div>
            <div>
              <p className="text-dark-dim text-xs uppercase font-bold tracking-widest">Estoque Baixo</p>
              <h3 className="text-2xl font-bold font-outfit">{materials.filter(m => m.stock_quantity < 10).length}</h3>
            </div>
          </div>
        </div>
        <div className="card bg-success/5 border-success/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 text-success rounded-xl">
              <Coins size={24} weight="bold" />
            </div>
            <div>
              <p className="text-dark-dim text-xs uppercase font-bold tracking-widest">Valor em Estoque</p>
              <h3 className="text-2xl font-bold font-outfit">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                  materials.reduce((acc, m) => acc + (m.stock_quantity * 10), 0)
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card flex-1 overflow-hidden flex flex-col !p-0">
        <div className="p-6 border-b border-dark-border bg-dark-card/50 flex justify-between items-center">
           <div className="relative w-96">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
            <input 
              type="text" 
              placeholder="Buscar insumo (zíper, tecido, linha...)" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-12 pr-4 text-sm focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-dark-card z-10">
              <tr className="table-header">
                <th className="px-6 py-4">Insumo / Material</th>
                <th className="px-6 py-4 text-center">Unidade</th>
                <th className="px-6 py-4 text-center">Saldo Atual</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-dark-dim">Carregando estoque...</td></tr>
              ) : filteredMaterials.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-dark-dim italic">Nenhum material encontrado.</td></tr>
              ) : (
                filteredMaterials.map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center text-dark-dim group-hover:text-primary transition-colors">
                          <Ruler size={16} />
                        </div>
                        <span className="font-bold text-sm">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-white/5 px-2 py-1 rounded text-[10px] font-black uppercase text-dark-dim">{m.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold ${m.stock_quantity < 10 ? 'text-warning' : 'text-white'}`}>
                        {m.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.stock_quantity < 10 ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-warning uppercase">
                          <Warning size={14} weight="bold" /> Comprar Logo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-success uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-success"></div> Em Dia
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openAdjust(m, 'add')} className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors" title="Adicionar Estoque">
                          <ArrowUp size={18} />
                        </button>
                        <button onClick={() => openAdjust(m, 'subtract')} className="p-2 hover:bg-warning/10 text-warning rounded-lg transition-colors" title="Retirar Estoque">
                          <ArrowDown size={18} />
                        </button>
                        <div className="w-px h-6 bg-dark-border mx-1 self-center"></div>
                        <button onClick={() => openEdit(m)} className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors" title="Editar">
                          <PencilSimple size={18} />
                        </button>
                        <button onClick={() => { setMaterialToDelete(m); setIsDeleteOpen(true); }} className="p-2 hover:bg-danger/10 text-danger rounded-lg transition-colors" title="Excluir">
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Material */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-black/50 animate-scale-up">
            <h2 className="text-xl font-bold mb-6 font-outfit">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-dark-dim mb-1 block uppercase tracking-widest">Nome do Insumo</label>
                  <input type="text" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="Ex: Zíper Invisível 15cm" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-dark-dim mb-1 block uppercase tracking-widest">Unidade</label>
                     <select className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}>
                        <option value="un">Unidade (un)</option>
                        <option value="metros">Metros (m)</option>
                        <option value="rolo">Rolo (rl)</option>
                        <option value="kg">Quilo (kg)</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-dark-dim mb-1 block uppercase tracking-widest">Saldo Inicial</label>
                     <input type="number" step="0.01" className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={newMaterial.stock_quantity} onChange={e => setNewMaterial({...newMaterial, stock_quantity: parseFloat(e.target.value) || 0})} />
                  </div>
               </div>
               <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim font-bold hover:bg-white/5 transition-colors">Cancelar</button>
                   <button type="submit" className="flex-1 btn-primary justify-center">{editingMaterial ? 'Atualizar' : 'Salvar'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste Estoque */}
      {isAdjustModalOpen && adjustingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-black/50 animate-scale-up">
            <h2 className="text-xl font-bold mb-2 font-outfit text-white">
              {adjustData.type === 'add' ? 'Adicionar ao Estoque' : 'Retirar do Estoque'}
            </h2>
            <p className="text-sm text-dark-dim mb-6">Material: <span className="font-bold text-white">{adjustingMaterial.name}</span></p>
            
            <form onSubmit={handleAdjustStock} className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-dark-dim mb-1 block uppercase tracking-widest">Quantidade ({adjustingMaterial.unit})</label>
                  <input type="number" step="0.01" min="0.01" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={adjustData.quantity} onChange={e => setAdjustData({...adjustData, quantity: parseFloat(e.target.value) || 0})} />
               </div>
               <div>
                  <label className="text-xs font-bold text-dark-dim mb-1 block uppercase tracking-widest">Motivo / Observação</label>
                  <input type="text" required className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none" value={adjustData.reason} onChange={e => setAdjustData({...adjustData, reason: e.target.value})} placeholder={adjustData.type === 'add' ? 'Ex: Compra NF 1234' : 'Ex: Descarte / Uso avulso'} />
               </div>
               <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim font-bold hover:bg-white/5 transition-colors">Cancelar</button>
                  <button type="submit" className={`flex-1 flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl transition-all ${adjustData.type === 'add' ? 'bg-success hover:bg-success/90 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-warning hover:bg-warning/90 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`}>
                     {adjustData.type === 'add' ? <ArrowUp size={20} weight="bold" /> : <ArrowDown size={20} weight="bold" />}
                     Confirmar
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Material"
        message={`Tem certeza que deseja excluir o material ${materialToDelete?.name}? Ele não poderá ser mais utilizado em fichas técnicas.`}
        confirmText="Excluir"
      />
    </div>
  );
};

export default Materials;
