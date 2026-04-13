import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { UserRole } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './views/Login';
import AppRoutes from './routes';
import { useSettings } from './contexts/SettingsContext';
import { safeJsonParse } from './lib/utils';

// Componente interno que usa os hooks do Router
const AppContent: React.FC = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('STUDENT');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);

    // Redireciona para a view inicial correta baseada no papel
    if (role === 'ADMIN') {
      navigate('/admin');
    } else if (role === 'INSTRUCTOR') {
      navigate('/instructor');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('harven-access-token');
    sessionStorage.removeItem('user-data');
    navigate('/');
  }, [navigate]);

  // Check auth on mount (including LTI callback)
  useEffect(() => {
    // Handle LTI callback from Moodle — /lti-callback?lti_token=...&lti_user=...
    const params = new URLSearchParams(window.location.search);
    const ltiToken = params.get('lti_token');
    const ltiUser = params.get('lti_user');

    if (ltiToken && ltiUser) {
      try {
        const user = JSON.parse(ltiUser);
        sessionStorage.setItem('harven-access-token', ltiToken);
        sessionStorage.setItem('user-data', JSON.stringify(user));
        setIsAuthenticated(true);
        setUserRole(user.role as UserRole);

        // Clean URL params and redirect to correct home
        const role = user.role as UserRole;
        if (role === 'ADMIN') navigate('/admin', { replace: true });
        else if (role === 'INSTRUCTOR') navigate('/instructor', { replace: true });
        else navigate('/dashboard', { replace: true });
        return;
      } catch (e) {
        console.error('LTI callback: failed to parse user data', e);
      }
    }

    // Standard auth check
    const token = sessionStorage.getItem('harven-access-token');
    const userData = sessionStorage.getItem('user-data');

    if (token && userData) {
      const user = safeJsonParse('user-data', null);
      if (user && user.role) {
        setIsAuthenticated(true);
        setUserRole(user.role as UserRole);

        if (location.pathname === '/') {
          if (user.role === 'STUDENT') navigate('/dashboard');
          else if (user.role === 'INSTRUCTOR') navigate('/instructor');
          else if (user.role === 'ADMIN') navigate('/admin');
        }
      } else {
        sessionStorage.removeItem('harven-access-token');
        sessionStorage.removeItem('user-data');
      }
    }
  }, []);

  // Idle timeout — auto-logout after session_timeout minutes of inactivity
  const warningToastId = useRef<string | number | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;

    const parseMs = (s: string) => {
      const m = s.match(/(\d+)\s*(minuto|hora)/i);
      if (!m) return 30 * 60_000;
      return m[2].toLowerCase().startsWith('hora')
        ? parseInt(m[1]) * 3_600_000
        : parseInt(m[1]) * 60_000;
    };

    const timeoutMs = parseMs(settings.session_timeout);
    const warningMs = Math.max(timeoutMs - 60_000, timeoutMs * 0.85);

    let idleTimer: ReturnType<typeof setTimeout>;
    let warnTimer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      if (warningToastId.current !== null) {
        toast.dismiss(warningToastId.current as string | number);
        warningToastId.current = null;
      }
      warnTimer = setTimeout(() => {
        warningToastId.current = toast.warning(
          'Sua sessão expira em 1 minuto por inatividade.',
          { duration: 60_000 }
        );
      }, warningMs);
      idleTimer = setTimeout(() => {
        toast.error('Sessão encerrada por inatividade.');
        handleLogout();
      }, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [isAuthenticated, settings.session_timeout, handleLogout]);

  // Mapeamento de rotas para títulos
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/dashboard') return 'Dashboard do Aluno';
    if (path === '/achievements') return 'Minhas Conquistas';
    if (path === '/history') return 'Histórico de Atividades';
    if (path === '/courses') return 'Meus Estudos';
    if (path.match(/^\/course\/[^/]+$/)) return 'Detalhes do Curso';
    if (path.match(/^\/course\/[^/]+\/edit$/)) return 'Editor de Curso';
    if (path.match(/^\/course\/[^/]+\/chapter\/[^/]+$/)) return 'Visão Geral do Capítulo';
    if (path.match(/^\/course\/[^/]+\/chapter\/[^/]+\/content\/[^/]+$/)) return 'Leitura e Prática Socrática';
    if (path.match(/^\/course\/[^/]+\/chapter\/[^/]+\/new-content$/)) return 'Adicionar Conteúdo';
    if (path.match(/^\/course\/[^/]+\/chapter\/[^/]+\/content\/[^/]+\/revision$/)) return 'Revisão de Conteúdo AI';
    if (path === '/instructor') return 'Portal do Instrutor';
    if (path.match(/^\/instructor\/class\/[^/]+$/)) return 'Gestão de Turma';
    if (path.match(/^\/instructor\/discipline\/[^/]+/)) return 'Editor de Disciplina';
    if (path === '/admin') return 'Console de Administração';
    if (path === '/admin/classes') return 'Gestão de Turmas';
    if (path === '/admin/users') return 'Gestão de Usuários';
    if (path === '/admin/settings') return 'Configurações do Sistema';
    if (path === '/profile') return 'Meu Perfil';
    if (path === '/account') return 'Minha Conta';

    return settings.platform_name || 'Harven.ai';
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (settingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-harven-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-harven-bg dark:bg-gray-950 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userRole={userRole}
        logoUrl={settings.logo_url}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getPageTitle()}
          userRole={userRole}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <AppRoutes
            userRole={userRole}
            gamificationEnabled={settings.module_gamification}
          />
        </main>
      </div>
    </div>
  );
};

// Componente principal que envolve tudo com BrowserRouter
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
