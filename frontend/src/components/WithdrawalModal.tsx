import React, { useState } from 'react';
import { X, Camera } from '@phosphor-icons/react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    person_name: '',
    phone_number: '',
    reason: '',
    type: 'interno',
    destination: '',
    expected_return: '',
    notes: '',
  });

  const [sizes, setSizes] = useState({
    PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0
  });

  if (!isOpen) return null;

  const handleSizeChange = (size: string, value: string) => {
    setSizes(prev => ({ ...prev, [size]: parseInt(value) || 0 }));
  };

  const totalQuantity = Object.values(sizes).reduce((acc, curr) => acc + curr, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(sizes)
      .filter(([_, qty]) => qty > 0)
      .map(([size, quantity]) => ({ size, quantity }));
    
    onSubmit({ ...formData, items });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <h2 className="text-xl font-bold font-outfit">Registrar Retirada</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">Tipo de Retirada</label>
              <select 
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="interno">Interno (Foto/Evento)</option>
                <option value="faccionista">Faccionista (Produção)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">Nome da Peça / Lote</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Vestido Flora"
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.item_name}
                onChange={e => setFormData({...formData, item_name: e.target.value})}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm text-dark-dim mb-3 block">Grade por Tamanho (Quantidade)</label>
            <div className="grid grid-cols-6 gap-3">
              {Object.keys(sizes).map(size => (
                <div key={size} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-center text-dark-dim">{size}</label>
                  <input 
                    type="number" 
                    min="0"
                    className="bg-dark-bg border border-dark-border rounded-lg p-2 text-center focus:border-primary outline-none"
                    value={sizes[size as keyof typeof sizes]}
                    onChange={e => handleSizeChange(size, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">Responsável</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Oficina da Maria"
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.person_name}
                onChange={e => setFormData({...formData, person_name: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">WhatsApp</label>
              <input 
                type="text" 
                placeholder="Ex: 11999998888"
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.phone_number}
                onChange={e => setFormData({...formData, phone_number: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">Destino / Local</label>
              <input 
                type="text" 
                placeholder="Ex: Estúdio 42"
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-dark-dim">Previsão de Retorno</label>
              <input 
                type="date" 
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.expected_return}
                onChange={e => setFormData({...formData, expected_return: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-8">
            <label className="text-sm text-dark-dim">Observações</label>
            <textarea 
              rows={2}
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none resize-none"
              placeholder="Detalhes adicionais..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-dark-border">
            <div className="text-dark-dim">
              Total: <span className="text-primary font-bold">{totalQuantity}</span> peças
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-dark-border text-dark-dim hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="btn-primary px-8 py-3"
              >
                Confirmar Retirada
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalModal;
