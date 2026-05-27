import React, { useState } from 'react';
import { ChatCircleDots, X, PaperPlaneRight, Bug, Lightbulb, Question } from '@phosphor-icons/react';
import { sendFeedback } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('erro');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('fabricos_user_email') || 'desconhecido';
      const userName = localStorage.getItem('fabricos_user_name') || 'Desconhecido';

      await sendFeedback({
        type,
        message,
        user_email: userEmail,
        user_name: userName
      });
      addToast("Mensagem enviada com sucesso! Nossa equipe foi notificada.", "success");
      setIsOpen(false);
      setMessage('');
    } catch (error) {
      addToast("Erro ao enviar mensagem. Tente novamente mais tarde.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20 flex items-center justify-center transition-transform hover:scale-110 z-50 group"
        title="Ajuda e Suporte"
      >
        <ChatCircleDots size={28} weight="fill" />
        <span className="absolute right-16 bg-dark-card border border-dark-border px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Precisa de Ajuda?
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[340px] bg-dark-card border border-dark-border shadow-2xl shadow-black/50 rounded-2xl z-50 overflow-hidden flex flex-col font-inter animate-fade-in-up">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <ChatCircleDots size={20} weight="fill" />
            Suporte e Feedback
          </h3>
          <p className="text-[10px] text-white/80 mt-0.5">Fale diretamente com os desenvolvedores</p>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-dark-dim tracking-wider mb-2 block">
            Qual o motivo do contato?
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('erro')}
              className={`py-2 flex flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-bold transition-all ${
                type === 'erro' 
                  ? 'bg-danger/10 border-danger/40 text-danger' 
                  : 'bg-dark-bg border-dark-border text-dark-dim hover:bg-white/5'
              }`}
            >
              <Bug size={18} /> Erro
            </button>
            <button
              type="button"
              onClick={() => setType('sugestao')}
              className={`py-2 flex flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-bold transition-all ${
                type === 'sugestao' 
                  ? 'bg-success/10 border-success/40 text-success' 
                  : 'bg-dark-bg border-dark-border text-dark-dim hover:bg-white/5'
              }`}
            >
              <Lightbulb size={18} /> Sugestão
            </button>
            <button
              type="button"
              onClick={() => setType('duvida')}
              className={`py-2 flex flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-bold transition-all ${
                type === 'duvida' 
                  ? 'bg-primary/10 border-primary/40 text-primary' 
                  : 'bg-dark-bg border-dark-border text-dark-dim hover:bg-white/5'
              }`}
            >
              <Question size={18} /> Dúvida
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-dark-dim tracking-wider mb-2 block">
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva o que aconteceu..."
            className="input-field min-h-[100px] resize-none text-sm p-3"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold text-xs mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-spin border-2 border-white/20 border-t-white rounded-full w-4 h-4" />
          ) : (
            <PaperPlaneRight size={16} weight="fill" />
          )}
          Enviar Mensagem
        </button>
      </form>
    </div>
  );
};

export default FeedbackWidget;
