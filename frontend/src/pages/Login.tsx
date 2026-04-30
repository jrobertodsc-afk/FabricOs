import React, { useState } from 'react';
import { Package, Lock, Envelope, ArrowRight } from '@phosphor-icons/react';
import { login } from '../services/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Falha na autenticação. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex bg-primary p-4 rounded-2xl shadow-2xl shadow-primary/20 mb-4">
            <Package size={40} weight="bold" className="text-white" />
          </div>
          <h1 className="text-4xl font-outfit font-bold text-white tracking-tight">FabricOS</h1>
          <p className="text-dark-dim mt-2">Plataforma de Inteligência Industrial</p>
        </div>

        {/* Login Card */}
        <div className="card !p-8 border-t-4 border-t-primary">
          <h2 className="text-xl font-bold text-white mb-6">Acesse sua conta</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs text-dark-dim uppercase tracking-widest font-bold mb-2 block">E-mail Corporativo</label>
              <div className="relative">
                <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
                <input 
                  type="email" 
                  required
                  className="input-field pl-12"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-dark-dim uppercase tracking-widest font-bold mb-2 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-dim" size={18} />
                <input 
                  type="password" 
                  required
                  className="input-field pl-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg flex items-center gap-2">
                 <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary justify-center py-4 text-base mt-4"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
              <ArrowRight size={20} weight="bold" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-dark-border text-center">
            <p className="text-xs text-dark-dim">
              Esqueceu sua senha? Entre em contato com o suporte.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-dark-dim uppercase tracking-widest mt-10">
          FabricOS Enterprise v2.0.0 &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default Login;
