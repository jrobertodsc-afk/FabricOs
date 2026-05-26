import React, { useEffect, useState } from 'react';
import { 
  getBackofficeClients, 
  toggleClientLock, 
  updateClientLicense, 
  simulateLocalUpdate,
  backofficeLogin
} from '../services/api';
import type { BackofficeClient } from '../services/api';
import { 
  Lock, LockOpen, ArrowClockwise, HardDrives, 
  ShieldCheck, CheckSquare, Square,
  ChartLineUp, MonitorPlay, Sparkle, Tag, WarningCircle,
  PencilSimpleLine, Check, X
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';

const BackofficeDashboard: React.FC = () => {
  const [clients, setClients] = useState<BackofficeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [password, setPassword] = useState("");
  const { addToast } = useToast();
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const handleSaveName = async (tenantId: string) => {
    if (!editNameValue.trim()) return;
    try {
      const updated = await updateClientLicense(tenantId, {
        client_name: editNameValue.trim()
      });
      addToast(`Nome do cliente atualizado com sucesso!`, "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
      setEditingTenantId(null);
    } catch (error) {
      addToast("Erro ao renomear cliente.", "error");
    }
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getBackofficeClients();
      setClients(data);
      setAuthorized(true);
    } catch (error: any) {
      console.error("Failed to load backoffice clients:", error);
      if (error?.response?.status === 401) {
        setAuthorized(false);
      } else {
        addToast("Erro ao carregar dados do servidor de licenças.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('backoffice_admin_token');
    if (!token) {
      setAuthorized(false);
      setLoading(false);
    } else {
      loadClients();
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backofficeLogin(password);
      // Cookie foi definido automaticamente pelo browser
      localStorage.setItem('backoffice_admin_token', password);
      await loadClients();
    } catch (error: any) {
      addToast("Senha administrativa incorreta.", "error");
    }
  };

  const handleToggleLock = async (tenantId: string) => {
    try {
      const updated = await toggleClientLock(tenantId);
      addToast(
        updated.is_locked 
          ? `Instância suspensa com sucesso!` 
          : `Instância ativada com sucesso!`,
        updated.is_locked ? "info" : "success"
      );
      // Atualiza estado local
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch (error) {
      addToast("Erro ao alternar trava remota.", "error");
    }
  };

  const handleToggleModule = async (client: BackofficeClient, moduleName: string) => {
    let nextModules = [...client.enabled_modules];
    if (nextModules.includes(moduleName)) {
      nextModules = nextModules.filter(m => m !== moduleName);
    } else {
      nextModules.push(moduleName);
    }

    try {
      const updated = await updateClientLicense(client.tenant_id, {
        enabled_modules: nextModules
      });
      addToast(`Módulos da licença atualizados!`, "success");
      setClients(prev => prev.map(c => c.tenant_id === client.tenant_id ? updated : c));
    } catch (error) {
      addToast("Erro ao atualizar módulos licenciados.", "error");
    }
  };

  const handleChangeChannel = async (tenantId: string, channel: string) => {
    try {
      const updated = await updateClientLicense(tenantId, {
        update_channel: channel
      });
      addToast(`Canal de atualizações alterado para ${channel.toUpperCase()}!`, "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch (error) {
      addToast("Erro ao alterar canal de atualizações.", "error");
    }
  };

  const handleSimulateBuildUpdate = async (tenantId: string) => {
    try {
      const updated = await simulateLocalUpdate(tenantId);
      addToast(`Simulação de Auto-Update realizada! Instância local atualizada para v${updated.current_version}.`, "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch (error) {
      addToast("Erro ao simular processo de atualização local.", "error");
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center font-inter p-6 relative overflow-hidden">
        {/* Background Neon Elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 card border-primary/20 bg-dark-card/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 mb-6">
              <ShieldCheck size={36} weight="bold" className="text-white" />
            </div>
            <h1 className="text-2xl font-black font-outfit tracking-tight text-white">
              Backoffice Restrito
            </h1>
            <p className="text-dark-dim text-xs mt-2 leading-relaxed">
              Este console é exclusivo para os proprietários do FabricOS. Insira a senha administrativa para acessar.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-2">
                Senha Administrativa
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a chave admin..."
                className="input-field py-3 text-center tracking-widest text-lg font-bold"
              />
            </div>

            <button type="submit" className="w-full btn-primary py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
              <LockOpen size={16} weight="bold" />
              Autenticar Acesso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white p-8 font-inter">
      {/* Background Neon Elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Panel */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 border-b border-dark-border/40 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
              <HardDrives size={30} weight="bold" className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black font-outfit tracking-tight leading-none text-white">
                  FabricOS Central Backoffice
                </h1>
                <span className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Admin Panel
                </span>
              </div>
              <p className="text-dark-dim text-xs mt-2">
                Console de monitoramento e licenciamento comercial à distância.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadClients}
              className="btn-secondary py-2.5 px-4 font-bold flex items-center gap-2"
              disabled={loading}
            >
              <ArrowClockwise size={16} className={loading ? "animate-spin" : ""} />
              Sincronizar Cloud
            </button>
          </div>
        </header>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
              <ChartLineUp size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-dark-dim">Clientes Conectados</p>
              <h3 className="text-2xl font-black font-outfit mt-1">{clients.length}</h3>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 border border-success/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} className="text-success" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-dark-dim">Licenças Ativas</p>
              <h3 className="text-2xl font-black font-outfit mt-1">{clients.filter(c => !c.is_locked).length}</h3>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-center">
              <WarningCircle size={24} className="text-danger" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-dark-dim">Licenças Suspensas</p>
              <h3 className="text-2xl font-black font-outfit mt-1">{clients.filter(c => c.is_locked).length}</h3>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-xl flex items-center justify-center">
              <Sparkle size={24} className="text-warning" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-dark-dim">Controle de Módulos</p>
              <h3 className="text-2xl font-black font-outfit mt-1">3 Setores</h3>
            </div>
          </div>
        </div>

        {/* Clients list */}
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 card">
            <ArrowClockwise size={40} className="text-primary animate-spin mb-4" />
            <p className="text-dark-dim text-sm">Buscando instâncias registradas no servidor central...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 card text-center">
            <WarningCircle size={48} className="text-dark-dim mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Nenhuma instância cadastrada</h3>
            <p className="text-dark-dim text-sm max-w-md">
              Aguardando que as instâncias locais façam ping ou registrem-se inicialmente no backoffice.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {clients.map(client => (
              <div 
                key={client.tenant_id} 
                className={`card border-l-4 transition-all duration-300 relative overflow-hidden ${client.is_locked ? 'border-l-danger bg-[#160d10]' : 'border-l-success'}`}
              >
                
                {/* Upper row: Instance title and Lock Button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-dark-border/40 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {editingTenantId === client.tenant_id ? (
                        <div className="flex items-center gap-2 bg-[#0d0e15] border border-primary/40 rounded-lg px-2 py-1">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="bg-transparent border-none text-white text-sm font-bold focus:outline-none focus:ring-0 w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(client.tenant_id);
                              if (e.key === 'Escape') setEditingTenantId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveName(client.tenant_id)}
                            className="text-success hover:text-success/80 transition-colors p-1"
                            title="Salvar"
                          >
                            <Check size={16} weight="bold" />
                          </button>
                          <button
                            onClick={() => setEditingTenantId(null)}
                            className="text-danger hover:text-danger/80 transition-colors p-1"
                            title="Cancelar"
                          >
                            <X size={16} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h2 className="text-xl font-bold font-outfit text-white">
                            {client.client_name}
                          </h2>
                          <button
                            onClick={() => {
                              setEditingTenantId(client.tenant_id);
                              setEditNameValue(client.client_name);
                            }}
                            className="text-dark-dim hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1"
                            title="Editar nome"
                          >
                            <PencilSimpleLine size={16} weight="bold" />
                          </button>
                        </div>
                      )}
                      <span className="text-[9px] font-mono bg-dark-bg border border-dark-border px-2 py-0.5 rounded text-white/50">
                        UUID: {client.tenant_id}
                      </span>
                      {client.is_locked ? (
                        <span className="bg-danger/20 text-danger border border-danger/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                          Suspenso
                        </span>
                      ) : (
                        <span className="bg-success/20 text-success border border-success/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-dim mt-1.5">
                      Último ping de verificação criptográfica: <span className="text-white/80 font-semibold">{new Date(client.last_ping_at).toLocaleString()}</span>
                    </p>
                  </div>

                  {/* Kill-switch Toggle button */}
                  <button
                    onClick={() => handleToggleLock(client.tenant_id)}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${client.is_locked ? 'bg-success/20 border border-success/40 text-success shadow-lg shadow-success/5 hover:bg-success hover:text-white' : 'bg-danger/10 border border-danger/30 text-danger shadow-lg shadow-danger/5 hover:bg-danger hover:text-white'}`}
                  >
                    {client.is_locked ? (
                      <>
                        <LockOpen size={16} weight="bold" />
                        Reativar Instância (Ativar)
                      </>
                    ) : (
                      <>
                        <Lock size={16} weight="bold" />
                        Suspender à Distância (Kill-Switch)
                      </>
                    )}
                  </button>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Column 1: Active modules */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-dark-dim mb-4 flex items-center gap-2">
                      <span>1. Módulos Ativos (Licença)</span>
                    </h4>
                    <div className="space-y-3 bg-[#07080d]/40 p-4 border border-dark-border/40 rounded-xl">
                      {['producao', 'logistica', 'mobile'].map(mod => {
                        const isEnabled = client.enabled_modules.includes(mod);
                        return (
                          <button
                            key={mod}
                            onClick={() => handleToggleModule(client, mod)}
                            className="w-full flex items-center justify-between text-left p-2.5 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 transition-all text-xs font-semibold"
                          >
                            <span className="capitalize">{mod === 'producao' ? 'Produção' : mod === 'logistica' ? 'Logística' : 'Mobile / Celular'}</span>
                            <div className="flex items-center">
                              {isEnabled ? (
                                <CheckSquare size={20} className="text-primary" weight="fill" />
                              ) : (
                                <Square size={20} className="text-white/20" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: Update settings */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-dark-dim mb-4 flex items-center gap-2">
                      <span>2. Canal de Atualizações</span>
                    </h4>
                    <div className="space-y-4 bg-[#07080d]/40 p-4 border border-dark-border/40 rounded-xl h-full flex flex-col justify-between">
                      <div>
                        <label className="text-[10px] text-dark-dim uppercase font-bold tracking-wider block mb-2">Canal Distribuído</label>
                        <select
                          value={client.update_channel}
                          onChange={(e) => handleChangeChannel(client.tenant_id, e.target.value)}
                          className="input-field py-2 text-xs"
                        >
                          <option value="stable">Canal Estável (Produção)</option>
                          <option value="beta">Canal Beta (Homologação)</option>
                          <option value="dev">Canal Developer (Internal Test)</option>
                        </select>
                      </div>

                      <div className="border-t border-dark-border/50 pt-3 mt-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-dark-dim tracking-wider">Versão Local Instalada</p>
                          <p className="font-bold text-white/95 mt-0.5">v{client.current_version}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-dark-dim tracking-wider">Versão Disponível (Nuvem)</p>
                          <p className="font-bold text-primary mt-0.5">v{client.latest_version}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Local build simulator */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-dark-dim mb-4 flex items-center gap-2">
                      <span>3. Servidor Local (Auto-Updater)</span>
                    </h4>
                    <div className="space-y-4 bg-[#07080d]/40 p-4 border border-dark-border/40 rounded-xl h-full flex flex-col justify-between">
                      <p className="text-xs text-dark-dim leading-relaxed">
                        Pressione o botão abaixo para simular o comportamento físico da máquina do cliente recebendo o update compilado e executando a instalação local via updater silencioso.
                      </p>

                      <button
                        onClick={() => handleSimulateBuildUpdate(client.tenant_id)}
                        disabled={client.current_version === client.latest_version}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${client.current_version === client.latest_version ? 'bg-dark-border/10 border-dark-border/30 text-white/30 cursor-not-allowed' : 'bg-primary/20 hover:bg-primary text-white border-primary/30'}`}
                      >
                        <MonitorPlay size={16} />
                        Simular Processo de Auto-Update
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default BackofficeDashboard;
