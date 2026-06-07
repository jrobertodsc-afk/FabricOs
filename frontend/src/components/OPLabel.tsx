import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from '@phosphor-icons/react';
import type { ProductionOrder } from '../services/api';

interface OPLabelProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

const OPLabel: React.FC<OPLabelProps> = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const photoUrl = order.photo_url 
    ? (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}${order.photo_url}` : order.photo_url)
    : null;

  // Gerar 10 linhas para a tabela de Controle de Corte
  const controleRows = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block overflow-y-auto">
      
      {/* Container Principal */}
      <div className="bg-white w-full max-w-4xl my-auto shadow-2xl print:shadow-none print:max-w-none print:w-full print:m-0 text-black font-sans relative">
        
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            html, body {
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            .fixed {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            .fixed > div {
              visibility: visible;
            }
            .fixed > div * {
              visibility: visible;
            }
            .print\\:hidden {
              display: none !important;
            }
            
            /* Forçar cores de fundo das tabelas */
            .bg-gray-200 { background-color: #e5e7eb !important; }
            .bg-gray-300 { background-color: #d1d5db !important; }
          }
        `}</style>

        {/* Action Bar (Screen Only) */}
        <div className="absolute -top-16 left-0 right-0 flex justify-end gap-3 print:hidden">
          <button onClick={handlePrint} className="bg-white text-black font-bold py-2 px-6 rounded shadow flex items-center gap-2 hover:bg-gray-200">
            <Printer size={20} />
            Imprimir Ficha
          </button>
          <button onClick={onClose} className="bg-dark-card border border-dark-border text-white py-2 px-4 rounded hover:bg-dark-border">
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO DA FICHA (Estilo Exato da Imagem) */}
        <div className="p-8 print:p-0 bg-white min-h-[297mm] text-xs print:text-[11px] leading-tight flex flex-col font-sans">
          
          {/* Topo: Logo e Título */}
          <div className="flex items-center justify-between mb-4">
             <div className="flex flex-col items-center justify-center w-1/3">
                <div className="flex items-center justify-center border-2 border-black rounded p-2 mb-1">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h2 className="font-black text-lg tracking-tighter">FabricOS TÊXTIL</h2>
                <p className="text-[9px] uppercase font-bold tracking-widest">Indústria de Moda</p>
             </div>
             <div className="w-2/3 border-l-4 border-black pl-6 py-2">
                <h1 className="text-5xl font-black uppercase tracking-tight">Ficha de Corte</h1>
             </div>
          </div>

          <div className="border-t-2 border-b-2 border-black py-2 mb-4 font-bold text-sm uppercase">
             <div className="flex justify-between mb-1">
                <span>REF: {order.product_id || order.item_name}</span>
                <span>|</span>
                <span>ORDEM DE PRODUÇÃO: {order.order_number}</span>
                <span>|</span>
                <span>DATA: {order.risk_release_date ? new Date(order.risk_release_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
             </div>
             <div className="flex justify-between">
                <span>COLEÇÃO: {order.collection || 'N/A'}</span>
                <span>|</span>
                <span>CLIENTE: {order.nf_number || 'INTERNO'}</span>
                <span>|</span>
                <span>PRODUTO: {order.item_name}</span>
             </div>
          </div>

          {/* IDENTIFICAÇÃO E ESPECIFICAÇÕES */}
          <div className="flex gap-4 mb-4">
             {/* Box Identificação / QR Code / Cor */}
             <div className="w-1/3 border-2 border-black flex flex-col">
                <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center p-4">
                   <QRCodeSVG value={order.order_number} size={120} level="H" includeMargin={false} />
                   <div className="mt-6 text-center w-full border-t-2 border-black/20 pt-2">
                     <span className="text-[10px] font-bold uppercase text-gray-500 block">Cores da Família</span>
                     <span className="text-lg font-black uppercase tracking-widest text-black">
                       {order.items && order.items.length > 0 
                         ? Array.from(new Set(order.items.map(i => i.color))).join(' / ') 
                         : 'Cores Sortidas'}
                     </span>
                   </div>
                </div>
                <div className="bg-gray-300 border-t-2 border-black text-center py-1 font-bold uppercase">
                   Identificação da Ficha
                </div>
             </div>

             {/* Box Especificações */}
             <div className="w-2/3 border-2 border-black flex flex-col">
                <div className="bg-gray-300 border-b-2 border-black text-center py-1 font-bold uppercase text-base">
                   Especificações
                </div>
                <div className="flex-1 p-4 space-y-4 font-bold text-sm uppercase flex flex-col justify-center">
                   <p><span className="mr-2">MODELO:</span> {order.item_name}</p>
                   <p><span className="mr-2">TECIDO:</span> {order.fabric_description || 'N/A'}</p>
                   <p><span className="mr-2">COMPOSIÇÃO:</span> NÃO CADASTRADO</p>
                   <p><span className="mr-2">FORRO:</span> {order.lining_quantity_mts ? 'SIM' : 'NÃO'}</p>
                </div>
             </div>
          </div>

          {/* GRADE DE TAMANHOS */}
          <div className="mb-4">
             <h3 className="font-bold uppercase text-sm mb-1">Grade de Tamanhos (Quantidades)</h3>
             <table className="w-full border-collapse border-2 border-black text-center font-bold text-sm">
                <thead>
                   <tr className="bg-gray-300">
                      <th className="border-2 border-black py-1 px-2">CÓD. TECIDO</th>
                      <th className="border-2 border-black py-1 px-2">COR</th>
                      <th className="border-2 border-black py-1 px-2 w-1/3">MODELOS</th>
                      <th className="border-2 border-black py-1 px-2">PP</th>
                      <th className="border-2 border-black py-1 px-2">P</th>
                      <th className="border-2 border-black py-1 px-2">M</th>
                      <th className="border-2 border-black py-1 px-2">G</th>
                      <th className="border-2 border-black py-1 px-2">GG</th>
                      <th className="border-2 border-black py-1 px-2">TOTAL</th>
                   </tr>
                </thead>
                <tbody>
                   {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                         <tr key={idx}>
                            <td className="border-2 border-black py-1 px-2">{order.order_number}</td>
                            <td className="border-2 border-black py-1 px-2 uppercase">{item.color}</td>
                            <td className="border-2 border-black py-1 px-2 uppercase text-center">{item.name}</td>
                            <td className="border-2 border-black py-1 px-2">{item.sizes?.['PP'] || ' '}</td>
                            <td className="border-2 border-black py-1 px-2">{item.sizes?.['P'] || ' '}</td>
                            <td className="border-2 border-black py-1 px-2">{item.sizes?.['M'] || ' '}</td>
                            <td className="border-2 border-black py-1 px-2">{item.sizes?.['G'] || ' '}</td>
                            <td className="border-2 border-black py-1 px-2">{item.sizes?.['GG'] || ' '}</td>
                            <td className="border-2 border-black py-1 px-2">{item.total}</td>
                         </tr>
                      ))
                   ) : (
                      <tr>
                         <td className="border-2 border-black py-1 px-2">{order.order_number}</td>
                         <td className="border-2 border-black py-1 px-2">-</td>
                         <td className="border-2 border-black py-1 px-2 uppercase text-center">ÚNICA</td>
                         <td className="border-2 border-black py-1 px-2"></td>
                         <td className="border-2 border-black py-1 px-2"></td>
                         <td className="border-2 border-black py-1 px-2"></td>
                         <td className="border-2 border-black py-1 px-2"></td>
                         <td className="border-2 border-black py-1 px-2"></td>
                         <td className="border-2 border-black py-1 px-2">{order.total_quantity}</td>
                      </tr>
                   )}
                   <tr className="bg-gray-300">
                      <td colSpan={8} className="border-2 border-black py-1 px-2 uppercase text-center font-bold">
                         ENVIO {order.shipping_date ? new Date(order.shipping_date).toLocaleDateString('pt-BR') : '___/___/____'} / LANÇAMENTO {order.launch_date ? new Date(order.launch_date).toLocaleDateString('pt-BR') : '___/___/____'}
                      </td>
                      <td className="border-2 border-black py-1 px-2">{order.total_quantity}</td>
                   </tr>
                   <tr>
                      <td colSpan={9} className="border-2 border-black py-1 px-2 uppercase text-left font-bold text-[10px] text-gray-600 bg-gray-200">
                         TOTAL SOLICITADO: PEÇAS POR MODELO TOTAL {order.total_quantity} PEÇAS
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>

          {/* INFORMAÇÕES ADICIONAIS / TRELLO */}
          <div className="flex gap-4 mb-4">
             <div className="flex-1 flex flex-col min-h-[60px] border-2 border-black p-2">
                <h3 className="font-bold uppercase text-[10px] text-gray-700 mb-1 border-b border-black/30 pb-1">AVIAMENTOS (TRELLO)</h3>
                <p className="text-[10px] leading-tight whitespace-pre-wrap flex-1">{order.trims || 'Nenhum aviamento registrado.'}</p>
             </div>
             <div className="flex-1 flex flex-col min-h-[60px] border-2 border-black p-2">
                <h3 className="font-bold uppercase text-[10px] text-gray-700 mb-1 border-b border-black/30 pb-1">COMENTÁRIOS DA MODELAGEM</h3>
                <p className="text-[10px] leading-tight whitespace-pre-wrap flex-1">{order.modeling_notes || 'Sem comentários de modelagem.'}</p>
             </div>
             <div className="flex-1 flex flex-col min-h-[60px] border-2 border-black p-2">
                <h3 className="font-bold uppercase text-[10px] text-gray-700 mb-1 border-b border-black/30 pb-1">OBSERVAÇÕES GERAIS</h3>
                <p className="text-[10px] leading-tight whitespace-pre-wrap flex-1">{order.observations || 'Nenhuma observação.'}</p>
             </div>
          </div>

          {/* CONTROLE DE CORTE */}
          <div className="flex-1 mb-4">
             <h3 className="font-bold uppercase text-sm mb-1">Controle de Corte</h3>
             <table className="w-full border-collapse border-2 border-black text-center text-[10px] font-bold">
                <thead>
                   <tr className="bg-gray-300">
                      <th className="border-2 border-black p-1 w-8">LOTE</th>
                      <th className="border-2 border-black p-1 w-20">DATA</th>
                      <th className="border-2 border-black p-1 w-16">ROLO</th>
                      <th className="border-2 border-black p-1">METRAGEM<br/>TOTAL (m)</th>
                      <th className="border-2 border-black p-1">METRAGEM<br/>CORTADA (m)</th>
                      <th className="border-2 border-black p-1">RETALHO<br/>(m)</th>
                      <th className="border-2 border-black p-1 w-32">OPERADOR<br/>(RUBRICA)</th>
                      <th className="border-2 border-black p-1 w-32">OBSERVAÇÕES</th>
                   </tr>
                </thead>
                <tbody>
                   {controleRows.map((num, idx) => (
                      <tr key={num} className={idx % 2 !== 0 ? 'bg-gray-200' : 'bg-white'}>
                         <td className="border-2 border-black py-2">{num}</td>
                         <td className="border-2 border-black py-2">___/___/___</td>
                         <td className="border-2 border-black py-2"></td>
                         <td className="border-2 border-black py-2">[ &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
                         <td className="border-2 border-black py-2">(m)</td>
                         <td className="border-2 border-black py-2">(m)</td>
                         <td className="border-2 border-black py-2 text-left px-1">Assinatura:</td>
                         <td className="border-2 border-black py-2"></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col items-center justify-center mt-auto pt-4">
             <p className="text-[9px] text-center mt-2 font-bold">
                FabricOS TÊXTIL LTDA - Sistema Integrado de Produção<br/>
                Documento: Ficha_Corte_V2 - Pág: 1/1 - ID: {order.id} - Gerado em: {new Date().toLocaleString('pt-BR')}
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OPLabel;
