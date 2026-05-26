import React, { useState } from 'react';
import { WarningOctagon, ArrowClockwise, IdentificationCard, EnvelopeSimple, PhoneCall } from '@phosphor-icons/react';

interface LicenseLockScreenProps {
  errorMessage?: string;
  onRetry?: () => void;
}

const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({ 
  errorMessage = "Instância suspensa por pendências financeiras ou expiração. Entre em contato com a FabricOS.",
  onRetry
}) => {
  const [retrying, setRetrying] = useState(false);
  const tenantId = localStorage.getItem('fabricos_tenant_id') || 'N/A';

  const handleRetry = async () => {
    setRetrying(true);
    if (onRetry) {
      await onRetry();
    } else {
      // Recarrega a página para reiniciar todo o ciclo de verificação de licença
      window.location.reload();
    }
    setTimeout(() => setRetrying(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#070204] flex items-center justify-center p-6 font-inter overflow-y-auto">
      {/* Background Neon Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-danger/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-xl bg-[#140b0e]/80 border border-danger/20 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow Top Border Effect */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-danger/60 to-transparent"></div>

        <div className="flex flex-col items-center text-center">
          {/* Glowing Alert Icon */}
          <div className="w-20 h-20 bg-danger/10 border border-danger/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse mb-6 rotate-3">
            <WarningOctagon size={42} className="text-danger" weight="bold" />
          </div>

          <h1 className="text-3xl font-black font-outfit text-white tracking-tight mb-2">
            Instância Suspensa
          </h1>
          <p className="text-[11px] font-black text-danger uppercase tracking-[0.3em] mb-6">
            FabricOS • Sistema de Licenciamento
          </p>

          <div className="w-full bg-[#1b0d11]/80 border border-danger/10 rounded-2xl p-5 mb-8 text-left">
            <p className="text-sm text-white/90 leading-relaxed font-medium">
              {errorMessage}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left text-xs">
            <div className="bg-[#1b0d11]/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
              <IdentificationCard size={18} className="text-danger/70 shrink-0 mt-0.5" />
              <div>
                <p className="text-white/40 font-bold uppercase tracking-wider text-[9px]">ID da Instância (Tenant)</p>
                <p className="font-mono text-white/90 break-all select-all mt-1">{tenantId}</p>
              </div>
            </div>

            <div className="bg-[#1b0d11]/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
              <WarningOctagon size={18} className="text-danger/70 shrink-0 mt-0.5" />
              <div>
                <p className="text-white/40 font-bold uppercase tracking-wider text-[9px]">Canal & Criptografia</p>
                <p className="text-white/90 font-medium mt-1">JWS Token • RSA SHA-256</p>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="w-full border-t border-white/5 pt-6 mb-8 text-left">
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4 text-center">
              Como Reativar seu Acesso?
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
              <a 
                href="mailto:financeiro@fabricos.com" 
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all border border-white/5"
              >
                <EnvelopeSimple size={16} />
                financeiro@fabricos.com
              </a>
              <a 
                href="tel:+5511999999999" 
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all border border-white/5"
              >
                <PhoneCall size={16} />
                +55 (11) 99999-9999
              </a>
            </div>
          </div>

          {/* Re-verify Button */}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-danger to-[#b91c1c] text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.4)] active:scale-[0.98] transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            <ArrowClockwise size={16} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Verificando Status...' : 'Verificar Licença Novamente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LicenseLockScreen;
