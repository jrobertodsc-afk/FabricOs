import React, { useEffect, useState } from 'react';
import { Gear, Plus, Trash, ArrowsDownUp, Check, PencilSimple, FloppyDisk, X, Kanban } from '@phosphor-icons/react';
import { getProductionStages } from '../services/api';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const getDecodedToken = () => {
  try {
    const token = localStorage.getItem('fabricos_token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const Settings: React.FC = () => {
  const user = getDecodedToken();
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');
  
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<any | null>(null);

  const { addToast } = useToast();

  const [trelloApiKey, setTrelloApiKey] = useState('');
  const [trelloToken, setTrelloToken] = useState('');
  const [trelloBoardUrl, setTrelloBoardUrl] = useState('');
  const [trelloWebhookUrl, setTrelloWebhookUrl] = useState('');
  const [trelloSaving, setTrelloSaving] = useState(false);
  const [trelloActiveBoards, setTrelloActiveBoards] = useState<any[]>([]);

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

  const loadTrelloSettings = async () => {
    try {
      const res = await api.get('/api/integrations/settings');
      setTrelloApiKey(res.data.api_key);
      setTrelloToken(res.data.token);
      setTrelloBoardUrl(res.data.board_url);
      setTrelloWebhookUrl(res.data.webhook_url);
      setTrelloActiveBoards(res.data.active_boards || []);
    } catch (error) {
      console.error("Failed to load Trello settings", error);
    }
  };

  useEffect(() => {
    loadStages();
    loadTrelloSettings();
  }, []);

  const handleSaveTrelloSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trelloApiKey || !trelloToken || !trelloBoardUrl) {
      addToast("Chave API, Token e URL do Quadro são obrigatórios!", "error");
      return;
    }
    setTrelloSaving(true);
    try {
      const res = await api.post('/api/integrations/trello/register', {
        api_key: trelloApiKey,
        token: trelloToken,
        board_url: trelloBoardUrl,
        webhook_url: trelloWebhookUrl
      });
      if (res.data.status === 'success') {
        addToast(res.data.message || "Quadro integrado com sucesso!", "success");
        setTrelloBoardUrl(''); // Limpa o input para novos quadros
        loadTrelloSettings(); // Recarrega a lista
      } else {
        addToast("Falha ao registrar webhook", "error");
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail || "Erro ao configurar integração no Trello.";
      addToast(detail, "error");
    } finally {
      setTrelloSaving(false);
    }
  };

  const handleDeleteTrelloWebhook = async (webhookId: string) => {
    try {
      const res = await api.delete(`/api/integrations/trello/webhooks/${webhookId}`);
      if (res.data.status === 'success') {
        addToast(res.data.message || "Quadro desvinculado com sucesso!", "success");
        loadTrelloSettings(); // Recarrega a lista
      }
    } catch (error: any) {
      addToast("Erro ao desvincular quadro", "error");
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName) return;
    
    try {
      await api.post('/api/production/stages', {
        name: newStageName,
        order: stages.length + 1
      });
      setNewStageName('');
      addToast("Estágio adicionado com sucesso!", "success");
      loadStages();
    } catch (error) {
      addToast("Erro ao adicionar estágio", "error");
    }
  };

  const handleUpdateStage = async (id: string) => {
    if (!editingStageName) return;
    try {
      await api.patch(`/api/production/stages/${id}`, {
        name: editingStageName
      });
      setEditingStageId(null);
      addToast("Estágio atualizado com sucesso!", "success");
      loadStages();
    } catch (error) {
      addToast("Erro ao atualizar estágio", "error");
    }
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;
    try {
      await api.delete(`/api/production/stages/${stageToDelete.id}`);
      addToast("Estágio excluído com sucesso!", "success");
      setIsDeleteOpen(false);
      setStageToDelete(null);
      loadStages();
    } catch (error) {
      addToast("Erro ao excluir estágio", "error");
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
              <div key={stage.id} className="flex items-center justify-between p-4 bg-dark-bg/50 border border-dark-border rounded-xl group transition-colors hover:border-primary/30">
                {editingStageId === stage.id ? (
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-primary font-black text-xs">0{index + 1}</span>
                    <input 
                      type="text" 
                      value={editingStageName}
                      onChange={e => setEditingStageName(e.target.value)}
                      className="flex-1 bg-dark-card border border-primary rounded-lg px-3 py-1.5 focus:outline-none text-sm"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleUpdateStage(stage.id)}
                      className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"
                      title="Salvar"
                    >
                      <FloppyDisk size={18} />
                    </button>
                    <button 
                      onClick={() => setEditingStageId(null)}
                      className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="text-primary font-black text-xs">0{index + 1}</span>
                      <span className="font-bold">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); }}
                        className="p-2 text-dark-dim hover:text-primary transition-colors bg-white/5 rounded-lg"
                        title="Editar"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button 
                        onClick={() => { setStageToDelete(stage); setIsDeleteOpen(true); }}
                        className="p-2 text-dark-dim hover:text-danger transition-colors bg-white/5 rounded-lg"
                        title="Excluir"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </>
                )}
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

        {user?.role === 'admin' && (
          <section className="card border border-dark-border hover:border-primary/20 transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <Kanban size={20} weight="bold" />
            </div>
            <h2 className="text-lg font-bold">Integração Trello (Automação)</h2>
          </div>

          <p className="text-sm text-dark-dim mb-6">
            Crie produtos e Ordens de Produção (OP) de forma 100% automática a partir do Trello da sua modelista ou designer.
          </p>

          <form onSubmit={handleSaveTrelloSettings} className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-white/90 block mb-1">Chave de API do Trello</label>
              <input 
                type="text" 
                value={trelloApiKey}
                onChange={e => setTrelloApiKey(e.target.value)}
                placeholder="Insira sua Chave de API"
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm font-mono text-white/90"
              />
              <span className="text-[10px] text-dark-dim block mt-1">
                Obtenha sua chave de API em <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer" className="text-primary hover:underline">trello.com/power-ups/admin</a>.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-white/90 block mb-1">Token de Acesso Trello</label>
              <input 
                type="password" 
                value={trelloToken}
                onChange={e => setTrelloToken(e.target.value)}
                placeholder="Insira seu Token Manual"
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm font-mono text-white/90"
              />
              <span className="text-[10px] text-dark-dim block mt-1">
                Gere um token manualmente clicando em <b>"token"</b> na seção de Chave de API do Trello.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-white/90 block mb-1">URL do Quadro do Trello</label>
              <input 
                type="text" 
                value={trelloBoardUrl}
                onChange={e => setTrelloBoardUrl(e.target.value)}
                placeholder="Ex: https://trello.com/b/aBcD1234/boah-verao-26-27"
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-sm text-white/90"
              />
              <span className="text-[10px] text-dark-dim block mt-1">
                Cole o link público/privado do quadro que deseja monitorar.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-white/90 block mb-1">URL de Callback (Webhook)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={trelloWebhookUrl}
                  onChange={e => setTrelloWebhookUrl(e.target.value)}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none text-xs font-mono text-white/90"
                />
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(trelloWebhookUrl);
                    addToast("Link do Webhook copiado!", "success");
                  }}
                  className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-xl transition-all"
                >
                  Copiar
                </button>
              </div>
              <span className="text-[10px] text-dark-dim block mt-1">
                O FabricOS monitora automaticamente colunas com a palavra <b>"APROVADAS"</b> (ex: <i>"APROVADAS DE JULHO"</i>).
              </span>
            </div>

            <button 
              type="submit" 
              disabled={trelloSaving}
              className="w-full btn-primary py-3 justify-center text-sm font-bold mt-2"
            >
              {trelloSaving ? 'Configurando Webhook...' : 'Vincular Novo Quadro'}
            </button>
          </form>

          {trelloActiveBoards.length > 0 && (
            <div className="mt-6 pt-6 border-t border-dark-border/40 space-y-3">
              <span className="text-[10px] font-black uppercase text-primary tracking-wider block">📋 Quadros em Sincronização Ativa ({trelloActiveBoards.length})</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {trelloActiveBoards.map(board => (
                  <div key={board.id} className="flex items-center justify-between p-3 bg-dark-bg/50 border border-dark-border/80 rounded-xl group transition-all hover:border-primary/20">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white/90">{board.board_name}</span>
                      <span className="text-[9px] text-dark-dim font-mono">ID: {board.board_id}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTrelloWebhook(board.id)}
                      className="p-1.5 text-dark-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      title="Desvincular Quadro"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 mt-6 border-t border-dark-border/40 flex items-center justify-between text-xs text-dark-dim">
            <span>Status da Integração</span>
            {trelloActiveBoards.length > 0 ? (
              <span className="flex items-center gap-1.5 font-bold text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                Ativo: {trelloActiveBoards.length} quadro(s) integrado(s)
              </span>
            ) : trelloApiKey && trelloToken ? (
              <span className="flex items-center gap-1.5 font-bold text-warning">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                Autenticado (Aguardando Quadros)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-danger">
                <span className="w-2 h-2 rounded-full bg-danger"></span>
                Inativo (Credenciais Ausentes)
              </span>
            )}
          </div>
        </section>
        )}
      </div>

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteStage}
        title="Excluir Estágio"
        message={`Tem certeza que deseja excluir o estágio "${stageToDelete?.name}"? Esta ação pode afetar OPs que estão atualmente neste estágio.`}
        confirmText="Excluir Estágio"
      />
    </div>
  );
};

export default Settings;
