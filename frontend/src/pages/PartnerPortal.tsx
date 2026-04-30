import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Clock, CheckCircle, Warning } from '@phosphor-icons/react';
import axios from 'axios';

// Portal doesn't need X-Tenant-ID header because token identifies everything
const portalApi = axios.create({
  baseURL: 'http://localhost:8000',
});

const PartnerPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        // In a real app, this endpoint would be public but token-protected
        const response = await portalApi.get(`/api/partners/portal/${token}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to load portal data", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPortalData();
  }, [token]);

  if (loading) return <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">Carregando portal...</div>;
  if (!data) return <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">Acesso negado ou token inválido.</div>;

  return (
    <div className="min-h-screen bg-dark-bg text-white font-inter p-6 md:p-12">
      <header className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-primary p-3 rounded-2xl">
            <Package size={32} weight="bold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-outfit">Portal do Parceiro</h1>
            <p className="text-dark-dim">{data.partner.name}</p>
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-sm text-primary flex items-center gap-3">
          <CheckCircle size={20} />
          <span>Este é o seu painel de acompanhamento de pedidos.</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Clock size={24} className="text-warning" />
          Ordens de Produção Pendentes
        </h2>

        <div className="grid gap-6">
          {data.orders.length === 0 ? (
            <div className="card flex flex-col items-center py-12 gap-3 text-dark-dim">
              <Package size={48} weight="thin" />
              <p>Nenhuma ordem de produção pendente no momento.</p>
            </div>
          ) : (
            data.orders.map((order: any) => (
              <div key={order.id} className="card hover:border-primary/40 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                      #{order.order_number}
                    </span>
                    <h3 className="text-lg font-bold">{order.item_name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="bg-warning/10 text-warning px-3 py-1 rounded-full text-xs font-bold">
                      {order.current_stage}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 border-t border-dark-border pt-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-dark-dim">
                    <Package size={18} />
                    <span>{order.total_quantity} peças</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-dark-dim ml-auto">
                    <button className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors text-xs font-bold">
                      Confirmar Entrega
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Warning size={24} className="text-danger" />
            Peças Pendentes (Retiradas)
          </h2>
          <div className="card !p-0 overflow-hidden">
             <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-dark-dim text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 text-center">Qtd</th>
                    <th className="px-6 py-4">Data Saída</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {data.withdrawals.map((w: any) => (
                    <tr key={w.id}>
                      <td className="px-6 py-4 font-bold">{w.item_name}</td>
                      <td className="px-6 py-4 text-center text-primary font-bold">{w.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0)}</td>
                      <td className="px-6 py-4 text-dark-dim">{new Date(w.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {data.withdrawals.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-dark-dim">Nenhuma retirada pendente.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </section>
      </main>

      <footer className="max-w-4xl mx-auto mt-20 text-center text-dark-dim text-xs">
        <p>© 2025 FabricOS - Sistema de Produção Inteligente</p>
      </footer>
    </div>
  );
};

export default PartnerPortal;
