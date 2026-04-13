
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../services/api';

import { useSettings } from '../contexts/SettingsContext';
import ConfirmDialog from '../components/ConfirmDialog';

const SystemSettings: React.FC = () => {
    const { settings, updateSettings, updateSettingsLocal, saveSettings, dirty, loading: contextLoading } = useSettings();
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'backups' | 'performance' | 'logs'>('general');
    const [logs, setLogs] = useState<any[]>([]);

    // Real Backups Data
    const [backups, setBackups] = useState<any[]>([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

    // Real Performance Data
    const [perfStats, setPerfStats] = useState({
        cacheHitRate: 'Carregando...',
        cacheSize: '-',
        cpu: '-',
        ram: '-',
        ram_detail: '-',
        disk: '-',
        disk_detail: '-',
        uptime: 'Carregando...',
        db_latency: '-',
        status: 'loading'
    });
    const [perfLoading, setPerfLoading] = useState(false);

    // Real Storage Data
    const [storageStats, setStorageStats] = useState<any>(null);

    // Log filtering
    const [logSearch, setLogSearch] = useState('');
    const [logType, setLogType] = useState('all');
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsTotal, setLogsTotal] = useState(0);
    const [logsOffset, setLogsOffset] = useState(0);
    const [hasMoreLogs, setHasMoreLogs] = useState(false);

    // Security actions
    const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
    const [clearCacheLoading, setClearCacheLoading] = useState(false);

    const [showLoginPreview, setShowLoginPreview] = useState(false);

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState<{open: boolean; title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});


    useEffect(() => {
        const controller = new AbortController();
        const doLoad = async () => {
            try {
                await loadLogs();
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Erro ao carregar logs iniciais:', error);
            }
        };
        doLoad();
        return () => controller.abort();
    }, []);

    // Load performance data when tab is active
    useEffect(() => {
        if (activeTab !== 'performance') return;
        const controller = new AbortController();
        const doLoad = async () => {
            try {
                await Promise.all([loadPerformance(), loadStorage()]);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Erro ao carregar performance:', error);
            }
        };
        doLoad();
        return () => controller.abort();
    }, [activeTab]);

    // Load backups when tab is active
    useEffect(() => {
        if (activeTab !== 'backups') return;
        const controller = new AbortController();
        const doLoad = async () => {
            try {
                await loadBackups();
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Erro ao carregar backups:', error);
            }
        };
        doLoad();
        return () => controller.abort();
    }, [activeTab]);


    const loadLogs = async (search?: string, type?: string, offset: number = 0) => {
        setLogsLoading(true);
        try {
            const result = await adminApi.searchLogs({
                query: search || logSearch || undefined,
                log_type: (type || logType) !== 'all' ? (type || logType) : undefined,
                limit: 50,
                offset
            });
            if (offset === 0) {
                setLogs(result.logs || []);
            } else {
                setLogs(prev => [...prev, ...(result.logs || [])]);
            }
            setLogsTotal(result.total || 0);
            setHasMoreLogs(result.has_more || false);
            setLogsOffset(offset);
        } catch (error) {
            console.error("Erro ao carregar logs", error);
            // Fallback to simple logs endpoint
            try {
                const data = await adminApi.getLogs();
                setLogs(data || []);
            } catch (e) {
                setLogs([]);
            }
        } finally {
            setLogsLoading(false);
        }
    };

    const loadPerformance = async () => {
        setPerfLoading(true);
        try {
            const data = await adminApi.getPerformance();
            setPerfStats({
                cacheHitRate: data.cache_hit_rate || 'N/A',
                cacheSize: data.ram_detail || 'N/A',
                cpu: data.cpu || 'N/A',
                ram: data.ram || 'N/A',
                ram_detail: data.ram_detail || '',
                disk: data.disk || 'N/A',
                disk_detail: data.disk_detail || '',
                uptime: data.uptime || 'N/A',
                db_latency: data.db_latency || 'N/A',
                status: data.status || 'unknown'
            });
        } catch (error) {
            console.error("Erro ao carregar performance", error);
            setPerfStats(prev => ({ ...prev, status: 'error' }));
        } finally {
            setPerfLoading(false);
        }
    };

    const loadStorage = async () => {
        try {
            const data = await adminApi.getStorageStats();
            setStorageStats(data);
        } catch (error) {
            console.error("Erro ao carregar storage", error);
        }
    };

    const loadBackups = async () => {
        setBackupsLoading(true);
        try {
            const data = await adminApi.listBackups();
            setBackups(data || []);
        } catch (error) {
            console.error("Erro ao carregar backups", error);
            setBackups([]);
        } finally {
            setBackupsLoading(false);
        }
    };


    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        try {
            const result = await adminApi.createBackup();
            if (result.success) {
                toast.success(`Backup criado com sucesso: ${result.backup?.name || 'backup'}`);
                await loadBackups();
            }
        } catch (error) {
            console.error("Erro ao criar backup", error);
            toast.error("Erro ao criar backup. Tente novamente.");
        } finally {
            setCreatingBackup(false);
        }
    };

    const handleDownloadBackup = async (backupId: string) => {
        try {
            const result = await adminApi.downloadBackup(backupId);
            if (result.download_url) {
                window.open(result.download_url, '_blank');
            } else {
                toast.error('URL de download nao disponivel');
            }
        } catch (error: unknown) {
            console.error('Erro ao baixar backup', error);
            toast.error(`Erro ao baixar backup: ${(error as any)?.response?.data?.detail || (error as Error).message}`);
        }
    };

    const handleDeleteBackup = (backupId: string, backupName: string) => {
        setConfirmDialog({
            open: true,
            title: 'Deletar Backup',
            message: `Tem certeza que deseja deletar o backup "${backupName}"? Esta acao nao pode ser desfeita.`,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setDeletingBackupId(backupId);
                try {
                    await adminApi.deleteBackup(backupId);
                    toast.success('Backup deletado com sucesso');
                    await loadBackups();
                } catch (error: unknown) {
                    console.error('Erro ao deletar backup', error);
                    toast.error(`Erro ao deletar: ${(error as any)?.response?.data?.detail || (error as Error).message}`);
                } finally {
                    setDeletingBackupId(null);
                }
            }
        });
    };

    const handleForceLogout = async () => {
        setConfirmDialog({
            open: true,
            title: 'Desconectar Todos os Usuários',
            message: 'Tem certeza que deseja desconectar TODOS os usuarios? Eles precisarao fazer login novamente.',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setForceLogoutLoading(true);
                try {
                    const result = await adminApi.forceLogoutAll();
                    if (result.success) {
                        toast.success(result.message || "Todos os usuarios foram desconectados.");
                    }
                } catch (error) {
                    console.error("Erro ao forcar logout", error);
                    toast.error("Erro ao executar logout forcado.");
                } finally {
                    setForceLogoutLoading(false);
                }
            }
        });
    };

    const handleClearCache = async () => {
        setClearCacheLoading(true);
        try {
            const result = await adminApi.clearCache();
            if (result.success) {
                toast.success(result.message || "Cache limpo com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao limpar cache", error);
            toast.error("Erro ao limpar cache.");
        } finally {
            setClearCacheLoading(false);
        }
    };

    const handleExportLogs = async (format: 'json' | 'csv') => {
        try {
            const data = await adminApi.exportLogs(format);
            if (format === 'csv') {
                // Download CSV
                const blob = new Blob([data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'system_logs.csv';
                a.click();
            } else {
                // Download JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'system_logs.json';
                a.click();
            }
        } catch (error) {
            console.error("Erro ao exportar logs", error);
            toast.error("Erro ao exportar logs.");
        }
    };

    const handleLogSearch = () => {
        loadLogs(logSearch, logType, 0);
    };

    const handleLoadMoreLogs = () => {
        loadLogs(logSearch, logType, logsOffset + 50);
    };

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await saveSettings();
            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar settings:", error);
            toast.error("Erro ao salvar configurações. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        updateSettingsLocal({ [field]: value });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const tempUrl = URL.createObjectURL(file);
            updateSettings({ logo_url: tempUrl });

            try {
                const result = await adminApi.uploadLogo(file);
                updateSettings({ logo_url: result.url });
            } catch (error) {
                console.error("Erro ao fazer upload do logo:", error);
                toast.error("Erro ao fazer upload. Tente novamente.");
            }
        }
    };

    const handleLoginLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const tempUrl = URL.createObjectURL(file);
            updateSettings({ login_logo_url: tempUrl });

            try {
                const result = await adminApi.uploadLoginLogo(file);
                updateSettings({ login_logo_url: result.url });
            } catch (error) {
                console.error("Erro ao fazer upload do logo de login:", error);
                toast.error("Erro ao fazer upload. Tente novamente.");
            }
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const tempUrl = URL.createObjectURL(file);
            updateSettings({ login_bg_url: tempUrl });

            try {
                const result = await adminApi.uploadLoginBg(file);
                updateSettings({ login_bg_url: result.url });
            } catch (error) {
                console.error("Erro ao fazer upload do background:", error);
                toast.error("Erro ao fazer upload. Tente novamente.");
            }
        }
    };

    const handleRestoreColor = () => {
        updateSettingsLocal({ primary_color: '#D0FF00' });
    };

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-harven-bg dark:bg-gray-950">
            {/* Sticky Header with Tabs */}
            <div className="bg-white dark:bg-gray-900 border-b border-harven-border dark:border-gray-800 px-8 py-4 flex-shrink-0 z-10 sticky top-0 shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div className="flex gap-8 overflow-x-auto no-scrollbar w-full md:w-auto">
                        {[
                            { id: 'general', label: 'Geral' },
                            { id: 'security', label: 'Seguranca' },
                            { id: 'backups', label: 'Backups' },
                            { id: 'performance', label: 'Performance' },
                            { id: 'logs', label: 'Logs de Auditoria' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`text-sm font-bold pb-4 -mb-4 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-harven-dark dark:text-primary border-b-4 border-primary'
                                    : 'text-gray-400 hover:text-harven-dark dark:hover:text-gray-200 border-b-4 border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end w-full md:w-auto items-center gap-3">
                        {dirty && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Alteracoes nao salvas</span>}
                        <button
                            onClick={handleSave}
                            disabled={saving || contextLoading}
                            className={`${dirty ? 'bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20' : 'bg-gray-200 hover:bg-gray-300'} transition-all text-harven-dark font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50`}>
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            {saving ? 'Salvando...' : 'Salvar Alteracoes'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto flex flex-col gap-10">
                    <LoginPreviewModal
                        isOpen={showLoginPreview}
                        onClose={() => setShowLoginPreview(false)}
                        settings={settings}
                    />

                    {/* TAB: GERAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Identidade */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-harven-border dark:border-gray-700 p-8 shadow-sm space-y-6">
                                    <h4 className="text-xs font-black text-harven-gold uppercase tracking-widest border-b border-harven-bg pb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">badge</span> Identidade do Site
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome da Plataforma</label>
                                            <input
                                                className="w-full bg-harven-bg dark:bg-gray-900 border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary text-harven-dark dark:text-white"
                                                value={settings.platform_name || ''}
                                                onChange={(e) => handleChange('platform_name', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-mail de Suporte</label>
                                        <input
                                            className="w-full bg-harven-bg dark:bg-gray-900 border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary text-harven-dark dark:text-white"
                                            value={settings.support_email || ''}
                                            onChange={(e) => handleChange('support_email', e.target.value)}
                                        />
                                        <p className="text-[9px] font-bold text-gray-400 uppercase italic">Visivel para alunos no rodape.</p>
                                    </div>
                                </div>

                                {/* Branding */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-harven-border dark:border-gray-700 p-8 shadow-sm space-y-6">
                                    <h4 className="text-xs font-black text-harven-gold uppercase tracking-widest border-b border-harven-bg pb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">palette</span> Branding
                                    </h4>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-harven-dark dark:text-white uppercase">Cor Primaria</span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleRestoreColor}
                                                    title="Restaurar padrao"
                                                    className="size-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[12px]">restart_alt</span>
                                                </button>
                                                <div className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="color"
                                                        value={settings.primary_color || '#D0FF00'}
                                                        onChange={(e) => handleChange('primary_color', e.target.value)}
                                                        className="w-8 h-8 rounded-full border-none p-0 overflow-hidden cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 group-hover:text-harven-dark">{settings.primary_color}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-harven-bg space-y-3">
                                            <label className="text-xs font-bold text-harven-dark uppercase block">Logotipo Oficial (Sistema)</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-harven-dark p-3 rounded-lg flex items-center justify-center border border-harven-border">
                                                    <img src={settings.logo_url} alt="Logo White" className="h-8 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                </div>
                                            </div>

                                            <label className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 group hover:border-primary transition-all cursor-pointer bg-harven-bg/30 mt-2 relative">
                                                <span className="material-symbols-outlined text-gray-300 group-hover:text-primary-dark text-2xl">upload_file</span>
                                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-harven-dark">ATUALIZAR LOGO DO SISTEMA</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            </label>
                                        </div>

                                        <div className="pt-4 border-t border-harven-bg space-y-3">
                                            <label className="text-xs font-bold text-harven-dark uppercase block">Logotipo de Login</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-harven-dark p-3 rounded-lg flex items-center justify-center border border-harven-border">
                                                    <img src={settings.login_logo_url} alt="Login Logo" className="h-8 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                </div>
                                            </div>

                                            <label className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 group hover:border-primary transition-all cursor-pointer bg-harven-bg/30 mt-2 relative">
                                                <span className="material-symbols-outlined text-gray-300 group-hover:text-primary-dark text-2xl">upload_file</span>
                                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-harven-dark">ATUALIZAR LOGO DE LOGIN</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLoginLogoUpload} />
                                            </label>
                                        </div>

                                        <div className="pt-4 border-t border-harven-bg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-harven-dark uppercase block">Imagem de Fundo (Login)</label>
                                                <button
                                                    onClick={() => setShowLoginPreview(true)}
                                                    className="text-[10px] font-bold text-primary-dark hover:underline uppercase flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                    Visualizar Exemplo
                                                </button>
                                            </div>
                                            <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-harven-border relative group">
                                                <img src={settings.login_bg_url} className="w-full h-full object-cover" />
                                                <button onClick={() => setShowLoginPreview(true)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                    <span className="text-white text-xs font-bold uppercase">Visualizar Tela Inteira</span>
                                                </button>
                                            </div>

                                            <label className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 group hover:border-primary transition-all cursor-pointer bg-harven-bg/30 mt-2 relative">
                                                <span className="material-symbols-outlined text-gray-300 group-hover:text-primary-dark text-2xl">image</span>
                                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-harven-dark">ALTERAR WALLPAPER</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Funcionalidades */}
                                <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm space-y-6">
                                    <h4 className="text-xs font-black text-harven-gold uppercase tracking-widest border-b border-harven-bg pb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">toggle_on</span> Modulos
                                    </h4>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'module_ai_tutor', label: 'Tutor Socratico (AI)', desc: 'Habilita o chat de IA nos capitulos.' },
                                            { key: 'module_gamification', label: 'Gamificacao & Ranking', desc: 'Exibe leaderboards e medalhas.' },
                                            { key: 'module_dark_mode', label: 'Modo Escuro', desc: 'Permite alternar tema.' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex justify-between items-start group">
                                                <div>
                                                    <p className="text-sm font-bold text-harven-dark dark:text-white group-hover:text-primary-dark transition-colors">{item.label}</p>
                                                    <p className="text-[10px] text-gray-400">{item.desc}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer mt-1">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={settings[item.key] === true}
                                                        onChange={(e) => handleChange(item.key, e.target.checked)}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Limites */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-harven-border dark:border-gray-700 p-8 shadow-sm space-y-6">
                                    <h4 className="text-xs font-black text-harven-gold uppercase tracking-widest border-b border-harven-bg pb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">data_usage</span> Quotas & Limites
                                    </h4>
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max. Tokens IA / Resposta</label>
                                                <span className="text-[10px] font-bold text-harven-dark dark:text-white">{settings.limit_tokens}</span>
                                            </div>
                                            <input
                                                type="range"
                                                className="w-full accent-primary"
                                                min="512"
                                                max="4096"
                                                value={settings.limit_tokens || 2048}
                                                onChange={(e) => handleChange('limit_tokens', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-harven-dark dark:text-white uppercase">Limite Upload (MB)</span>
                                            <input
                                                className="w-24 bg-harven-bg dark:bg-gray-900 border-none rounded-lg py-1.5 px-3 text-sm font-bold text-right focus:ring-1 focus:ring-primary text-harven-dark dark:text-white"
                                                value={settings.limit_upload_mb || 500}
                                                onChange={(e) => handleChange('limit_upload_mb', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Limite Diario IA / Usuario</label>
                                                <span className="text-[10px] font-bold text-harven-dark dark:text-white">{((settings.ai_daily_token_limit || 500000) / 1000).toLocaleString()}K tokens</span>
                                            </div>
                                            <input
                                                type="range"
                                                className="w-full accent-primary"
                                                min="0"
                                                max="2000000"
                                                step="50000"
                                                value={settings.ai_daily_token_limit || 500000}
                                                onChange={(e) => handleChange('ai_daily_token_limit', parseInt(e.target.value))}
                                            />
                                        </div>
                                        {storageStats && (
                                            <div className={`p-4 rounded-xl border flex gap-3 items-center ${storageStats.db_usage_percent > 80 ? 'bg-red-50 border-red-100' : storageStats.db_usage_percent > 50 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                                                <span className={`material-symbols-outlined ${storageStats.db_usage_percent > 80 ? 'text-red-500' : storageStats.db_usage_percent > 50 ? 'text-orange-500' : 'text-green-500'}`}>
                                                    {storageStats.db_usage_percent > 80 ? 'warning' : 'storage'}
                                                </span>
                                                <div>
                                                    <p className={`text-[10px] font-bold uppercase ${storageStats.db_usage_percent > 80 ? 'text-red-700' : storageStats.db_usage_percent > 50 ? 'text-orange-700' : 'text-green-700'}`}>Armazenamento</p>
                                                    <p className={`text-xs font-bold ${storageStats.db_usage_percent > 80 ? 'text-red-900' : storageStats.db_usage_percent > 50 ? 'text-orange-900' : 'text-green-900'}`}>
                                                        {storageStats.db_usage_percent}% Utilizado ({storageStats.estimated_db_mb}MB / {storageStats.db_limit_mb}MB)
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 mt-1">{storageStats.total_records} registros no banco</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB: SEGURANCA */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm">
                                <h3 className="text-lg font-display font-bold text-harven-dark mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500">lock</span>
                                    Politicas de Acesso
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Senhas</h4>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 p-3 border border-harven-border rounded-lg cursor-pointer hover:bg-harven-bg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-primary focus:ring-primary"
                                                    checked={settings.pwd_min_length >= 8}
                                                    onChange={(e) => handleChange('pwd_min_length', e.target.checked ? 8 : 4)}
                                                />
                                                <span className="text-sm font-bold text-harven-dark">Exigir Minimo de 8 Caracteres</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 border border-harven-border rounded-lg cursor-pointer hover:bg-harven-bg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-primary focus:ring-primary"
                                                    checked={settings.pwd_special_chars === true}
                                                    onChange={(e) => handleChange('pwd_special_chars', e.target.checked)}
                                                />
                                                <span className="text-sm font-bold text-harven-dark">Exigir Caracteres Especiais (!@#)</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 border border-harven-border rounded-lg cursor-pointer hover:bg-harven-bg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-primary focus:ring-primary"
                                                    checked={settings.pwd_expiration === true}
                                                    onChange={(e) => handleChange('pwd_expiration', e.target.checked)}
                                                />
                                                <span className="text-sm font-bold text-harven-dark">Expiracao de Senha (90 dias)</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Sessao</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeout de Sessao Ociosa</label>
                                            <select
                                                className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                                value={settings.session_timeout || '30 minutos'}
                                                onChange={(e) => handleChange('session_timeout', e.target.value)}
                                            >
                                                <option>15 minutos</option>
                                                <option>30 minutos</option>
                                                <option>1 hora</option>
                                                <option>Nunca</option>
                                            </select>
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                onClick={handleForceLogout}
                                                disabled={forceLogoutLoading}
                                                className="w-full py-3 bg-red-50 text-red-600 font-bold text-xs uppercase rounded-lg border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {forceLogoutLoading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                                                Forcar Logout de Todos os Usuarios
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-harven-dark">Autenticacao de Dois Fatores (2FA)</h4>
                                    <p className="text-xs text-gray-500 mt-1">Obrigar administradores e professores a usarem 2FA.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.force_2fa === true}
                                        onChange={(e) => handleChange('force_2fa', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm">
                                <h3 className="text-lg font-display font-bold text-harven-dark mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-500">security</span>
                                    Firewall & Bloqueios
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IPs Bloqueados (Um por linha)</label>
                                        <textarea
                                            className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-mono focus:ring-1 focus:ring-primary text-harven-dark h-24"
                                            value={settings.firewall_blocked_ips || ''}
                                            onChange={(e) => handleChange('firewall_blocked_ips', e.target.value)}
                                            placeholder="192.168.1.100..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Whitelist de IPs</label>
                                        <textarea
                                            className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-mono focus:ring-1 focus:ring-primary text-harven-dark h-24"
                                            value={settings.firewall_whitelist || ''}
                                            onChange={(e) => handleChange('firewall_whitelist', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: BACKUPS */}
                    {activeTab === 'backups' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm">
                                <h3 className="text-lg font-display font-bold text-harven-dark mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">backup</span>
                                    Configuracao de Backup
                                </h3>

                                <div className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-xl mb-6">
                                    <div>
                                        <h4 className="font-bold text-harven-dark">Backup Automatico</h4>
                                        <p className="text-xs text-gray-500">Executa backups periodicos do banco de dados.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <select
                                            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold"
                                            value={settings.backup_frequency}
                                            onChange={(e) => handleChange('backup_frequency', e.target.value)}
                                        >
                                            <option>Diario</option>
                                            <option>Semanal</option>
                                            <option>Mensal</option>
                                        </select>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.backup_enabled}
                                                onChange={(e) => handleChange('backup_enabled', e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Backups Recentes</h4>
                                    <div className="border border-harven-border rounded-xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-3">Arquivo</th>
                                                    <th className="p-3">Data</th>
                                                    <th className="p-3">Tamanho</th>
                                                    <th className="p-3">Tipo</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 text-right">Acoes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {backupsLoading ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                            <p className="mt-2">Carregando backups...</p>
                                                        </td>
                                                    </tr>
                                                ) : backups.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                                            Nenhum backup encontrado. Crie o primeiro backup.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    backups.map(bkp => (
                                                        <tr key={bkp.id} className="text-sm hover:bg-gray-50/50">
                                                            <td className="p-3 font-mono text-gray-600">{bkp.name}</td>
                                                            <td className="p-3 text-gray-500">{bkp.created_at ? new Date(bkp.created_at).toLocaleDateString() : '-'}</td>
                                                            <td className="p-3 text-gray-500">{bkp.size_mb ? `${bkp.size_mb} MB` : '-'}</td>
                                                            <td className="p-3 text-gray-500">{bkp.type || 'manual'}</td>
                                                            <td className="p-3">
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${bkp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {bkp.status || 'desconhecido'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleDownloadBackup(bkp.id)}
                                                                        disabled={!bkp.storage_path}
                                                                        title={bkp.storage_path ? 'Baixar backup' : 'Backup sem arquivo (antigo)'}
                                                                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">download</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteBackup(bkp.id, bkp.name)}
                                                                        disabled={deletingBackupId === bkp.id}
                                                                        title="Deletar backup"
                                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50 transition-colors"
                                                                    >
                                                                        <span className={`material-symbols-outlined text-[16px] ${deletingBackupId === bkp.id ? 'animate-spin' : ''}`}>
                                                                            {deletingBackupId === bkp.id ? 'progress_activity' : 'delete'}
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <button
                                            onClick={handleCreateBackup}
                                            disabled={creatingBackup}
                                            className="bg-harven-dark hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {creatingBackup ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                                    Criando...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                                                    Fazer Backup Agora
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: PERFORMANCE */}
                    {activeTab === 'performance' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-display font-bold text-harven-dark">Metricas do Sistema</h3>
                                <button
                                    onClick={loadPerformance}
                                    disabled={perfLoading}
                                    className="text-xs font-bold text-primary-dark hover:underline flex items-center gap-1"
                                >
                                    <span className={`material-symbols-outlined text-[14px] ${perfLoading ? 'animate-spin' : ''}`}>refresh</span>
                                    Atualizar
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm flex flex-col items-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-green-500 mb-2">schedule</span>
                                    <h4 className="text-2xl font-bold text-harven-dark font-display">{perfStats.uptime}</h4>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Uptime do Sistema</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm flex flex-col items-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-blue-500 mb-2">memory</span>
                                    <h4 className="text-2xl font-bold text-harven-dark font-display">{perfStats.ram}</h4>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Uso de Memoria</p>
                                    <p className="text-[10px] text-gray-300 mt-1">{perfStats.ram_detail}</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm flex flex-col items-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-orange-500 mb-2">developer_board</span>
                                    <h4 className="text-2xl font-bold text-harven-dark font-display">{perfStats.cpu}</h4>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Uso de CPU</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm flex flex-col items-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-purple-500 mb-2">storage</span>
                                    <h4 className="text-2xl font-bold text-harven-dark font-display">{perfStats.disk}</h4>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Uso de Disco</p>
                                    <p className="text-[10px] text-gray-300 mt-1">{perfStats.disk_detail}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-cyan-500">database</span>
                                        <div>
                                            <h4 className="font-bold text-harven-dark">Latencia do Banco</h4>
                                            <p className="text-2xl font-display font-bold text-cyan-600">{perfStats.db_latency}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-harven-border p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-emerald-500">speed</span>
                                        <div>
                                            <h4 className="font-bold text-harven-dark">Cache Hit Rate</h4>
                                            <p className="text-2xl font-display font-bold text-emerald-600">{perfStats.cacheHitRate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm">
                                <h3 className="text-lg font-display font-bold text-harven-dark mb-6">Controle de Cache</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100">
                                        <div>
                                            <h4 className="font-bold text-harven-dark">Cache de Consultas</h4>
                                            <p className="text-xs text-gray-500">Limpar cache do sistema para forcar atualizacao de dados.</p>
                                        </div>
                                        <button
                                            onClick={handleClearCache}
                                            disabled={clearCacheLoading}
                                            className="text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {clearCacheLoading && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
                                            Limpar Cache
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: LOGS */}
                    {activeTab === 'logs' && (
                        <div className="bg-white rounded-2xl border border-harven-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 min-h-[500px] flex flex-col">
                            <div className="p-6 border-b border-harven-border flex flex-col md:flex-row justify-between items-center gap-4 bg-harven-bg/30">
                                <h3 className="font-display font-bold text-harven-dark flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400">history</span>
                                    Registro de Auditoria
                                    {logsTotal > 0 && <span className="text-xs text-gray-400">({logsTotal} registros)</span>}
                                </h3>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <input
                                        className="bg-white border border-harven-border rounded-lg px-4 py-2 text-xs w-full md:w-64"
                                        placeholder="Buscar por usuario ou acao..."
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLogSearch()}
                                    />
                                    <select
                                        className="bg-white border border-harven-border rounded-lg px-2 py-2 text-xs"
                                        value={logType}
                                        onChange={(e) => {
                                            setLogType(e.target.value);
                                            loadLogs(logSearch, e.target.value, 0);
                                        }}
                                    >
                                        <option value="all">Todos os tipos</option>
                                        <option value="SECURITY">Seguranca</option>
                                        <option value="BACKUP">Backup</option>
                                        <option value="CACHE">Cache</option>
                                        <option value="System">Sistema</option>
                                    </select>
                                    <button
                                        onClick={handleLogSearch}
                                        className="bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg text-harven-dark"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">search</span>
                                    </button>
                                    <button
                                        onClick={() => handleExportLogs('csv')}
                                        className="bg-white border border-harven-border px-3 py-2 rounded-lg text-gray-500 hover:text-harven-dark"
                                        title="Exportar CSV"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-harven-bg/50 border-b border-harven-border text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Mensagem</th>
                                            <th className="p-4">Autor</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-harven-bg">
                                        {logsLoading && logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                    <p className="mt-2">Carregando logs...</p>
                                                </td>
                                            </tr>
                                        ) : logs && logs.length > 0 ? logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-harven-bg/20 transition-colors">
                                                <td className="p-4">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${log.type === 'SECURITY' ? 'bg-red-100 text-red-700' :
                                                            log.type === 'BACKUP' ? 'bg-blue-100 text-blue-700' :
                                                                log.type === 'CACHE' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {log.type || 'System'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-medium text-gray-600 max-w-md truncate">{log.msg}</td>
                                                <td className="p-4 text-xs font-medium text-gray-500 font-mono">{log.author}</td>
                                                <td className="p-4 text-xs text-gray-400">{log.status}</td>
                                                <td className="p-4 text-right text-xs font-bold text-gray-500">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Nenhum log encontrado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {hasMoreLogs && (
                                <div className="p-4 border-t border-harven-border bg-harven-bg/20 flex justify-center">
                                    <button
                                        onClick={handleLoadMoreLogs}
                                        disabled={logsLoading}
                                        className="text-xs font-bold text-primary-dark hover:underline uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {logsLoading ? 'Carregando...' : 'Carregar Mais Antigos'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
export default SystemSettings;

const LoginPreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: any }> = ({ isOpen, onClose, settings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[60] bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full p-2 shadow-sm transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="flex h-full w-full overflow-hidden bg-[#f8f9fa] font-sans pointer-events-none select-none">
                    {/* Lado Esquerdo - Imagem & Branding */}
                    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center bg-[#1c2d1b] overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <img
                                alt="Background Preview"
                                className="w-full h-full object-cover"
                                src={settings.login_bg_url}
                            />
                            <div className="absolute inset-0 bg-[#1c2d1b]/70 mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-black/20"></div>
                        </div>

                        <div className="absolute top-8 left-8 z-20 flex items-center gap-2">
                            <img src={settings.login_logo_url} className="h-8 w-auto object-contain brightness-0 invert" alt="Logo" onError={(e: any) => e.currentTarget.style.display = 'none'} />
                        </div>

                        <div className="relative z-10 p-12 flex flex-col items-center justify-center h-full text-center max-w-xl">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 font-display">
                                Bem-vindo ao <span style={{ color: settings.primary_color }}>{settings.platform_name}</span>
                            </h1>
                            <p className="text-white/90 text-lg font-light leading-relaxed max-w-md">
                                Plataforma educacional que forma pensamento critico atraves da inteligencia artificial
                            </p>
                        </div>

                        <div className="absolute bottom-8 left-8 z-20 text-xs text-white/60">
                            2026 Harven education. All rights reserved.
                        </div>
                    </div>

                    {/* Lado Direito - Formulario de Login (Simulado) */}
                    <div className="w-full lg:w-1/2 flex flex-col relative bg-[#f8f9fa] h-full justify-center items-center p-12">
                        <div className="w-full max-w-md opacity-80">
                            <div className="flex flex-col mb-8">
                                <h2 className="text-3xl font-bold tracking-tight text-[#1c2d1b] mb-2 font-display">Acesse sua conta</h2>
                                <p className="text-gray-500 text-sm">Entre com seu RA e senha institucional</p>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[#1a1d0c] text-sm font-semibold">RA (Registro Academico)</label>
                                    <div className="h-12 w-full bg-gray-100 rounded-lg border border-gray-200"></div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[#1a1d0c] text-sm font-semibold">Senha</label>
                                    <div className="h-12 w-full bg-gray-100 rounded-lg border border-gray-200"></div>
                                </div>
                                <div className="h-12 w-full rounded-lg flex items-center justify-center font-bold text-[#1c2d1b] uppercase tracking-wide shadow-sm" style={{ backgroundColor: settings.primary_color }}>
                                    Entrar
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 text-xs font-bold text-red-500 bg-red-100 px-3 py-1 rounded-full">
                            MODO DE VISUALIZACAO
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
