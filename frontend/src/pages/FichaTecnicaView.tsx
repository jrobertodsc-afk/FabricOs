import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProducts } from '../services/api';
import type { Product } from '../services/api';
import { Package, Printer, ArrowLeft } from '@phosphor-icons/react';

const FichaTecnicaView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const products = await getProducts();
        const found = products.find(p => p.id === id);
        if (found) setProduct(found);
      } catch (error) {
        console.error('Failed to load product', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-white">Carregando Ficha Técnica...</div>;
  }

  if (!product) {
    return <div className="p-8 text-white">Produto não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-dark-bg p-8 font-inter">
      <div className="max-w-4xl mx-auto">
        
        {/* Print Header */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Link to="/" className="flex items-center gap-2 text-dark-dim hover:text-dark-bg transition-colors">
            <ArrowLeft size={20} /> Voltar
          </Link>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-4 py-2 bg-dark-bg text-white rounded-lg hover:bg-dark-card transition-colors"
          >
            <Printer size={20} /> Imprimir Ficha
          </button>
        </div>

        {/* Ficha Header */}
        <div className="border-4 border-dark-bg p-8 rounded-xl relative">
          <div className="absolute top-0 right-0 bg-dark-bg text-white px-6 py-2 rounded-bl-xl font-bold tracking-widest uppercase text-sm">
            {product.type === 'piloto' ? 'Peça Piloto' : product.type === 'acervo' ? 'Acervo' : 'Produto Acabado'}
          </div>

          <div className="flex gap-8 mb-8 border-b-2 border-dark-bg/10 pb-8">
            <div className="w-48 h-48 bg-dark-bg/5 rounded-xl border-2 border-dark-bg/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={48} className="text-dark-bg/40" />
              )}
            </div>

            <div className="flex-1 pt-4">
              <h2 className="text-xs uppercase tracking-widest font-bold text-dark-bg/60 mb-1">Ficha Técnica</h2>
              <h1 className="text-4xl font-black font-outfit uppercase mb-2">{product.name}</h1>
              <div className="inline-block bg-dark-bg text-white px-3 py-1 rounded text-sm font-bold tracking-widest uppercase mb-6">
                REF: {product.reference}
              </div>
              
              <div className="bg-dark-bg/5 p-4 rounded-lg border border-dark-bg/10">
                <h3 className="text-[10px] uppercase font-bold text-dark-bg/60 tracking-widest mb-1">Notas de Modelagem</h3>
                <p className="text-sm">{product.description || 'Nenhuma descrição fornecida.'}</p>
              </div>
            </div>
          </div>

          {/* Insumos */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest border-b-2 border-dark-bg mb-4 pb-2">Composição / Insumos</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-bg/5">
                  <th className="p-3 border border-dark-bg/20 text-xs uppercase tracking-widest font-bold">Insumo</th>
                  <th className="p-3 border border-dark-bg/20 text-xs uppercase tracking-widest font-bold w-32 text-center">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {product.materials.map(pm => (
                  <tr key={pm.id}>
                    <td className="p-3 border border-dark-bg/20 text-sm font-medium">{pm.material.name}</td>
                    <td className="p-3 border border-dark-bg/20 text-sm text-center font-bold">
                      {pm.quantity} {pm.material.unit}
                    </td>
                  </tr>
                ))}
                {product.materials.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 border border-dark-bg/20 text-center text-sm italic text-dark-bg/60">
                      Nenhum insumo cadastrado para este modelo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé da Ficha */}
          <div className="mt-12 pt-4 border-t-2 border-dark-bg/10 flex justify-between text-xs text-dark-bg/40 font-bold uppercase tracking-widest">
            <span>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
            <span>FabricOS ERP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaTecnicaView;
