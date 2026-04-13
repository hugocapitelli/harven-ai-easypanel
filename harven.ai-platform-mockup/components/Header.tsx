import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { notificationsApi, searchApi, usersApi } from '../services/api';
import { safeJsonParse } from '../lib/utils';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ra: string;
  avatar_url: string;
  title: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  link?: string;
  created_at: string;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  link: string;
}

interface HeaderProps {
  title: string;
  userRole: UserRole;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, userRole, onLogout, onToggleSidebar }) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load user data from localStorage and sync with backend
  const loadUserData = async (forceRefresh = false) => {
    const parsed = safeJsonParse<UserData | null>('user-data', null);
    if (parsed) {
      try {
        setUserData(parsed);

        // Fetch fresh data from backend to ensure avatar_url and other fields are current
        if (parsed.id && forceRefresh) {
          try {
            const freshUser = await usersApi.get(parsed.id);
            const updatedData = {
              ...parsed,
              name: freshUser.name || parsed.name,
              email: freshUser.email || parsed.email,
              avatar_url: freshUser.avatar_url || '',
              title: freshUser.title || ''
            };
            setUserData(updatedData);
            // Update localStorage with fresh data
            localStorage.setItem('user-data', JSON.stringify(updatedData));
          } catch (apiError) {
            console.error('Error fetching fresh user data:', apiError);
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  };

  useEffect(() => {
    // Load from localStorage first, then refresh from backend
    loadUserData(true);

    // Listen for custom event when user data is updated (e.g., avatar change)
    const handleUserDataUpdate = () => {
      loadUserData(false); // Don't fetch from API, just reload localStorage
    };

    window.addEventListener('user-data-updated', handleUserDataUpdate);
    // Also listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'user-data') {
        loadUserData(false);
      }
    });

    return () => {
      window.removeEventListener('user-data-updated', handleUserDataUpdate);
    };
  }, []);

  // Load notifications
  useEffect(() => {
    if (userData?.id) {
      loadNotifications();
      loadUnreadCount();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [userData?.id]);

  const loadNotifications = async () => {
    if (!userData?.id) return;
    try {
      const data = await notificationsApi.list(userData.id);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const loadUnreadCount = async () => {
    if (!userData?.id) return;
    try {
      const data = await notificationsApi.getCount(userData.id);
      setUnreadCount(data?.count || 0);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const debounceRef = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    try {
      const data = await searchApi.search(query, userData?.id, userData?.role);
      setSearchResults(data?.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [userData?.id, userData?.role]);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(result.link);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate if has link
    if (notification.link) {
      setIsNotificationsOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userData?.id) return;
    try {
      await notificationsApi.markAllAsRead(userData.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Get display data
  const getDisplayData = () => {
    if (userData) {
      const roleLabels: Record<string, string> = {
        'STUDENT': 'Aluno',
        'INSTRUCTOR': 'Instrutor',
        'ADMIN': 'Administrador'
      };
      return {
        name: userData.name || 'Usuário',
        roleLabel: roleLabels[userData.role] || 'Usuário',
        email: userData.email || `${userData.ra || 'usuario'}@harven.edu`,
        img: userData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'U')}&background=D0FF00&color=0a1f09&bold=true`
      };
    }

    // Fallback for when userData is not loaded yet
    return {
      name: 'Carregando...',
      roleLabel: userRole === 'STUDENT' ? 'Aluno' : userRole === 'INSTRUCTOR' ? 'Instrutor' : 'Admin',
      email: 'carregando@harven.edu',
      img: 'https://ui-avatars.com/api/?name=U&background=D0FF00&color=0a1f09'
    };
  };

  const displayData = getDisplayData();

  // Check if can go back
  const canGoBack = window.history.length > 1;

  const handleBack = () => {
    navigate(-1);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <header className="h-16 bg-harven-dark border-b border-white/5 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-20 relative">
      <div className="flex items-center gap-4">
        {/* Hamburger menu (mobile only) */}
        {onToggleSidebar && (
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            onClick={onToggleSidebar}
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        {canGoBack && (
          <button
            onClick={handleBack}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title="Voltar"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
        )}
        <div className="flex items-center text-sm font-display">
          <span className="text-white font-medium">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile Search Toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          aria-label="Pesquisar"
        >
          <span className="material-symbols-outlined">{mobileSearchOpen ? 'close' : 'search'}</span>
        </button>

        {/* Desktop Search */}
        <div className="hidden md:flex relative" ref={searchRef}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
          <input
            ref={searchInputRef}
            className="bg-[#152214] text-gray-200 text-sm rounded-lg pl-10 pr-4 py-1.5 border border-white/5 focus:outline-none focus:border-primary w-64 placeholder-gray-600 transition-all"
            placeholder="Pesquisar..."
            aria-label="Pesquisar"
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
          />

          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-harven-border dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm">Buscando...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${result.type}-${result.id}-${idx}`}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-gray-400 text-[20px]">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-harven-dark dark:text-white truncate">{result.title}</p>
                        <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded">
                        {result.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-gray-500">
                  <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                  <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Screen reader notification announcement */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {unreadCount > 0 && `${unreadCount} novas notificações`}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              if (!isNotificationsOpen) loadNotifications();
            }}
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Notificações"
            aria-expanded={isNotificationsOpen}
          >
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-primary text-harven-dark text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-harven-dark">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-harven-border dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-harven-dark dark:text-white">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-harven-dark dark:text-white`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                      {!notification.read && (
                        <span className="size-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <span className="material-symbols-outlined text-3xl mb-2">notifications_off</span>
                    <p className="text-sm">Nenhuma notificação</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full text-center text-sm text-primary hover:underline"
                  >
                    Ver todas as notificações
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Button */}
        <button
          onClick={() => window.open('https://help.harven.ai', '_blank')}
          className="p-2 text-gray-400 hover:text-white transition-colors mr-2"
          title="Central de Ajuda"
          aria-label="Central de Ajuda"
        >
          <span className="material-symbols-outlined" aria-hidden="true">help</span>
        </button>

        <div className="h-8 w-px bg-white/10 mx-1"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 hover:bg-white/5 py-1 px-2 rounded-lg transition-colors group outline-none"
            aria-label="Menu do perfil"
            aria-expanded={isProfileOpen}
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-white text-xs font-bold leading-none">{displayData.name}</span>
              <span className="text-gray-400 text-[10px] font-medium leading-none mt-1">{displayData.roleLabel}</span>
            </div>
            <img
              src={displayData.img}
              alt={displayData.name}
              className={`size-9 rounded-full border-2 object-cover transition-all ${isProfileOpen ? 'border-primary' : 'border-harven-gold group-hover:border-white'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayData.name)}&background=D0FF00&color=0a1f09&bold=true`;
              }}
            />
            <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 border border-harven-border dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                <p className="text-sm font-bold text-harven-dark dark:text-white">{displayData.name}</p>
                <p className="text-xs text-gray-500 truncate">{displayData.email}</p>
              </div>

              <button
                onClick={() => { navigate('/account'); setIsProfileOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-harven-dark dark:hover:text-white flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configurações da Conta
              </button>

              <button
                onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-harven-dark dark:hover:text-white flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Meu Perfil
              </button>

              <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

              <button
                onClick={() => { onLogout(); setIsProfileOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sair da Plataforma
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile Search Bar (full width, below header) */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 p-3 bg-harven-dark border-b border-white/5 shadow-lg md:hidden z-50">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full bg-[#152214] text-gray-200 text-sm rounded-lg pl-10 pr-4 py-2 border border-white/5 focus:outline-none focus:border-primary placeholder-gray-600"
              value={searchQuery}
              onChange={onSearchChange}
              autoFocus
              aria-label="Pesquisar"
            />
          </div>
          {isSearchOpen && searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-harven-border dark:border-gray-700 max-h-64 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={`mobile-${result.type}-${result.id}-${idx}`}
                  onClick={() => { handleSearchResultClick(result); setMobileSearchOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-harven-dark dark:text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
