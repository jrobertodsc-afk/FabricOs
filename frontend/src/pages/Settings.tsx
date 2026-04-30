import React, { useEffect, useState } from 'react';
import { Gear, Plus, Trash, ArrowsDownUp, Check } from '@phosphor-icons/react';
import { getProductionStages } from '../services/api';
import api from '../services/api';

const Settings: React.FC = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');

  const loadStages = async () => {
    try {
      const data = await getProductionStages();
      setStages(data);
    } catch (error) {
      console.error("Failed to load stages", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName) return;
    
    try {
      await api.post('/api/production/stages', {
        name: newStageName,
        order: stages.length + 1
      });
      setNewStageName('');
      loadStages();
    } catch (error) {
      alert("Erro ao adicionar estágio");
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm("Tem certeza? Isso pode afetar OPs que estão neste estágio.")) return;
    try {
      await api.delete(`/api/production/stages/${id}`);
      loadStages();
    } catch (error) {
      alert("Erro ao excluir estágio");
    }
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="mb-10">
        <h1 className="text-2xl font-bold font-outfit">Configurações do Sistema</h1>
        <p className="text-dark-dim">Personalize o fluxo de trabalho da sua fábrica</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto pr-2">
        <section className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <ArrowsDownUp size={20} weight="bold" />
            </div>
            <h2 className="text-lg font-bold">Fluxo de Produção (Estágios)</h2>
          </div>

          <p className="text-sm text-dark-dim mb-6">
            Defina a ordem dos estágios da sua produção. O scanner de QR Code seguirá exatamente esta sequência.
          </p>

          <div className="space-y-3 mb-8">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center justify-between p-4 bg-dark-bg/50 border border-dark-border rounded-xl group">
                <div className="flex items-center gap-4">
                  <span className="text-primary font-black text-xs">0{index + 1}</span>
                  <span className="font-bold">{stage.name}</span>
                </div>
                <button 
                  onClick={() => handleDeleteStage(stage.id)}
                  className="p-2 text-dark-dim hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddStage} className="flex gap-3">
            <input 
              type="text" 
              placeholder="Novo estágio (ex: Lavanderia)"
              className="flex-1 bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Plus size={18} weight="bold" />
              Adicionar
            </button>
          </form>
        </section>

        <section className="card opacity-50 cursor-not-allowed">
           <div className="flex items-center gap-3 mb-6">
            <div className="bg-success/10 text-success p-2 rounded-lg">
              <Check size={20} weight="bold" />
            </div>
            <h2 className="text-lg font-bold">Regras de Automação (Breve)</h2>
          </div>
          <p className="text-sm text-dark-dim">
            Em breve você poderá configurar alertas automáticos via WhatsApp quando uma OP atrasar em um estágio.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Settings;
