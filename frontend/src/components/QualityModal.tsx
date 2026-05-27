import React, { useState } from 'react';
import { X, WarningCircle } from '@phosphor-icons/react';
import type { QualityRecordPayload } from '../services/api';

interface QualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QualityRecordPayload) => Promise<void>;
  orderNumber: string;
}

const QualityModal: React.FC<QualityModalProps> = ({ isOpen, onClose, onSubmit, orderNumber }) => {
  const [defectType, setDefectType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({
      defect_type: defectType,
      quantity,
      notes: notes || undefined
    });
    setIsSubmitting(false);
    
    // Reset form
    setDefectType('');
    setQuantity(1);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-bg/50">
          <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
            <WarningCircle size={24} className="text-warning" />
            Apontamento de Qualidade
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-dark-dim hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-warning/10 text-warning p-4 rounded-xl border border-warning/20 mb-2 text-sm font-medium">
            Registrando defeito para a OP: <strong>{orderNumber}</strong>
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-dim mb-1 uppercase tracking-wider">
              Motivo do Defeito *
            </label>
            <input 
              type="text" 
              required
              value={defectType}
              onChange={e => setDefectType(e.target.value)}
              placeholder="Ex: Costura torta, Mancha, Furo..."
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-warning focus:ring-1 focus:ring-warning transition-all placeholder:text-dark-dim/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-dim mb-1 uppercase tracking-wider">
              Quantidade de Peças *
            </label>
            <input 
              type="number" 
              required
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-warning focus:ring-1 focus:ring-warning transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-dim mb-1 uppercase tracking-wider">
              Observações Adicionais
            </label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes adicionais sobre a falha (Opcional)"
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-warning focus:ring-1 focus:ring-warning transition-all h-24 resize-none placeholder:text-dark-dim/50"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-dark-border text-white rounded-xl hover:bg-white/5 transition-all font-bold"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-warning text-dark-bg rounded-xl hover:bg-warning/90 transition-all font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Apontamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QualityModal;
