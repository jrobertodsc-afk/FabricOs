import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from '@phosphor-icons/react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the container is rendered
      setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* verbose= */ false
        );
        
        scannerRef.current.render(
          (decodedText) => {
            onScan(decodedText);
            onClose();
          },
          (error) => {
            // Silence common errors like "no QR code found in frame"
          }
        );
      }, 300);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-6 relative overflow-hidden">
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera size={24} className="text-primary" />
            Escanear OP
          </h2>
          <button onClick={onClose} className="text-dark-dim hover:text-white transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="relative rounded-xl overflow-hidden bg-black border-2 border-primary/20">
          <div id="reader" className="w-full"></div>
          
          {/* Custom Overlay */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
             <div className="w-full h-full border-2 border-primary/60 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
             </div>
          </div>
        </div>

        <p className="text-center text-dark-dim text-sm mt-6">
          Aponte a câmera para o QR Code da etiqueta para avançar o estágio da produção.
        </p>

        <button 
          onClick={onClose}
          className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-bold"
        >
          Cancelar
        </button>
      </div>

      <style>{`
        #reader { border: none !important; }
        #reader__status_span { display: none !important; }
        #reader__dashboard { background: transparent !important; padding: 10px !important; }
        #reader__dashboard_section_csr button {
          background: #0055a4 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-weight: bold !important;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
