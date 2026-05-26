import React, { useEffect, useState } from 'react';
import { Users, Plus, Phone, IdentificationCard, MapPin, Package, PencilSimple, Trash, MagnifyingGlass, EnvelopeSimple } from '@phosphor-icons/react';
import { getPartners, createPartner, updatePartner, deletePartner } from '../services/api';
import type { Partner } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const Partners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone_number: '',
    address: '',
    specialty: 'costura'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const data = await getPartners();
      setPartners(data);
    } catch (error) {
      console.error("Failed to load partners", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, newPartner);
        addToast("Parceiro atualizado com sucesso", "success");
      } else {
        await createPartner(newPartner);
        addToast("Parceiro cadastrado com sucesso", "success");
      }
      setIsModalOpen(false);
      setEditingPartner(null);
      setNewPartner({ name: '', contact_name: '', email: '', phone_number: '', address: '', specialty: 'costura' });
      loadData();
    } catch (error) {
      addToast(editingPartner ? "Erro ao atualizar parceiro" : "Erro ao cadastrar parceiro", "error");
    }
  };

  const handleDelete = async () => {
    if (!partnerToDelete) return;
    try {
      await deletePartner(partnerToDelete.id);
      addToast("Parceiro inativado com sucesso", "success");
      setIsDeleteOpen(false);
      setPartnerToDelete(null);
      loadData();
    } catch (error) {
      addToast("Erro ao excluir parceiro", "error");
    }
  };

  const openEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setNewPartner({
      name: partner.name,
      contact_name: partner.contact_name || '',
      email: partner.email || '',
      phone_number: partner.phone_number || '',
      address: partner.address || '',
      specialty: partner.specialty || 'costura'
    });
    setIsModalOpen(true);
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.contact_name && p.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Gestão de Faccionistas</h1>
          <p className="text-dark-dim">Administre suas oficinas e parceiros de produção</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
            <input 
              type="text" 
              placeholder="Buscar parceiros..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all w-64"
            />
          </div>
          <button 
            onClick={() => {
              setEditingPartner(null);
              setNewPartner({ name: '', contact_name: '', email: '', phone_number: '', address: '', specialty: 'costura' });
              setIsModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={20} weight="bold" />
            Novo Parceiro
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-dark-dim">Carregando parceiros...</p>
        ) : filteredPartners.length === 0 ? (
          <div className="col-span-full card flex flex-col items-center py-20 gap-4">
            <Users size={48} weight="thin" />
            <p className="text-dark-dim">Nenhum parceiro encontrado.</p>
          </div>
        ) : (
          filteredPartners.map(p => (
            <div key={p.id} className={`card transition-colors ${!p.is_active ? 'opacity-50 grayscale' : 'hover:border-primary/40'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 text-primary p-3 rounded-xl">
                  <Users size={24} weight="bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${p.is_active ? 'bg-success/10 text-success' : 'bg-dark-border/50 text-dark-dim'} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider`}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  
                  {p.is_active && (
                    <>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-dark-dim hover:text-primary transition-colors bg-white/5 rounded-lg">
                        <PencilSimple size={16} />
                      </button>
                      <button onClick={() => { setPartnerToDelete(p); setIsDeleteOpen(true); }} className="p-1.5 text-dark-dim hover:text-danger transition-colors bg-white/5 rounded-lg">
                        <Trash size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1">{p.name}</h3>
              <p className="text-dark-dim text-sm mb-4">{p.specialty?.toUpperCase()}</p>
              
              <div className="space-y-3 border-t border-dark-border pt-4">
                <div className="flex items-center gap-3 text-sm text-dark-dim">
                  <IdentificationCard size={18} />
                  <span>{p.contact_name || 'Sem contato'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-dark-dim">
                  <Phone size={18} />
                  <span>{p.phone_number || 'Sem telefone'}</span>
                </div>
                {p.email && (
                  <div className="flex items-center gap-3 text-sm text-dark-dim">
                    <EnvelopeSimple size={18} />
                    <span>{p.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-dark-dim">
                  <MapPin size={18} />
                  <span className="truncate">{p.address || 'Sem endereço'}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-dark-border flex gap-2">
                <button 
                  className="flex-1 text-[10px] bg-primary/10 text-primary py-2 rounded-lg hover:bg-primary/20 transition-all font-bold uppercase"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/portal/${p.portal_token}`;
                    const message = encodeURIComponent(`Olá ${p.name}, segue o link do seu Portal de Produção no FabricOS para acompanhamento: ${fullUrl}`);
                    window.open(`https://wa.me/${p.phone_number?.replace(/\D/g, '')}?text=${message}`, '_blank');
                  }}
                >
                  Enviar WhatsApp
                </button>
                <button 
                  className="flex-1 text-[10px] bg-white/5 py-2 rounded-lg hover:bg-white/10 transition-all font-bold uppercase"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/portal/${p.portal_token}`;
                    navigator.clipboard.writeText(fullUrl);
                    addToast("Link copiado para a área de transferência!", "info");
                  }}
                >
                  Copiar Link
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Parceiro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6 animate-scale-up">
            <h2 className="text-xl font-bold mb-6">{editingPartner ? 'Editar Parceiro' : 'Cadastrar Parceiro'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Razão Social / Nome Fantasia</label>
                <input 
                  type="text" required
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                  value={newPartner.name}
                  onChange={e => setNewPartner({...newPartner, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-dark-dim mb-1 block">Nome do Contato</label>
                <input 
                  type="text"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                  value={newPartner.contact_name}
                  onChange={e => setNewPartner({...newPartner, contact_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Telefone / WA</label>
                  <input 
                    type="text"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newPartner.phone_number}
                    onChange={e => setNewPartner({...newPartner, phone_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">E-mail</label>
                  <input 
                    type="email"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newPartner.email}
                    onChange={e => setNewPartner({...newPartner, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Especialidade</label>
                  <select 
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                    value={newPartner.specialty}
                    onChange={e => setNewPartner({...newPartner, specialty: e.target.value})}
                  >
                    <option value="costura">Costura</option>
                    <option value="bordado">Bordado</option>
                    <option value="estamparia">Estamparia</option>
                    <option value="acabamento">Acabamento</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary justify-center">{editingPartner ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Inativar Parceiro"
        message={`Tem certeza que deseja inativar o parceiro ${partnerToDelete?.name}? Ele não aparecerá mais em novas seleções.`}
        confirmText="Inativar"
      />
    </div>
  );
};

export default Partners;
