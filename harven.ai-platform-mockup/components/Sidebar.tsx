import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userRole: UserRole;
  logoUrl: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, userRole, logoUrl }) => {
  const { settings } = useSettings();
  const [imgError, setImgError] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  // Reseta o erro quando a URL do logo muda (ex: novo upload)
  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('harven-theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('harven-theme', 'dark');
      setIsDark(true);
    }
  };

  // Componente de item de navegação usando NavLink
  const NavItem = ({ icon, label, to, matchPaths }: { icon: string, label: string, to: string, matchPaths?: string[] }) => {
    // Verifica se está ativo baseado no path atual
    const isActive = location.pathname === to ||
      (matchPaths && matchPaths.some(path => location.pathname.startsWith(path)));

    return (
      <NavLink
        to={to}
        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group w-full text-left
          ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
        <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1' : ''}`}>{icon}</span>
        {isOpen && <span className="text-sm font-medium animate-in fade-in duration-200">{label}</span>}
      </NavLink>
    );
  };

  // Rota inicial baseada no role
  const getHomeRoute = () => {
    switch (userRole) {
      case 'ADMIN': return '/admin';
      case 'INSTRUCTOR': return '/instructor';
      default: return '/dashboard';
    }
  };

  // Close sidebar on Escape key (mobile)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && window.innerWidth < 768) {
        onToggle();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 bg-harven-sidebar flex flex-col flex-shrink-0 transition-all duration-300 border-r border-white/5
          md:relative md:translate-x-0
          ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 w-64'}
        `}
        role="navigation"
        aria-label="Menu principal"
      >
      <div className="h-16 flex items-center justify-between px-3 border-b border-white/10 gap-2 overflow-hidden relative">
        <div
          onClick={() => navigate(getHomeRoute())}
          className="flex items-center gap-3 cursor-pointer transition-transform hover:scale-105 origin-left px-3"
        >
          {isOpen ? (
            logoUrl && !imgError ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-auto object-contain animate-in fade-in duration-200"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-white text-xl font-bold tracking-tight font-display whitespace-nowrap animate-in fade-in">PLATAFORMA</span>
            )
          ) : (
            logoUrl && !imgError ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="size-8 object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="size-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-harven-dark font-bold text-xl">token</span>
              </div>
            )
          )}
        </div>

        {/* Dark Mode Toggle */}
        {settings.module_dark_mode && (
          <button
            onClick={toggleTheme}
            className={`text-gray-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-white/5 ${isOpen ? 'absolute right-4' : ''}`}
            title={isDark ? "Mudar para Claro" : "Mudar para Escuro"}
            aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}
      </div>

      {/* Sidebar toggle button (desktop) */}
      <button
        onClick={onToggle}
        className="hidden md:flex items-center justify-center py-2 border-b border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
        title={isOpen ? "Recolher menu" : "Expandir menu"}
        aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
      >
        <span className="material-symbols-outlined text-[18px]">
          {isOpen ? 'chevron_left' : 'chevron_right'}
        </span>
      </button>

      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">

        {userRole === 'STUDENT' && (
          <>
            {isOpen && <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 animate-in slide-in-from-left-2">Área do Aluno</p>}
            <NavItem icon="dashboard" label="Dashboard" to="/dashboard" />
            <NavItem icon="school" label="Meus Estudos" to="/courses" matchPaths={['/course']} />
            <NavItem icon="history" label="Histórico" to="/history" />
            {settings.module_gamification && (
              <NavItem icon="emoji_events" label="Conquistas" to="/achievements" />
            )}

            <div className="my-2 h-px bg-white/5"></div>
          </>
        )}

        {userRole === 'INSTRUCTOR' && (
          <>
            {isOpen && <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 animate-in slide-in-from-left-2">Acadêmico</p>}
            <NavItem icon="groups" label="Minhas Turmas" to="/instructor" matchPaths={['/instructor']} />
          </>
        )}

        {userRole === 'ADMIN' && (
          <>
            {isOpen && <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 animate-in slide-in-from-left-2">Administração</p>}
            <NavItem icon="admin_panel_settings" label="Console Geral" to="/admin" />
            <NavItem icon="class" label="Gestão de Turmas" to="/admin/classes" matchPaths={['/admin/class']} />
            <NavItem icon="group" label="Usuários" to="/admin/users" />
            <NavItem icon="settings" label="Configurações" to="/admin/settings" />
          </>
        )}

      </div>
      </aside>
    </>
  );
};

export default Sidebar;
