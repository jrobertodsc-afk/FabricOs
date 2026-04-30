import React, { useEffect, useState } from 'react';
import { Ruler, Plus, MagnifyingGlass, Warning, ArrowUp, ArrowDown, Package, Coins } from '@phosphor-icons/react';
import { getMaterials, createMaterial } from '../services/api';
import type { Material } from '../services/api';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'un',
    stock_quantity: 0
  });

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
      await createMaterial(newMaterial);
      setIsModalOpen(false);
      setNewMaterial({ name: '', unit: 'un', stock_quantity: 0 });
      loadData();
    } catch (error) {
      alert("Erro ao cadastrar material");
    }
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Almoxarifado & Insumos</h1>
          <p className="text-dark-dim">Controle de estoque de aviamentos e matérias-primas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
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
              <h3 className="text-2xl font-bold font-outfit">R$ 12.840</h3>
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
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-12 pr-4 text-sm focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
              ) : materials.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-dark-dim italic">Nenhum material cadastrado.</td></tr>
              ) : (
                materials.map(m => (
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
                        <button className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors" title="Adicionar Estoque">
                          <ArrowUp size={18} />
                        </button>
                        <button className="p-2 hover:bg-danger/10 text-danger rounded-lg transition-colors" title="Retirar Estoque">
                          <ArrowDown size={18} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-black/50">
            <h2 className="text-xl font-bold mb-6 font-outfit">Novo Material</h2>
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
                  <button type="submit" className="flex-1 btn-primary justify-center">Salvar</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
