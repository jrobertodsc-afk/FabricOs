import React from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="bg-dark-card border border-dark-border/60 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-scale-up">
        <button 
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-dark-dim hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center gap-4 mt-2">
          <div className={`p-4 rounded-full 
            ${type === 'danger' ? 'bg-red-500/20 text-red-500' : ''}
            ${type === 'warning' ? 'bg-amber-500/20 text-amber-500' : ''}
            ${type === 'info' ? 'bg-blue-500/20 text-blue-500' : ''}
          `}>
            <WarningCircle size={40} weight="fill" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-dark-dim text-sm">{message}</p>
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-dark-border/30 hover:bg-dark-border/50 text-white transition-all border border-dark-border/50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex justify-center items-center gap-2
                ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                ${type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                ${type === 'info' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              `}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
