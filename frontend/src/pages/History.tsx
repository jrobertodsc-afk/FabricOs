import React, { useEffect, useState } from 'react';
import { ClockCounterClockwise, MagnifyingGlass, User, Tag, ArrowRight } from '@phosphor-icons/react';
import axios from 'axios';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  order_number?: string;
  new_stage?: string;
  tenant_id?: string;
}

const History: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('fabricos_token');
      const response = await axios.get('http://127.0.0.1:8000/api/system/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-8 flex flex-col h-screen overflow-hidden">
      <header className="mb-10">
        <h1 className="text-2xl font-bold font-outfit">Histórico de Atividades</h1>
        <p className="text-dark-dim text-sm">Rastreabilidade completa de todas as movimentações de fábrica.</p>
      </header>

      <div className="card flex-1 overflow-hidden flex flex-col !p-0">
        <div className="p-6 border-b border-dark-border flex justify-between items-center bg-white/[0.02]">
           <div className="relative w-72 group">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-dim group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar histórico..." 
              className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 pl-10 pr-4 text-xs outline-none focus:border-primary transition-all"
            />
          </div>
          <button onClick={fetchLogs} className="text-xs font-bold text-primary hover:underline">
            Atualizar Agora
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-dark-dim">Carregando trilha de auditoria...</div>
          ) : logs.length === 0 ? (
             <div className="p-20 text-center text-dark-dim flex flex-col items-center gap-4">
                <ClockCounterClockwise size={48} weight="thin" />
                <p>Nenhuma atividade registrada ainda.</p>
             </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {logs.map((log, index) => (
                <div key={index} className="p-6 hover:bg-white/[0.02] transition-colors flex gap-6 items-start">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-[10px] font-black text-dark-dim uppercase tracking-tighter">
                      {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs font-bold text-primary">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${log.level === 'INFO' ? 'bg-success' : 'bg-warning'}`}></div>
                      <p className="text-sm font-medium text-white/90">{log.message}</p>
                    </div>
                    <div className="flex gap-4">
                      {log.order_number && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-dark-dim uppercase">
                          <Tag size={12} /> OP: {log.order_number}
                        </span>
                      )}
                      {log.new_stage && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-dark-dim uppercase">
                          <ArrowRight size={12} /> Destino: {log.new_stage}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                    <User size={12} className="text-dark-dim" />
                    <span className="text-[10px] font-bold text-dark-dim uppercase tracking-widest">Sistema</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
