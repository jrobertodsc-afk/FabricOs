import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Package, Calendar, User } from '@phosphor-icons/react';
import type { ProductionOrder } from '../services/api';

interface OPLabelProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  partnerName?: string;
}

const OPLabel: React.FC<OPLabelProps> = ({ isOpen, onClose, order, partnerName }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="bg-dark-card border border-dark-border w-full max-w-sm rounded-2xl p-6 print:border-0 print:bg-white print:text-black print:max-w-none print:w-full">
        <header className="flex justify-between items-center mb-8 print:hidden">
          <h2 className="text-xl font-bold font-outfit">Etiqueta de Produção</h2>
          <button onClick={onClose} className="text-dark-dim hover:text-white"><X size={24} /></button>
        </header>

        <div className="flex flex-col items-center bg-white p-6 rounded-xl text-black">
          <div className="w-full border-b-2 border-black border-dashed pb-4 mb-4 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Package size={24} weight="bold" />
                <span className="text-xl font-black font-outfit uppercase">FabricOS</span>
             </div>
             <span className="text-xs font-bold uppercase tracking-widest">Controle de Lote</span>
          </div>

          <div className="w-full space-y-4 mb-6">
             <div>
                <p className="text-[10px] uppercase font-bold text-gray-500">Número da OP</p>
                <p className="text-2xl font-black">#{order.order_number}</p>
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-gray-500">Referência / Produto</p>
                <p className="text-lg font-bold">{order.item_name}</p>
                {order.collection && <p className="text-[10px] text-primary font-bold">COLEÇÃO: {order.collection}</p>}
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[10px] uppercase font-bold text-gray-500">Quantidade</p>
                   <p className="font-bold">{order.total_quantity} PEÇAS</p>
                </div>
                <div>
                   <p className="text-[10px] uppercase font-bold text-gray-500">Parceiro</p>
                   <p className="font-bold truncate">{partnerName || 'Interno'}</p>
                </div>
             </div>

             {order.size_grade && Object.keys(order.size_grade).length > 0 && (
                <div className="border border-black rounded-lg overflow-hidden">
                   <table className="w-full text-[10px] text-center">
                      <thead className="bg-black text-white font-bold">
                         <tr>
                            {Object.entries(order.size_grade).filter(([_, qty]) => (qty as number) > 0).map(([size]) => (
                               <th key={size} className="border-r border-white/20 last:border-0 p-1">{size}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody>
                         <tr>
                            {Object.entries(order.size_grade).filter(([_, qty]) => (qty as number) > 0).map(([size, qty]) => (
                               <td key={size} className="border-r border-black/20 last:border-0 p-1 font-black">{(qty as number)}</td>
                            ))}
                         </tr>
                      </tbody>
                   </table>
                </div>
             )}

             {order.product?.materials && order.product.materials.length > 0 && (
                <div className="w-full bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                   <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 border-b border-gray-200 pb-1">Checklist de Aviamentos (Kit)</p>
                   <div className="grid grid-cols-1 gap-1">
                      {order.product.materials.map(pm => (
                        <div key={pm.id} className="flex justify-between items-center text-[10px]">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border border-black rounded-sm"></div>
                              <span>{pm.material.name}</span>
                           </div>
                           <span className="font-bold">{(pm.quantity * order.total_quantity).toFixed(0)} {pm.material.unit}</span>
                        </div>
                      ))}
                   </div>
                </div>
             )}
          </div>

          <div className="bg-white p-2 border-4 border-black rounded-lg">
             <QRCodeSVG value={order.order_number} size={180} level="H" includeMargin={true} />
          </div>

          <p className="mt-4 text-[10px] text-gray-400 font-mono">ID: {order.id}</p>
        </div>

        <div className="flex gap-3 mt-8 print:hidden">
          <button onClick={onClose} className="flex-1 px-6 py-3 border border-dark-border rounded-xl text-dark-dim hover:bg-white/5 transition-colors">Fechar</button>
          <button onClick={handlePrint} className="flex-1 btn-primary justify-center">
            <Printer size={20} weight="bold" />
            Imprimir
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:bg-white {
            background-color: white !important;
          }
          .print\:text-black {
            color: black !important;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .fixed {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            padding: 0 !important;
          }
          .fixed > div {
            visibility: visible;
            width: 100% !important;
            max-width: none !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .fixed > div * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
};

export default OPLabel;
