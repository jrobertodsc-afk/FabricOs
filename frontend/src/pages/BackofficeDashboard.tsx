import React, { useEffect, useState } from 'react';
import { 
  getBackofficeClients, 
  toggleClientLock, 
  updateClientLicense, 
  simulateLocalUpdate,
  backofficeLogin,
  createBackofficeClient,
  getClientUsers,
  createClientUser,
  updateClientUser,
  deleteClientUser,
} from '../services/api';
import type { BackofficeClient, BackofficeUser } from '../services/api';
import { 
  Lock, LockOpen, ArrowClockwise, HardDrives, 
  ShieldCheck, CheckSquare, Square,
  ChartLineUp, MonitorPlay, Sparkle, Tag, WarningCircle,
  PencilSimpleLine, Check, X, UserPlus, Users, Trash, 
  CurrencyDollar, Crown, Eye, EyeSlash, Plus, Key,
  CaretDown, CaretUp, CreditCard, Clock, Buildings
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';

// =====================================================================
//  CONSTANTES
// =====================================================================
const PLAN_LABELS: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  trial:        { name: "Trial",        color: "text-warning border-warning/30 bg-warning/10",  icon: <Clock size={12} /> },
  starter:      { name: "Starter",      color: "text-primary border-primary/30 bg-primary/10",  icon: <Sparkle size={12} /> },
  professional: { name: "Professional", color: "text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10", icon: <Crown size={12} /> },
  enterprise:   { name: "Enterprise",   color: "text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10", icon: <Buildings size={12} /> },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:        { label: "Pago",           color: "text-success bg-success/10 border-success/30" },
  trial:         { label: "Trial Ativo",    color: "text-warning bg-warning/10 border-warning/30" },
  overdue:       { label: "Inadimplente",   color: "text-danger bg-danger/10 border-danger/30" },
  trial_expired: { label: "Trial Expirado", color: "text-danger bg-danger/10 border-danger/30" },
  cancelled:     { label: "Cancelado",      color: "text-dark-dim bg-dark-bg border-dark-border" },
};

const MODULE_LABELS: Record<string, string> = {
  producao: "Produção",
  logistica: "Logística",
  mobile: "Mobile / Celular",
};

