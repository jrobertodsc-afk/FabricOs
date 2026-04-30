import React, { useState } from 'react';
import { X, CheckCircle } from '@phosphor-icons/react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  withdrawal: any;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onSubmit, withdrawal }) => {
  const [formData, setFormData] = useState({
    return_qty: withdrawal?.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0,
    return_status: 'ok',
    return_notes: '',
  });

  if (!isOpen || !withdrawal) return null;

  const totalPending = withdrawal.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <h2 className="text-xl font-bold font-outfit">Confirmar Devolução</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 bg-primary/5 border border-primary/20 p-4 rounded-xl">
            <p className="text-sm text-dark-dim">Item: <span className="text-white font-bold">{withdrawal.item_name}</span></p>
            <p className="text-sm text-dark-dim">Responsável: <span className="text-white font-bold">{withdrawal.person_name}</span></p>
            <p className="text-sm text-dark-dim">Total Pendente: <span className="text-primary font-bold">{totalPending} peças</span></p>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-sm text-dark-dim">Quantidade Retornando Agora</label>
            <input 
              type="number" 
              required
              max={totalPending}
              min={1}
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
              value={formData.return_qty}
              onChange={e => setFormData({...formData, return_qty: parseInt(e.target.value)})}
            />
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-sm text-dark-dim">Estado das Peças</label>
            <select 
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
              value={formData.return_status}
              onChange={e => setFormData({...formData, return_status: e.target.value})}
            >
              <option value="ok">Tudo OK / Completo</option>
              <option value="defeito">Com Defeito / Avaria</option>
              <option value="parcial">Ficou Pendente (Parcial)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mb-8">
            <label className="text-sm text-dark-dim">Observações do Retorno</label>
            <textarea 
              rows={3}
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none resize-none"
              placeholder="Descreva defeitos ou o que falta..."
              value={formData.return_notes}
              onChange={e => setFormData({...formData, return_notes: e.target.value})}
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-dark-border text-dark-dim hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-success text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} weight="bold" />
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnModal;
