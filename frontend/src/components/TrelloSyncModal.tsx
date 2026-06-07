import React, { useState } from 'react';
import { ArrowsClockwise, X, DownloadSimple, Kanban, Eye } from '@phosphor-icons/react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface TrelloSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrelloSyncModal: React.FC<TrelloSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncedProducts, setSyncedProducts] = useState<any[] | null>(null);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setSyncedProducts(null);
    try {
      const res = await api.post('/api/integrations/trello/sync-history', {
        list_name: "APROVADAS"
      });
      if (res.data.status === 'success') {
        setSyncedProducts(res.data.products);
        addToast(`Sincronização concluída! ${res.data.synced_count} produtos encontrados.`, "success");
      }
    } catch (error: any) {
      console.error(error);
      addToast(error.response?.data?.detail || "Erro ao sincronizar com o Trello.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background-color: white !important; color: black !important; }
          body * { visibility: hidden; }
          .fixed { position: absolute !important; left: 0 !important; top: 0 !important; padding: 0 !important; background: white !important; }
          .fixed > div { visibility: visible; }
          .fixed > div * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
      
      <div className="bg-dark-card border border-dark-border w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden print:shadow-none print:border-none print:w-full print:h-auto print:rounded-none">
        {/* Header */}
        <div className="p-6 border-b border-dark-border/50 flex justify-between items-center print:hidden bg-dark-bg">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary p-2 rounded-lg">
              <Kanban size={24} weight="bold" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-outfit text-white">Relatório de Sincronização Trello</h2>
              <p className="text-xs text-dark-dim">Importação de Histórico de Peças Aprovadas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {syncedProducts !== null && (
              <button onClick={handlePrint} className="btn-secondary py-2 flex items-center gap-2">
                <DownloadSimple size={18} />
                Salvar PDF
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-dark-bg border border-dark-border rounded-xl text-dark-dim hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar print:p-0 print:overflow-visible">
          {syncedProducts === null && !syncing ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
               <Kanban size={64} className="text-primary/20" weight="thin" />
               <h3 className="text-xl font-bold font-outfit text-white">Pronto para Sincronizar</h3>
               <p className="text-sm text-dark-dim max-w-md">
                 Este processo buscará todo o histórico de cartões aprovados nas listas <b>"APROVADAS"</b> dos seus quadros integrados e vai gerar um catálogo das peças importadas.
               </p>
               <button 
                 onClick={handleSync}
                 className="mt-4 btn-primary py-3 px-8 text-base shadow-lg shadow-primary/20 flex items-center gap-2"
               >
                 <ArrowsClockwise size={20} />
                 Iniciar Sincronização
               </button>
             </div>
          ) : syncing ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
               <ArrowsClockwise size={48} className="text-primary animate-spin" />
               <h3 className="text-lg font-bold font-outfit text-white">Varrendo o Trello...</h3>
               <p className="text-xs text-dark-dim">Isso pode levar alguns segundos dependendo da quantidade de cartões.</p>
             </div>
          ) : (
             <div className="print:block">
               <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
                 <h1 className="text-2xl font-black uppercase tracking-widest text-black">Relatório de Sincronização Trello - Peças Aprovadas</h1>
                 <p className="text-sm font-bold mt-1 text-gray-700">FabricOS Têxtil | Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                 <p className="text-xs font-bold mt-1 text-gray-500">Total Importado: {syncedProducts?.length || 0} modelos</p>
               </div>

               {syncedProducts?.length === 0 ? (
                 <div className="text-center py-20 text-dark-dim">Nenhuma peça encontrada na coluna "APROVADAS".</div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
                   {syncedProducts?.map(prod => (
                     <div key={prod.id} className="bg-dark-bg border border-dark-border rounded-xl overflow-hidden flex flex-col print:border-2 print:border-black print:bg-white print:rounded-none">
                       {/* Foto */}
                       <div className="h-40 w-full relative bg-dark-card border-b border-dark-border print:border-black flex items-center justify-center">
                         {prod.image_url ? (
                           <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover print:object-contain print:h-36" />
                         ) : (
                           <span className="text-xs font-bold text-dark-dim print:text-black">SEM FOTO</span>
                         )}
                       </div>
                       {/* Dados */}
                       <div className="p-4 flex-1 flex flex-col">
                         <h4 className="font-outfit font-bold text-lg text-white mb-1 print:text-black uppercase">{prod.name}</h4>
                         <div className="flex justify-between items-center mb-3 text-xs">
                           <span className="text-primary font-mono print:text-black print:font-bold">REF: {prod.reference}</span>
                           <span className="bg-success/20 text-success px-2 py-0.5 rounded font-bold uppercase text-[9px] print:border print:border-black print:bg-transparent print:text-black">APROVADO</span>
                         </div>
                         
                         <div className="mt-auto pt-3 border-t border-dark-border/40 print:border-black/30">
                           <span className="text-[10px] font-bold uppercase text-dark-dim block mb-1 print:text-gray-600">Aviamentos Identificados:</span>
                           <p className="text-xs text-white/80 line-clamp-3 print:text-black font-mono">
                             {prod.trims || 'Nenhum listado na descrição.'}
                           </p>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrelloSyncModal;