// =====================================================================
//  COMPONENTE PRINCIPAL
// =====================================================================
const BackofficeDashboard: React.FC = () => {
  const [clients, setClients] = useState<BackofficeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [password, setPassword] = useState("");
  const { addToast } = useToast();

  // Edição de nome
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  // Modal: Novo Cliente
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    client_name: "", admin_email: "", admin_password: "", admin_full_name: "", plan: "trial"
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Gestão de Usuários (expandido por tenant)
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers] = useState<Record<string, BackofficeUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  // Modal: Novo Usuário
  const [showNewUserModal, setShowNewUserModal] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "user" });

  // Modal: Reset Senha
  const [resetPasswordUser, setResetPasswordUser] = useState<{ tenantId: string; userId: string; name: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // =====================================================================
  //  HANDLERS
  // =====================================================================
  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getBackofficeClients();
      setClients(data);
      setAuthorized(true);
    } catch (error: any) {
      if (error?.response?.status === 401) setAuthorized(false);
      else addToast("Erro ao carregar dados do servidor de licenças.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('backoffice_admin_token');
    if (!token) { setAuthorized(false); setLoading(false); }
    else loadClients();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backofficeLogin(password);
      localStorage.setItem('backoffice_admin_token', password);
      await loadClients();
    } catch { addToast("Senha administrativa incorreta.", "error"); }
  };

  const handleSaveName = async (tenantId: string) => {
    if (!editNameValue.trim()) return;
    try {
      const updated = await updateClientLicense(tenantId, { client_name: editNameValue.trim() });
      addToast("Nome atualizado!", "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
      setEditingTenantId(null);
    } catch { addToast("Erro ao renomear cliente.", "error"); }
  };

  const handleToggleLock = async (tenantId: string) => {
    try {
      const updated = await toggleClientLock(tenantId);
      addToast(updated.is_locked ? "Instância suspensa!" : "Instância ativada!", updated.is_locked ? "info" : "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch { addToast("Erro ao alternar trava remota.", "error"); }
  };

  const handleToggleModule = async (client: BackofficeClient, moduleName: string) => {
    const nextModules = client.enabled_modules.includes(moduleName)
      ? client.enabled_modules.filter(m => m !== moduleName)
      : [...client.enabled_modules, moduleName];
    try {
      const updated = await updateClientLicense(client.tenant_id, { enabled_modules: nextModules });
      addToast("Módulos atualizados!", "success");
      setClients(prev => prev.map(c => c.tenant_id === client.tenant_id ? updated : c));
    } catch { addToast("Erro ao atualizar módulos.", "error"); }
  };

  const handleCreateClient = async () => {
    if (!newClient.client_name || !newClient.admin_email || !newClient.admin_password || !newClient.admin_full_name) {
      addToast("Preencha todos os campos.", "error"); return;
    }
    setCreatingClient(true);
    try {
      await createBackofficeClient(newClient);
      addToast(`Cliente '${newClient.client_name}' criado com sucesso!`, "success");
      setShowNewClientModal(false);
      setNewClient({ client_name: "", admin_email: "", admin_password: "", admin_full_name: "", plan: "trial" });
      await loadClients();
    } catch (error: any) {
      addToast(error?.response?.data?.detail || "Erro ao criar cliente.", "error");
    } finally { setCreatingClient(false); }
  };

  const handleLoadUsers = async (tenantId: string) => {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    setExpandedTenant(tenantId);
    setLoadingUsers(tenantId);
    try {
      const users = await getClientUsers(tenantId);
      setTenantUsers(prev => ({ ...prev, [tenantId]: users }));
    } catch { addToast("Erro ao carregar usuários.", "error"); }
    finally { setLoadingUsers(null); }
  };

  const handleCreateUser = async (tenantId: string) => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      addToast("Preencha todos os campos.", "error"); return;
    }
    try {
      await createClientUser(tenantId, newUser);
      addToast(`Usuário '${newUser.full_name}' criado!`, "success");
      setShowNewUserModal(null);
      setNewUser({ email: "", password: "", full_name: "", role: "user" });
      const users = await getClientUsers(tenantId);
      setTenantUsers(prev => ({ ...prev, [tenantId]: users }));
    } catch (error: any) {
      addToast(error?.response?.data?.detail || "Erro ao criar usuário.", "error");
    }
  };

  const handleDeleteUser = async (tenantId: string, userId: string, userName: string) => {
    if (!confirm(`Remover o usuário '${userName}'? Esta ação é irreversível.`)) return;
    try {
      await deleteClientUser(tenantId, userId);
      addToast(`Usuário '${userName}' removido!`, "success");
      setTenantUsers(prev => ({
        ...prev,
        [tenantId]: prev[tenantId]?.filter(u => u.id !== userId) || []
      }));
    } catch { addToast("Erro ao remover usuário.", "error"); }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPasswordValue) return;
    try {
      await updateClientUser(resetPasswordUser.tenantId, resetPasswordUser.userId, { new_password: newPasswordValue });
      addToast(`Senha de '${resetPasswordUser.name}' redefinida!`, "success");
      setResetPasswordUser(null);
      setNewPasswordValue("");
    } catch { addToast("Erro ao redefinir senha.", "error"); }
  };

  const handleChangePaymentStatus = async (tenantId: string, newStatus: string) => {
    try {
      const updated = await updateClientLicense(tenantId, { payment_status: newStatus });
      addToast(`Status financeiro atualizado!`, "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch { addToast("Erro ao atualizar status.", "error"); }
  };

  const handleChangePlan = async (tenantId: string, plan: string) => {
    try {
      const updated = await updateClientLicense(tenantId, { plan });
      addToast(`Plano alterado para ${PLAN_LABELS[plan]?.name || plan}!`, "success");
      setClients(prev => prev.map(c => c.tenant_id === tenantId ? updated : c));
    } catch { addToast("Erro ao alterar plano.", "error"); }
  };

  // =====================================================================
  //  TELA DE LOGIN
  // =====================================================================
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center font-inter p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-md w-full relative z-10 card border-primary/20 bg-dark-card/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 mb-6">
              <ShieldCheck size={36} weight="bold" className="text-white" />
            </div>
            <h1 className="text-2xl font-black font-outfit tracking-tight text-white">Backoffice Restrito</h1>
            <p className="text-dark-dim text-xs mt-2">Este console é exclusivo para os proprietários do FabricOS.</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-2">Senha Administrativa</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a chave admin..." className="input-field py-3 text-center tracking-widest text-lg font-bold" />
            </div>
            <button type="submit" className="w-full btn-primary py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
              <LockOpen size={16} weight="bold" /> Autenticar Acesso
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =====================================================================
  //  DASHBOARD PRINCIPAL
  // =====================================================================
  const activeClients = clients.filter(c => !c.is_locked);
  const lockedClients = clients.filter(c => c.is_locked);
  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthly_price || 0), 0);

  return (
    <div className="min-h-screen bg-[#07080d] text-white p-4 md:p-8 font-inter">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-dark-border/40 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
              <HardDrives size={30} weight="bold" className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black font-outfit tracking-tight leading-none text-white">FabricOS Central</h1>
                <span className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">SaaS</span>
              </div>
              <p className="text-dark-dim text-xs mt-1">Plataforma de licenciamento, usuários e controle comercial.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewClientModal(true)} className="btn-primary py-2.5 px-5 font-bold flex items-center gap-2 text-xs">
              <Plus size={16} weight="bold" /> Novo Cliente
            </button>
            <button onClick={loadClients} className="btn-secondary py-2.5 px-4 font-bold flex items-center gap-2" disabled={loading}>
              <ArrowClockwise size={16} className={loading ? "animate-spin" : ""} /> Sincronizar
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center"><ChartLineUp size={20} className="text-primary" /></div>
            <div><p className="text-[9px] uppercase font-black tracking-widest text-dark-dim">Clientes</p><h3 className="text-xl font-black font-outfit">{clients.length}</h3></div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 border border-success/20 rounded-xl flex items-center justify-center"><ShieldCheck size={20} className="text-success" /></div>
            <div><p className="text-[9px] uppercase font-black tracking-widest text-dark-dim">Ativos</p><h3 className="text-xl font-black font-outfit">{activeClients.length}</h3></div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-center"><WarningCircle size={20} className="text-danger" /></div>
            <div><p className="text-[9px] uppercase font-black tracking-widest text-dark-dim">Suspensos</p><h3 className="text-xl font-black font-outfit">{lockedClients.length}</h3></div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-[#22d3ee]/10 border border-[#22d3ee]/20 rounded-xl flex items-center justify-center"><CurrencyDollar size={20} className="text-[#22d3ee]" /></div>
            <div><p className="text-[9px] uppercase font-black tracking-widest text-dark-dim">MRR</p><h3 className="text-xl font-black font-outfit">R$ {totalRevenue.toLocaleString('pt-BR')}</h3></div>
          </div>
        </div>

        {/* Client Cards */}
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 card">
            <ArrowClockwise size={40} className="text-primary animate-spin mb-4" />
            <p className="text-dark-dim text-sm">Buscando instâncias registradas...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 card text-center">
            <Buildings size={48} className="text-dark-dim mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-dark-dim text-sm max-w-md mb-6">Clique em "Novo Cliente" para cadastrar seu primeiro cliente e começar a vender licenças.</p>
            <button onClick={() => setShowNewClientModal(true)} className="btn-primary py-2.5 px-6 font-bold flex items-center gap-2 text-xs">
              <Plus size={16} weight="bold" /> Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {clients.map(client => {
              const planInfo = PLAN_LABELS[client.plan || "starter"];
              const paymentInfo = PAYMENT_STATUS_LABELS[client.payment_status || "active"];
              const isExpanded = expandedTenant === client.tenant_id;
              const users = tenantUsers[client.tenant_id] || [];

              return (
                <div key={client.tenant_id} className={`card border-l-4 transition-all duration-300 relative overflow-hidden ${client.is_locked ? 'border-l-danger bg-[#160d10]' : 'border-l-success'}`}>
                  
                  {/* Row 1: Title + Status + Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-dark-border/40 pb-5 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Editable Name */}
                        {editingTenantId === client.tenant_id ? (
                          <div className="flex items-center gap-2 bg-[#0d0e15] border border-primary/40 rounded-lg px-2 py-1">
                            <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                              className="bg-transparent border-none text-white text-sm font-bold focus:outline-none w-48" autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(client.tenant_id); if (e.key === 'Escape') setEditingTenantId(null); }} />
                            <button onClick={() => handleSaveName(client.tenant_id)} className="text-success hover:text-success/80 p-1"><Check size={16} weight="bold" /></button>
                            <button onClick={() => setEditingTenantId(null)} className="text-danger hover:text-danger/80 p-1"><X size={16} weight="bold" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <h2 className="text-lg font-bold font-outfit text-white truncate">{client.client_name}</h2>
                            <button onClick={() => { setEditingTenantId(client.tenant_id); setEditNameValue(client.client_name); }}
                              className="text-dark-dim hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                              <PencilSimpleLine size={14} weight="bold" />
                            </button>
                          </div>
                        )}
                        {/* Plan Badge */}
                        {planInfo && (
                          <span className={`${planInfo.color} text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1`}>
                            {planInfo.icon} {planInfo.name}
                          </span>
                        )}
                        {/* Payment Badge */}
                        {paymentInfo && (
                          <span className={`${paymentInfo.color} text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1`}>
                            <CreditCard size={10} /> {paymentInfo.label}
                          </span>
                        )}
                        {/* Lock Status */}
                        {client.is_locked ? (
                          <span className="bg-danger/20 text-danger border border-danger/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger"></span> Suspenso
                          </span>
                        ) : (
                          <span className="bg-success/20 text-success border border-success/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Ativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-dark-dim">
                        <span className="font-mono">UUID: {client.tenant_id.substring(0, 8)}...</span>
                        {client.monthly_price !== undefined && <span>R$ {client.monthly_price}/mês</span>}
                        {client.next_billing_date && <span>Venc: {new Date(client.next_billing_date).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleLoadUsers(client.tenant_id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
                        <Users size={14} /> Usuários {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                      </button>
                      <button onClick={() => handleToggleLock(client.tenant_id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${client.is_locked ? 'bg-success/10 border border-success/20 text-success hover:bg-success/20' : 'bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20'}`}>
                        {client.is_locked ? <><LockOpen size={14} /> Ativar</> : <><Lock size={14} /> Suspender</>}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Controls Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Col 1: Módulos */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-dark-dim mb-3">Módulos da Licença</h4>
                      <div className="space-y-2 bg-[#07080d]/40 p-3 border border-dark-border/40 rounded-xl">
                        {['producao', 'logistica', 'mobile'].map(mod => (
                          <button key={mod} onClick={() => handleToggleModule(client, mod)}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-xs font-semibold">
                            <span>{MODULE_LABELS[mod]}</span>
                            {client.enabled_modules.includes(mod)
                              ? <CheckSquare size={18} className="text-primary" weight="fill" />
                              : <Square size={18} className="text-white/20" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Plano & Financeiro */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-dark-dim mb-3">Plano & Financeiro</h4>
                      <div className="space-y-3 bg-[#07080d]/40 p-3 border border-dark-border/40 rounded-xl">
                        <div>
                          <label className="text-[9px] text-dark-dim uppercase font-bold tracking-wider block mb-1">Plano Ativo</label>
                          <select value={client.plan || "starter"} onChange={(e) => handleChangePlan(client.tenant_id, e.target.value)}
                            className="input-field py-1.5 text-xs">
                            <option value="trial">Trial Gratuito (15 dias)</option>
                            <option value="starter">Starter — R$ 197/mês</option>
                            <option value="professional">Professional — R$ 397/mês</option>
                            <option value="enterprise">Enterprise — R$ 697/mês</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-dark-dim uppercase font-bold tracking-wider block mb-1">Status Financeiro</label>
                          <select value={client.payment_status || "active"} onChange={(e) => handleChangePaymentStatus(client.tenant_id, e.target.value)}
                            className="input-field py-1.5 text-xs">
                            <option value="active">✅ Pago / Ativo</option>
                            <option value="trial">⏳ Trial Ativo</option>
                            <option value="overdue">🚫 Inadimplente (Bloqueia)</option>
                            <option value="cancelled">❌ Cancelado</option>
                          </select>
                        </div>
                        
                        {client.plan === 'trial' && (
                          <div className="pt-2 border-t border-dark-border/30">
                            <button 
                              onClick={() => {
                                if (confirm("Deseja estender o trial deste cliente por mais 15 dias?")) {
                                  const currentEndsAt = client.trial_ends_at ? new Date(client.trial_ends_at) : new Date();
                                  currentEndsAt.setDate(currentEndsAt.getDate() + 15);
                                  
                                  updateClientLicense(client.tenant_id, { 
                                    trial_ends_at: currentEndsAt.toISOString() 
                                  }).then(u => {
                                    setClients(prev => prev.map(c => c.tenant_id === client.tenant_id ? u : c));
                                    alert("Trial estendido com sucesso para " + currentEndsAt.toLocaleDateString('pt-BR') + "!");
                                  }).catch(e => {
                                    console.error(e);
                                    alert("Erro ao estender trial.");
                                  });
                                }
                              }}
                              className="w-full text-center text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 py-1.5 rounded-lg hover:bg-primary/20 transition-all">
                              Estender Trial (+15 dias)
                            </button>
                            {client.trial_ends_at && (
                              <p className="text-center text-[9px] text-dark-dim mt-1.5">
                                Vence em: {new Date(client.trial_ends_at).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Col 3: Canal de Atualizações */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-dark-dim mb-3">Atualizações & Versão</h4>
                      <div className="space-y-3 bg-[#07080d]/40 p-3 border border-dark-border/40 rounded-xl">
                        <div>
                          <label className="text-[9px] text-dark-dim uppercase font-bold tracking-wider block mb-1">Canal</label>
                          <select value={client.update_channel} onChange={(e) => updateClientLicense(client.tenant_id, { update_channel: e.target.value }).then(u => setClients(prev => prev.map(c => c.tenant_id === client.tenant_id ? u : c)))}
                            className="input-field py-1.5 text-xs">
                            <option value="stable">Estável (Produção)</option>
                            <option value="beta">Beta (Homologação)</option>
                            <option value="dev">Developer (Teste)</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-dark-border/30">
                          <div><p className="text-[9px] text-dark-dim uppercase font-bold">Local</p><p className="font-bold text-white/80 text-xs">v{client.current_version}</p></div>
                          <div className="text-right"><p className="text-[9px] text-dark-dim uppercase font-bold">Nuvem</p><p className="font-bold text-primary text-xs">v{client.latest_version}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable: User Management */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-dark-border/40">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                          <Users size={16} className="text-primary" /> Usuários de {client.client_name}
                        </h4>
                        <button onClick={() => { setShowNewUserModal(client.tenant_id); setNewUser({ email: "", password: "", full_name: "", role: "user" }); }}
                          className="btn-primary py-1.5 px-3 text-[10px] font-bold flex items-center gap-1">
                          <UserPlus size={14} /> Novo Usuário
                        </button>
                      </div>

                      {loadingUsers === client.tenant_id ? (
                        <div className="flex items-center justify-center py-8"><ArrowClockwise size={24} className="text-primary animate-spin" /></div>
                      ) : users.length === 0 ? (
                        <p className="text-dark-dim text-xs text-center py-6">Nenhum usuário encontrado neste tenant.</p>
                      ) : (
                        <div className="grid gap-2">
                          {users.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-[#07080d]/60 border border-dark-border/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black">
                                  {user.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{user.full_name}</p>
                                  <p className="text-[10px] text-dark-dim">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${user.role === 'admin' ? 'text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10' : user.role === 'manager' ? 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10' : 'text-dark-dim border-dark-border bg-dark-bg'}`}>
                                  {user.role}
                                </span>
                                <button onClick={() => { setResetPasswordUser({ tenantId: client.tenant_id, userId: user.id, name: user.full_name }); setNewPasswordValue(""); }}
                                  className="text-warning hover:text-warning/80 p-1" title="Resetar Senha"><Key size={14} /></button>
                                <button onClick={() => handleDeleteUser(client.tenant_id, user.id, user.full_name)}
                                  className="text-danger hover:text-danger/80 p-1" title="Remover"><Trash size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/*  MODAL: NOVO CLIENTE                                          */}
      {/* ============================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full p-6 rounded-2xl border border-primary/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black font-outfit text-white flex items-center gap-2"><Buildings size={22} className="text-primary" /> Novo Cliente</h3>
              <button onClick={() => setShowNewClientModal(false)} className="text-dark-dim hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Nome da Empresa</label>
                <input type="text" value={newClient.client_name} onChange={(e) => setNewClient(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Ex: Confecções Silva LTDA" className="input-field py-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Nome do Admin</label>
                  <input type="text" value={newClient.admin_full_name} onChange={(e) => setNewClient(prev => ({ ...prev, admin_full_name: e.target.value }))}
                    placeholder="João Silva" className="input-field py-2.5" />
                </div>
                <div>
                  <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Plano</label>
                  <select value={newClient.plan} onChange={(e) => setNewClient(prev => ({ ...prev, plan: e.target.value }))} className="input-field py-2.5">
                    <option value="trial">🆓 Trial (15 dias grátis)</option>
                    <option value="starter">⭐ Starter — R$ 197/mês</option>
                    <option value="professional">💎 Professional — R$ 397/mês</option>
                    <option value="enterprise">🏆 Enterprise — R$ 697/mês</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">E-mail de Acesso</label>
                <input type="email" value={newClient.admin_email} onChange={(e) => setNewClient(prev => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="admin@empresa.com" className="input-field py-2.5" />
              </div>
              <div>
                <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Senha Inicial</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={newClient.admin_password}
                    onChange={(e) => setNewClient(prev => ({ ...prev, admin_password: e.target.value }))}
                    placeholder="Senha forte..." className="input-field py-2.5 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-dim hover:text-white">
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewClientModal(false)} className="btn-secondary flex-1 py-2.5 font-bold text-xs">Cancelar</button>
              <button onClick={handleCreateClient} disabled={creatingClient}
                className="btn-primary flex-1 py-2.5 font-bold text-xs flex items-center justify-center gap-2">
                {creatingClient ? <ArrowClockwise size={16} className="animate-spin" /> : <Plus size={16} />}
                {creatingClient ? "Criando..." : "Criar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  MODAL: NOVO USUÁRIO                                          */}
      {/* ============================================================= */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-6 rounded-2xl border border-primary/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black font-outfit text-white flex items-center gap-2"><UserPlus size={22} className="text-primary" /> Novo Usuário</h3>
              <button onClick={() => setShowNewUserModal(null)} className="text-dark-dim hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Nome Completo</label>
                <input type="text" value={newUser.full_name} onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Maria Silva" className="input-field py-2.5" />
              </div>
              <div>
                <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">E-mail</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@empresa.com" className="input-field py-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Senha</label>
                  <input type="text" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha..." className="input-field py-2.5" />
                </div>
                <div>
                  <label className="text-[10px] text-dark-dim uppercase font-black tracking-widest block mb-1">Cargo</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="input-field py-2.5">
                    <option value="admin">Admin</option>
                    <option value="manager">Gerente</option>
                    <option value="user">Operador</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewUserModal(null)} className="btn-secondary flex-1 py-2.5 font-bold text-xs">Cancelar</button>
              <button onClick={() => handleCreateUser(showNewUserModal)} className="btn-primary flex-1 py-2.5 font-bold text-xs flex items-center justify-center gap-2">
                <UserPlus size={16} /> Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  MODAL: RESETAR SENHA                                         */}
      {/* ============================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full p-6 rounded-2xl border border-warning/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black font-outfit text-white flex items-center gap-2"><Key size={22} className="text-warning" /> Resetar Senha</h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-dark-dim hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-dark-dim mb-4">Definir nova senha para <span className="text-white font-bold">{resetPasswordUser.name}</span></p>
            <input type="text" value={newPasswordValue} onChange={(e) => setNewPasswordValue(e.target.value)}
              placeholder="Nova senha..." className="input-field py-2.5 mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setResetPasswordUser(null)} className="btn-secondary flex-1 py-2.5 font-bold text-xs">Cancelar</button>
              <button onClick={handleResetPassword} className="btn-primary flex-1 py-2.5 font-bold text-xs flex items-center justify-center gap-2">
                <Check size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackofficeDashboard;
