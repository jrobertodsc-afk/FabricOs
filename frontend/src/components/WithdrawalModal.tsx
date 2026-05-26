import React, { useState, useRef } from 'react';
import { X, Camera, SpinnerGap } from '@phosphor-icons/react';
import SignatureCanvas from 'react-signature-canvas';
import { uploadImage } from '../services/api';

const SigCanvas = (SignatureCanvas as any).default || SignatureCanvas;

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  const [formData, setFormData] = useState({
    item_name: '',
    person_name: '',
    email: '',
    phone_number: '',
    reason: '',
    type: 'interno',
    destination: '',
    expected_return: '',
    notes: '',
    photo_urls: [] as string[],
  });

  const [sizes, setSizes] = useState({
    PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0
  });

  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleSizeChange = (size: string, value: string) => {
    setSizes(prev => ({ ...prev, [size]: parseInt(value) || 0 }));
  };

  const handleClose = () => {
    setFormData({
      item_name: '', person_name: '', email: '', phone_number: '', reason: '',
      type: 'interno', destination: '', expected_return: '', notes: '', photo_urls: []
    });
    setSizes({ PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0 });
    onClose();
  };

  const totalQuantity = Object.values(sizes).reduce((acc, curr) => acc + curr, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const newUrls = [...formData.photo_urls];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const res = await uploadImage(file);
        newUrls.push(res.url);
      }
      setFormData(prev => ({ ...prev, photo_urls: newUrls }));
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
      // reset input
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Por favor, colete a assinatura do responsável antes de confirmar.");
      return;
    }

    const items = Object.entries(sizes)
      .filter(([_, qty]) => qty > 0)
      .map(([size, quantity]) => ({ size, quantity }));

    if (items.length === 0) {
      alert("Por favor, adicione pelo menos uma peça na grade.");
      return;
    }

    setUploading(true);
    try {
      const sigDataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const sigFile = dataURLtoFile(sigDataUrl, `signature_${Date.now()}.png`);
      const uploadRes = await uploadImage(sigFile);
      
      onSubmit({ 
        ...formData, 
        signature_url: uploadRes.url,
        items 
      });
      
      sigPadRef.current.clear();
    } catch (error) {
      console.error("Failed to upload signature:", error);
      alert("Erro ao enviar a assinatura digital. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <h2 className="text-xl font-bold font-outfit">Registrar Retirada</h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
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
            <label className="text-sm text-dark-dim mb-2 block">Motivo da Retirada</label>
            <input 
              type="text" 
              required
              placeholder="Ex: Ensaio fotográfico, conserto, produção..."
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            />
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

          <div className="grid grid-cols-3 gap-6 mb-6">
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
              <label className="text-sm text-dark-dim">E-mail</label>
              <input 
                type="email" 
                placeholder="Ex: maria@oficina.com"
                className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
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

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-sm text-dark-dim">Observações</label>
            <textarea 
              rows={2}
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none resize-none"
              placeholder="Detalhes adicionais..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center">
              <label className="text-sm text-dark-dim font-semibold">Assinatura do Recebedor (Obrigatório)</label>
              <button 
                type="button"
                onClick={() => sigPadRef.current?.clear()}
                className="text-xs text-primary hover:text-primary-hover font-bold transition-colors"
              >
                Limpar Assinatura
              </button>
            </div>
            <div className="bg-dark-bg border border-dark-border rounded-xl overflow-hidden p-1">
              <SigCanvas 
                ref={sigPadRef} 
                penColor="white" 
                canvasProps={{ 
                  className: "w-full h-32 cursor-crosshair bg-dark-bg rounded-lg",
                  style: { display: 'block' }
                }} 
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="text-sm text-dark-dim mb-2 block">Fotos Adicionais (Entrega)</label>
            <div className="flex flex-wrap gap-4 items-center">
              {formData.photo_urls.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl border border-dark-border overflow-hidden bg-dark-bg relative group">
                  <img src={`http://127.0.0.1:8000${url}`} alt="Upload" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photo_urls: prev.photo_urls.filter((_, idx) => idx !== i) }))}
                    className="absolute inset-0 bg-danger/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              ))}
              
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-dark-border flex flex-col items-center justify-center text-dark-dim hover:text-primary hover:border-primary transition-colors cursor-pointer bg-dark-bg">
                {uploading ? <SpinnerGap size={24} className="animate-spin" /> : <Camera size={24} />}
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  capture="environment"
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-dark-border">
            <div className="text-dark-dim">
              Total: <span className="text-primary font-bold">{totalQuantity}</span> peças
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={handleClose}
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
