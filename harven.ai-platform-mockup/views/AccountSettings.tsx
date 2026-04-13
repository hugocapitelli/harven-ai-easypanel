
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { usersApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { safeJsonParse } from '../lib/utils';

const AccountSettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
    const [avatarUrl, setAvatarUrl] = useState('https://picsum.photos/seed/student/200/200');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        bio: '',
        title: ''
    });

    // Security Form
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState<{open: boolean; title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    useEffect(() => {
        const controller = new AbortController();
        const doLoad = async () => {
            try {
                const userData = safeJsonParse<{ id?: string }>('user-data', {});
                if (userData.id) {
                    const freshUser = await usersApi.get(userData.id);
                    if (controller.signal.aborted) return;
                    setUser(freshUser);
                    setFormData({
                        name: freshUser.name || '',
                        email: freshUser.email || '',
                        phone: freshUser.phone || '',
                        bio: freshUser.bio || '',
                        title: freshUser.title || ''
                    });
                    setAvatarUrl(freshUser.avatar_url || `https://ui-avatars.com/api/?name=${freshUser.name}&background=random`);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error("Error loading user:", error);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        doLoad();
        return () => controller.abort();
    }, []);

    const loadUser = async () => {
        try {
            const userData = safeJsonParse<{ id?: string }>('user-data', {});
            if (userData.id) {
                const freshUser = await usersApi.get(userData.id);
                setUser(freshUser);
                setFormData({
                    name: freshUser.name || '',
                    email: freshUser.email || '',
                    phone: freshUser.phone || '',
                    bio: freshUser.bio || '',
                    title: freshUser.title || ''
                });
                setAvatarUrl(freshUser.avatar_url || `https://ui-avatars.com/api/?name=${freshUser.name}&background=random`);
            }
        } catch (error) {
            console.error("Error loading user:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        if (!user) return;
        try {
            await usersApi.update(user.id, {
                name: formData.name,
                email: formData.email,
                title: formData.title
            });

            // Update local storage to reflect name change
            const storedUser = localStorage.getItem('user-data');
            if (storedUser) {
                const u = JSON.parse(storedUser);
                u.name = formData.name;
                localStorage.setItem('user-data', JSON.stringify(u));
            }

            toast.success("Perfil atualizado com sucesso!");
            loadUser(); // Refresh
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Erro ao atualizar perfil.");
        }
    };

    const handlePasswordUpdate = async () => {
        if (!user) return;
        if (passwordData.new !== passwordData.confirm) {
            toast.error("A nova senha e a confirmação não conferem.");
            return;
        }

        try {
            // In a real app we would verify 'current' password first via a verify-password endpoint
            await usersApi.update(user.id, {
                password: passwordData.new
            });
            toast.success("Senha alterada com sucesso!");
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error("Error updating password:", error);
            toast.error("Erro ao alterar senha.");
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            const file = e.target.files[0];
            try {
                setAvatarUrl(URL.createObjectURL(file)); // Optimistic preview
                const result = await usersApi.uploadAvatar(user.id, file);

                // Update avatar URL with server response
                if (result.avatar_url) {
                    setAvatarUrl(result.avatar_url);

                    // Update localStorage with new avatar
                    const storedUser = localStorage.getItem('user-data');
                    if (storedUser) {
                        const u = JSON.parse(storedUser);
                        u.avatar_url = result.avatar_url;
                        localStorage.setItem('user-data', JSON.stringify(u));
                        // Dispatch event to notify Header and other components
                        window.dispatchEvent(new Event('user-data-updated'));
                    }
                }

                // Show warning if there's one (database column missing)
                if (result.warning) {
                    console.warn("Upload warning:", result.warning);
                    toast.info(`Foto enviada! Nota: ${result.warning}`);
                } else {
                    toast.success("Foto de perfil atualizada!");
                }
            } catch (error: unknown) {
                console.error("Erro no upload:", error);
                const errorMsg = (error as any)?.response?.data?.detail || "Erro ao enviar imagem. Tente novamente.";
                toast.error(errorMsg);
                loadUser(); // Revert on error
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!user) return;

        setConfirmDialog({
            open: true,
            title: 'Remover Foto de Perfil',
            message: 'Tem certeza que deseja remover sua foto de perfil?',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                try {
                    await usersApi.deleteAvatar(user.id);

                    // Reset to default avatar
                    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=D0FF00&color=0a1f09&bold=true`;
                    setAvatarUrl(defaultAvatar);

                    // Update localStorage
                    const storedUser = localStorage.getItem('user-data');
                    if (storedUser) {
                        const u = JSON.parse(storedUser);
                        u.avatar_url = '';
                        localStorage.setItem('user-data', JSON.stringify(u));
                        window.dispatchEvent(new Event('user-data-updated'));
                    }

                    toast.success("Foto de perfil removida!");
                } catch (error: unknown) {
                    console.error("Erro ao remover avatar:", error);
                    const errorMsg = (error as any)?.response?.data?.detail || "Erro ao remover foto. Tente novamente.";
                    toast.error(errorMsg);
                }
            }
        });
    };

    if (loading) return <div className="p-10 text-center">Carregando perfil...</div>;

    return (
        <div className="flex flex-col h-full bg-harven-bg overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full p-8 md:p-12 flex flex-col gap-8">

                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => navigate('/profile')} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-harven-dark">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-harven-dark">Minha Conta</h1>
                        <p className="text-gray-500">Gerencie suas informações pessoais e preferências de segurança.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0">
                            {[
                                { id: 'profile', label: 'Perfil Público', icon: 'person' },
                                { id: 'security', label: 'Login e Segurança', icon: 'lock' },
                                { id: 'notifications', label: 'Notificações', icon: 'notifications' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === item.id
                                        ? 'bg-white text-harven-dark shadow-sm ring-1 ring-harven-border'
                                        : 'text-gray-400 hover:text-harven-dark hover:bg-white/50'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${activeTab === item.id ? 'fill-1' : ''}`}>{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                        {activeTab === 'profile' && (
                            <Card className="p-8 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-harven-dark mb-6 border-b border-harven-bg pb-4">Imagem de Perfil</h3>
                                    <div className="flex items-center gap-6">
                                        <div className="size-24 rounded-full overflow-hidden border-2 border-harven-border">
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <label className="px-4 py-2 bg-primary hover:bg-primary-dark text-harven-dark text-xs font-bold uppercase rounded-lg cursor-pointer transition-colors shadow-sm">
                                                    Alterar Foto
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                                </label>
                                                <button
                                                    onClick={handleDeleteAvatar}
                                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase rounded-lg transition-colors border border-red-200"
                                                >
                                                    Remover Foto
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                Recomendado: JPG, PNG ou GIF. Máx. 2MB.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-harven-dark mb-6 border-b border-harven-bg pb-4">Dados Pessoais</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="Nome Completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <Input label="E-mail" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RA / Matrícula</label>
                                            <Input value={user?.ra || 'Não informado'} disabled className="bg-gray-50 opacity-70" />
                                        </div>
                                        {user?.role === 'teacher' && (
                                            <Input label="Título (Ex: PhD)" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bio / Sobre Mim</label>
                                        <textarea
                                            className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary text-harven-dark min-h-[100px] resize-none"
                                            defaultValue={formData.bio}
                                            placeholder="Funcionalidade futura (Bio ainda não salva)"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleProfileUpdate}>Salvar Alterações</Button>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'security' && (
                            <Card className="p-8 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-harven-dark mb-6 border-b border-harven-bg pb-4">Alterar Senha</h3>
                                    <div className="space-y-4 max-w-md">
                                        <Input
                                            label="Senha Atual"
                                            type="password"
                                            placeholder="••••••••"
                                            value={passwordData.current}
                                            onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                                        />
                                        <Input
                                            label="Nova Senha"
                                            type="password"
                                            placeholder="••••••••"
                                            value={passwordData.new}
                                            onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                        />
                                        <Input
                                            label="Confirmar Nova Senha"
                                            type="password"
                                            placeholder="••••••••"
                                            value={passwordData.confirm}
                                            onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                        />
                                    </div>
                                    <div className="mt-6 flex justify-end max-w-md">
                                        <Button variant="outline" onClick={handlePasswordUpdate}>Atualizar Senha</Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'notifications' && (
                            <Card className="p-8 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-harven-dark mb-6 border-b border-harven-bg pb-4">Preferências de E-mail</h3>
                                    <p className="text-sm text-muted-foreground">Em breve</p>
                                </div>
                            </Card>
                        )}
                    </div>
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

export default AccountSettings;
