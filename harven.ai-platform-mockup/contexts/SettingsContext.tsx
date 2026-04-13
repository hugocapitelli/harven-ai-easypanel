
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { adminApi, publicApi } from '../services/api';

export interface SystemSettingsData {
    platform_name: string;
    base_url: string;
    support_email: string;
    primary_color: string;
    logo_url: string;
    login_logo_url: string;
    login_bg_url: string;
    module_auto_register: boolean;
    module_ai_tutor: boolean;
    module_gamification: boolean;
    module_dark_mode: boolean;
    limit_tokens: number;
    limit_upload_mb: number;
    ai_daily_token_limit: number;
    openai_key?: string;
    anthropic_connected: boolean;
    sso_azure: boolean;
    sso_google: boolean;
    pwd_min_length: number;
    pwd_special_chars: boolean;
    pwd_expiration: boolean;
    session_timeout: string;
    force_2fa: boolean;
    
    // Novos campos
    moodle_url: string;
    moodle_token: string;
    smtp_server: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    firewall_blocked_ips: string;
    firewall_whitelist: string;
    backup_enabled: boolean;
    backup_frequency: string;
    backup_retention: number;
}

interface SettingsContextType {
    settings: SystemSettingsData;
    loading: boolean;
    dirty: boolean;
    refreshSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<SystemSettingsData>) => Promise<void>;
    updateSettingsLocal: (newSettings: Partial<SystemSettingsData>) => void;
    saveSettings: () => Promise<void>;
}

const defaultSettings: SystemSettingsData = {
    platform_name: 'Harven.AI',
    base_url: 'https://harven.eximiaventures.com.br',
    support_email: 'suporte@harven.ai',
    primary_color: '#d0ff00',
    logo_url: '',
    login_logo_url: '',
    login_bg_url: '',
    module_auto_register: true,
    module_ai_tutor: true,
    module_gamification: true,
    module_dark_mode: true,
    limit_tokens: 2048,
    limit_upload_mb: 500,
    ai_daily_token_limit: 500000,
    anthropic_connected: false,
    sso_azure: true,
    sso_google: false,
    pwd_min_length: 8,
    pwd_special_chars: true,
    pwd_expiration: false,
    session_timeout: '30 minutos',
    force_2fa: false,
    
    // Defaults novos
    moodle_url: '',
    moodle_token: '',
    smtp_server: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    firewall_blocked_ips: '',
    firewall_whitelist: '',
    backup_enabled: true,
    backup_frequency: 'Diário',
    backup_retention: 30
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const settingsRef = useRef(settings);

    // Keep ref in sync with state
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    const applyBranding = useCallback((data: SystemSettingsData) => {
        document.documentElement.style.setProperty('--primary-color', data.primary_color);
        document.title = data.platform_name;
    }, []);

    const refreshSettings = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('harven-access-token');
            let data;
            if (token) {
                // Only call admin endpoint if user is admin (avoids 403 in console)
                const userData = sessionStorage.getItem('user-data');
                const isAdmin = userData && JSON.parse(userData)?.role === 'ADMIN';
                if (isAdmin) {
                    try {
                        data = await adminApi.getSettings();
                    } catch {
                        data = await publicApi.getSettings();
                    }
                } else {
                    data = await publicApi.getSettings();
                }
            } else {
                data = await publicApi.getSettings();
            }
            if (data) {
                const merged = { ...defaultSettings, ...data };
                setSettings(merged);
                settingsRef.current = merged;
                applyBranding(merged);
                setDirty(false);
            }
        } catch (error) {
            console.error("Erro ao carregar settings", error);
        } finally {
            setLoading(false);
        }
    };

    // Local-only update (no API call) - use for text fields, toggles during editing
    const updateSettingsLocal = useCallback((newSettings: Partial<SystemSettingsData>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            applyBranding(updated);
            return updated;
        });
        setDirty(true);
    }, [applyBranding]);

    // Immediate update + persist (use for file uploads that need instant save)
    const updateSettings = async (newSettings: Partial<SystemSettingsData>) => {
        const updated = { ...settingsRef.current, ...newSettings };
        setSettings(updated);
        settingsRef.current = updated;
        applyBranding(updated);
        await adminApi.saveSettings(updated);
        setDirty(false);
    };

    // Explicit save of current settings to API
    const saveSettings = async () => {
        await adminApi.saveSettings(settingsRef.current);
        setDirty(false);
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, dirty, refreshSettings, updateSettings, updateSettingsLocal, saveSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
