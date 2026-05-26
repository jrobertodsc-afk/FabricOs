import React, { useState, useRef } from 'react';
import { X, CheckCircle, Camera, SpinnerGap } from '@phosphor-icons/react';
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

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  withdrawal: any;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onSubmit, withdrawal }) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  const [formData, setFormData] = useState({
    return_qty: withdrawal?.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0,
    return_status: 'ok',
    return_notes: '',
    return_photo_urls: [] as string[],
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const newUrls = [...formData.return_photo_urls];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const res = await uploadImage(file);
        newUrls.push(res.url);
      }
      setFormData(prev => ({ ...prev, return_photo_urls: newUrls }));
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!isOpen || !withdrawal) return null;

  const totalPending = withdrawal.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Por favor, colete a assinatura do entregador antes de confirmar a devolução.");
      return;
    }

    setUploading(true);
    try {
      const sigDataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const sigFile = dataURLtoFile(sigDataUrl, `return_signature_${Date.now()}.png`);
      const uploadRes = await uploadImage(sigFile);

      onSubmit({
        ...formData,
        return_signature_url: uploadRes.url
      });

      sigPadRef.current.clear();
    } catch (error) {
      console.error("Failed to upload return signature:", error);
      alert("Erro ao enviar a assinatura digital de devolução. Tente novamente.");
    } finally {
      setUploading(false);
    }
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

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-sm text-dark-dim">Observações do Retorno</label>
            <textarea 
              rows={3}
              className="bg-dark-bg border border-dark-border rounded-xl p-3 focus:border-primary outline-none resize-none"
              placeholder="Descreva defeitos ou o que falta..."
              value={formData.return_notes}
              onChange={e => setFormData({...formData, return_notes: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center">
              <label className="text-sm text-dark-dim font-semibold">Assinatura de Devolução (Obrigatório)</label>
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
            <label className="text-sm text-dark-dim mb-2 block">Fotos da Devolução (Avarias/Defeitos)</label>
            <div className="flex flex-wrap gap-4 items-center">
              {formData.return_photo_urls.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl border border-dark-border overflow-hidden bg-dark-bg relative group">
                  <img src={`http://127.0.0.1:8000${url}`} alt="Upload" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, return_photo_urls: prev.return_photo_urls.filter((_, idx) => idx !== i) }))}
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
