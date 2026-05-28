import React, { useEffect, useState } from 'react';
import { Tag, Plus, PencilSimple, CheckCircle, WarningCircle, Eye, Image, ArrowsClockwise, ArrowSquareOut, Notebook, MagnifyingGlass } from '@phosphor-icons/react';
import { getPilotageCards, createPilotageCard, updatePilotageCard, sendPilotageToAcervo, uploadImage, API_BASE_URL, getIntegrationSettings } from '../services/api';
import type { PilotageCard } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const getFullPhotoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};


const Pilotage: React.FC = () => {
  const [cards, setCards] = useState<PilotageCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [trelloUrl, setTrelloUrl] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<PilotageCard | null>(null);
  
  // Image uploading
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    model_name: '',
    raw_material: '',
    family: '',
    pilot_name: '',
    patternmaker_name: '',
    size: 'M',
    status: 'em_ajuste',
    notes: '',
    photo_url: ''
  });

  const { addToast } = useToast();

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await getPilotageCards();
      setCards(data);
    } catch (error) {
      console.error("Failed to load pilotage cards", error);
      addToast("Erro ao carregar fichas de pilotagem", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    loadTrelloSettings();
  }, []);

  const loadTrelloSettings = async () => {
    try {
      const settings = await getIntegrationSettings();
      if (settings && settings.board_url) {
        setTrelloUrl(settings.board_url);
      } else {
        setTrelloUrl('https://trello.com');
      }
    } catch (error) {
      setTrelloUrl('https://trello.com');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await uploadImage(file);
      setFormData(prev => ({
        ...prev,
        photo_url: res.url
      }));
      addToast("Foto anexada com sucesso", "success");
    } catch (error) {
      console.error("Image upload failed", error);
      addToast("Erro ao fazer upload da imagem", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeCard) {
        // Update
        await updatePilotageCard(activeCard.id, formData);
        addToast("Ficha de Pilotagem atualizada com sucesso", "success");
      } else {
        // Create
        await createPilotageCard(formData);
        addToast("Ficha de Pilotagem criada com sucesso", "success");
      }
      setIsModalOpen(false);
      resetForm();
      loadCards();
    } catch (error) {
      console.error("Failed to save pilotage card", error);
      addToast("Erro ao salvar Ficha de Pilotagem", "error");
    }
  };

  const handleSendToAcervo = async (card: PilotageCard) => {
    try {
      await sendPilotageToAcervo(card.id);
      addToast(`Peça piloto '${card.model_name}' enviada ao Estoque de Acervo!`, "success");
      loadCards();
    } catch (error: any) {
      console.error("Failed to send to acervo", error);
      addToast(error.response?.data?.detail || "Erro ao enviar ao acervo", "error");
    }
  };

  const openCreate = () => {
    setActiveCard(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (card: PilotageCard) => {
    setActiveCard(card);
    setFormData({
      model_name: card.model_name,
      raw_material: card.raw_material,
      family: card.family,
      pilot_name: card.pilot_name,
      patternmaker_name: card.patternmaker_name,
      size: card.size,
      status: card.status,
      notes: card.notes || '',
      photo_url: card.photo_url || ''
    });
    setIsModalOpen(true);
  };

  const openNotes = (card: PilotageCard) => {
    setActiveCard(card);
    setIsNotesModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      model_name: '',
      raw_material: '',
      family: '',
      pilot_name: '',
      patternmaker_name: '',
      size: 'M',
      status: 'em_ajuste',
      notes: '',
      photo_url: ''
    });
  };

  const filteredCards = cards.filter(card => {
    const matchesStatus = statusFilter ? card.status === statusFilter : true;
    const matchesSearch = 
      card.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.pilot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.patternmaker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.family.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'reprovado': return 'Ajustar / Reprovado';
      default: return 'Em Ajuste';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-success/15 border-success text-success';
      case 'reprovado': return 'bg-danger/15 border-danger text-danger';
      default: return 'bg-warning/15 border-warning text-warning';
    }
  };

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-10 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Fichas de Pilotagem BOAH</h1>
          <p className="text-dark-dim text-sm">Controle de qualidade, ajustes e catalogação de peças piloto da marca.</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-xl py-2 px-4 text-xs focus:outline-none focus:border-primary text-dark-dim"
          >
            <option value="">Todos os Status</option>
            <option value="em_ajuste">Em Ajuste</option>
            <option value="aprovado">Aprovados</option>
            <option value="reprovado">Reprovados</option>
          </select>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
            <input 
              type="text" 
              placeholder="Buscar modelo, pilotista..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all w-64"
            />
          </div>

          <button 
            onClick={() => window.open(trelloUrl, '_blank')} 
            className="btn-secondary py-2"
          >
            <ArrowSquareOut size={18} weight="thin" />
            Abrir Trello
          </button>
          
          <button 
            onClick={openCreate} 
            className="btn-primary py-2"
          >
            <Plus size={18} weight="thin" />
            Nova Ficha Pilotagem
          </button>
        </div>
      </header>

      {/* Grid containing the BOAH tags */}
      <div className="flex-1 overflow-y-auto overflow-x-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="p-20 text-center text-dark-dim flex flex-col items-center justify-center gap-4">
            <ArrowsClockwise className="animate-spin text-primary" size={32} />
            <p>Carregando fichas de pilotagem...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="card col-span-full flex flex-col items-center py-20 gap-4">
            <Tag size={48} weight="thin" className="text-dark-dim/50" />
            <p className="text-dark-dim text-sm">Nenhuma Ficha de Pilotagem BOAH encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredCards.map(card => (
              <div 
                key={card.id} 
                className="bg-white text-dark-bg rounded-xl shadow-2xl relative flex flex-col border-[3px] border-double border-dark-bg/25 overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  minHeight: '440px',
                  backgroundImage: 'radial-gradient(#1f2230 0.5px, transparent 0.5px), radial-gradient(#1f2230 0.5px, #fdfdfd 0.5px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 10px 10px'
                }}
              >
                {/* Physical Tag Ring Attachment */}
                <div className="flex justify-center pt-3 pb-1 relative z-10 flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-white border border-dark-bg/20 shadow-inner flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#111] shadow-md"></div>
                  </div>
                  <div className="absolute top-0 w-[2px] h-3 bg-neutral-400"></div>
                </div>

                {/* Card Title Label (Bold header requested) */}
                <div className="text-center font-outfit uppercase tracking-[0.2em] font-black text-lg border-b border-dark-bg/15 pb-2 mx-6 text-neutral-800">
                  BOAH PILOTAGEM
                </div>

                {/* Card Main Body */}
                <div className="p-5 flex-1 flex flex-col gap-4 text-xs font-mono text-neutral-800">
                  {/* Photo Display if exists */}
                  {card.photo_url ? (
                    <div className="w-full h-32 rounded-lg border border-dark-bg/15 overflow-hidden relative group">
                      <img src={getFullPhotoUrl(card.photo_url)} alt={card.model_name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={getFullPhotoUrl(card.photo_url)} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-dark-bg hover:scale-110 transition-transform">
                          <Eye size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-12 border border-dashed border-dark-bg/20 rounded-lg flex items-center justify-center text-neutral-400 gap-1 bg-white/[0.2]">
                      <Image size={16} />
                      <span>Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Grid Fields representing physical writing cells */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 border border-dark-bg/10 p-3 rounded bg-white/40">
                    <div className="col-span-2 border-b border-dark-bg/5 pb-1">
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Modelo</span>
                      <span className="font-bold text-sm tracking-tight text-neutral-900">{card.model_name}</span>
                    </div>

                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Matéria Prima</span>
                      <span className="font-bold text-neutral-900 truncate block">{card.raw_material}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Tamanho</span>
                      <span className="font-black text-neutral-900 text-sm">{card.size}</span>
                    </div>

                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Família</span>
                      <span className="font-bold text-neutral-900 truncate block">{card.family}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Data Ficha</span>
                      <span className="font-bold text-neutral-900">
                        {new Date(card.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Pilotista</span>
                      <span className="font-bold text-neutral-950 block truncate">{card.pilot_name}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-black text-neutral-500 tracking-wider">Modelista</span>
                      <span className="font-bold text-neutral-950 block truncate">{card.patternmaker_name}</span>
                    </div>
                  </div>

                  {/* Status & Sync Stamp style layout */}
                  <div className="flex justify-between items-center mt-auto flex-shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Status</span>
                      <div className="tag-neutral border-dashed flex items-center gap-1.5 px-2 py-1 uppercase text-[10px] tracking-widest font-bold">
                        <div className={`w-1.5 h-1.5 rounded-full ${card.status === 'aprovado' ? 'bg-success' : card.status === 'reprovado' ? 'bg-danger' : 'bg-warning'}`}></div>
                        {getStatusLabel(card.status)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {card.notes && (
                        <button 
                          onClick={() => openNotes(card)}
                          className="p-1.5 border border-dark-bg/15 hover:bg-neutral-100 rounded text-neutral-600 transition-all active:scale-95"
                          title="Ver Ajustes/Notas"
                        >
                          <Notebook size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => openEdit(card)}
                        className="p-1.5 border border-dark-bg/15 hover:bg-neutral-100 rounded text-neutral-700 transition-all active:scale-95"
                        title="Editar Tag"
                      >
                        <PencilSimple size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Foot Action: Send to Acervo (if Approved and not yet cataloged) */}
                {card.status === 'aprovado' && (
                  <div className="mt-auto border-t border-dashed border-dark-bg/15 flex-shrink-0">
                    {card.sent_to_acervo ? (
                      <div className="w-full py-2 bg-success text-white text-[10px] font-black uppercase text-center tracking-widest flex items-center justify-center gap-1">
                        <CheckCircle size={14} weight="bold" />
                        No Estoque de Acervo
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendToAcervo(card)}
                        className="w-full py-2.5 bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-all tracking-wide flex items-center justify-center gap-1.5"
                      >
                        <ArrowSquareOut size={16} />
                        Enviar para Acervo
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE/EDIT CARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-lg rounded-2xl p-6 h-[90vh] flex flex-col animate-scale-up">
            <h2 className="text-xl font-bold mb-1 font-outfit">
              {activeCard ? 'Editar Ficha BOAH' : 'Nova Ficha de Pilotagem BOAH'}
            </h2>
            <p className="text-xs text-dark-dim mb-6">Preencha os dados da etiqueta física.</p>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto overflow-x-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Nome do Modelo</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Saia Envelope"
                    value={formData.model_name}
                    onChange={e => setFormData({...formData, model_name: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Matéria Prima / Tecido</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Linho Misto"
                    value={formData.raw_material}
                    onChange={e => setFormData({...formData, raw_material: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Família</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Casual"
                    value={formData.family}
                    onChange={e => setFormData({...formData, family: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Tamanho Piloto</label>
                  <select
                    value={formData.size}
                    onChange={e => setFormData({...formData, size: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  >
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="U">U (Tamanho Único)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  >
                    <option value="em_ajuste">Em Ajuste</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado / Ajustar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Pilotista Responsável</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Maria José"
                    value={formData.pilot_name}
                    onChange={e => setFormData({...formData, pilot_name: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-dim mb-1 block">Modelista Responsável</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Solange"
                    value={formData.patternmaker_name}
                    onChange={e => setFormData({...formData, patternmaker_name: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>

              {/* Photo upload section */}
              <div className="border border-dark-border/40 rounded-xl p-4 bg-white/[0.01]">
                <label className="text-xs text-dark-dim mb-2 block">Foto da Peça Piloto</label>
                <div className="flex gap-4 items-center">
                  {formData.photo_url ? (
                    <div className="w-16 h-16 rounded border border-dark-border overflow-hidden relative">
                      <img src={getFullPhotoUrl(formData.photo_url)} alt="Piloto Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, photo_url: ''})}
                        className="absolute inset-0 bg-red-600/70 text-white font-bold text-[9px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border border-dashed border-dark-border flex items-center justify-center text-dark-dim">
                      <Image size={24} weight="thin" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="pilot-pic-upload"
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label 
                      htmlFor="pilot-pic-upload"
                      className="px-4 py-2 border border-dark-border hover:bg-white/5 rounded-xl cursor-pointer text-xs font-bold text-white transition-all flex items-center gap-1.5 w-fit"
                    >
                      <Image size={16} />
                      {uploadingImage ? 'Enviando...' : 'Anexar Foto da Peça'}
                    </label>
                    <p className="text-[10px] text-dark-dim mt-1.5">Arquivos PNG ou JPG suportados.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-dark-dim mb-1 block">Observações / Ajustes Finais</label>
                <textarea
                  placeholder="Descreva detalhes específicos de caimento, alterações de molde solicitadas ou notas de aviamentos..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none h-20 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-6 sticky bottom-0 bg-dark-card pb-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5 transition-all text-sm font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary justify-center text-sm"
                >
                  {activeCard ? 'Salvar Alterações' : 'Criar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW NOTES MODAL */}
      {isNotesModalOpen && activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6 animate-scale-up">
            <div className="flex items-center gap-2 mb-4 text-warning">
              <WarningCircle size={24} weight="bold" />
              <h2 className="text-lg font-bold font-outfit text-white">Notas de Modelagem / Ajustes</h2>
            </div>
            
            <div className="p-4 rounded-xl border border-dark-border bg-white/[0.01] mb-6 text-sm text-white/90 font-mono leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto overflow-x-auto">
              {activeCard.notes || 'Sem observações cadastradas para esta peça piloto.'}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => {
                  setIsNotesModalOpen(false);
                  setActiveCard(null);
                }} 
                className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all"
              >
                Fechar Notas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pilotage;
