
import React, { useState } from 'react';
import { toast } from 'sonner';
import { UserRole } from '../types';
import { authApi } from '../services/api';

import { useSettings } from '../contexts/SettingsContext';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { settings } = useSettings();
  const [ra, setRa] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(ra, password);
      // Salva dados no localStorage para persistência
      sessionStorage.setItem('harven-access-token', response.token);
      sessionStorage.setItem('user-data', JSON.stringify(response.user));

      // Notifica o componente pai
      onLogin(response.user.role as UserRole);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fa] font-sans">
      {/* Lado Esquerdo - Imagem & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center bg-[#1c2d1b] overflow-hidden">
        <div className="absolute inset-0 z-0">
          {settings.login_bg_url ? (
            <img
              alt="Wheat field landscape"
              className="w-full h-full object-cover"
              src={settings.login_bg_url}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c2d1b] via-[#152414] to-[#0a1a09]"></div>
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="absolute top-8 left-8 z-20 flex items-center gap-2">
          {settings.login_logo_url && <img src={settings.login_logo_url} className="h-8 w-auto object-contain brightness-0 invert" alt="Logo" onError={(e) => e.currentTarget.style.display = 'none'} />}
        </div>

        <div className="relative z-10 p-12 flex flex-col items-center justify-center h-full text-center max-w-xl animate-in fade-in zoom-in-95 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 font-display">
            Bem-vindo ao <span className="text-[#d2ff00]">{settings.platform_name}</span>
          </h1>
          <p className="text-white/90 text-lg font-light leading-relaxed max-w-md">
            Plataforma educacional que forma pensamento crítico através da inteligência artificial
          </p>
        </div>

        <div className="absolute bottom-8 left-8 z-20 text-xs text-white/60">
          © 2026 Harven education. All rights reserved.
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex flex-col relative bg-[#f8f9fa] h-full overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center items-center w-full px-6 sm:px-12 md:px-24">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
            <div className="flex flex-col mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-[#1c2d1b] mb-2 font-display">Acesse sua conta</h2>
              <p className="text-gray-500 text-sm">
                Entre com seu RA e senha institucional
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[#1a1d0c] text-sm font-semibold leading-normal" htmlFor="identity">
                  RA (Registro Acadêmico)
                </label>
                <input
                  className="w-full h-12 px-4 rounded-lg bg-blue-50/50 border border-gray-200 text-[#1a1d0c] placeholder:text-gray-400 text-base focus:outline-none focus:border-[#d2ff00] focus:ring-1 focus:ring-[#d2ff00]/50 transition-all duration-200"
                  id="identity"
                  name="identity"
                  placeholder="Ex: 202401"
                  type="text"
                  value={ra}
                  onChange={(e) => setRa(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[#1a1d0c] text-sm font-semibold leading-normal" htmlFor="password">
                    Senha
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-500 hover:text-[#1c2d1b] transition-colors"
                    onClick={() => toast.info('Entre em contato com o administrador para redefinir sua senha.')}
                  >
                    Esqueci minha senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="w-full h-12 px-4 pr-12 rounded-lg bg-blue-50/50 border border-gray-200 text-[#1a1d0c] placeholder:text-gray-400 text-base focus:outline-none focus:border-[#d2ff00] focus:ring-1 focus:ring-[#d2ff00]/50 transition-all duration-200"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button
                className="mt-4 w-full h-12 bg-[#d2ff00] hover:bg-[#bde600] active:scale-[0.98] text-[#1c2d1b] text-base font-bold rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-[#1c2d1b] transition-colors underline decoration-gray-300 underline-offset-4"
                onClick={() => toast.info('Para primeiro acesso, entre em contato com a secretaria da sua instituição.')}
              >
                Primeiro acesso? Entre em contato com a secretaria
              </button>
            </div>
          </div>
        </div>

        <div className="lg:hidden p-6 text-xs text-center text-gray-400">
          © 2026 Harven education. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
