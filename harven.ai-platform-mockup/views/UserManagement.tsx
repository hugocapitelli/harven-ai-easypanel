import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { usersApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

const UserManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos os Cargos');

  // Real Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    ra: '', // RA / Matrícula
    password: 'mudar123', // Default temporary password
    role: 'student' as 'student' | 'teacher' | 'admin',
    title: '' // For professors
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean; title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.list();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const doFetch = async () => {
      try {
        setLoading(true);
        const data = await usersApi.list();
        if (!controller.signal.aborted) {
          setUsers(data);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching users:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    doFetch();
    return () => controller.abort();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await usersApi.create({
        ra: formData.ra || undefined, // Send RA as ID if present
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        title: formData.role === 'teacher' ? formData.title : undefined
      });

      await fetchUsers();
      setShowModal(false);
      setFormData({ name: '', email: '', ra: '', password: 'mudar123', role: 'student', title: '' });
      toast.success("Usuário criado com sucesso!");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Erro ao criar usuário. Verifique os dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusVariant = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const roleMap: any = { 'Aluno': 'student', 'Professor': 'teacher', 'Admin': 'admin' };
    const selectedRole = roleMap[roleFilter] || roleFilter;
    const matchesRole = roleFilter === 'Todos os Cargos' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // CSV Import Logic
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      // Simple CSV parsing: assumes header row + name,email,role,ra
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) {
        toast.warning("O arquivo CSV parece vazio ou inválido.");
        return;
      }

      // Skip header, process rows
      const newUsers: any[] = [];

      // Expected Format: Name,Email,Role,RA (optional)
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 2) {
          newUsers.push({
            name: cols[0],
            email: cols[1],
            role: cols[2] ? cols[2].toLowerCase() : 'student', // Default to student
            id: cols[3] || undefined, // RA
            password: 'mudar123' // Default password
          });
        }
      }

      if (newUsers.length > 0) {
        setConfirmDialog({
          open: true,
          title: 'Confirmar Importação',
          message: `Confirmar importação de ${newUsers.length} usuários?`,
          variant: 'default',
          onConfirm: async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            try {
              setLoading(true);
              await usersApi.createBatch(newUsers);
              await fetchUsers();
              toast.success("Importação concluída com sucesso!");
            } catch (error) {
              console.error("Erro na importação:", error);
              toast.error("Erro ao importar usuários. Verifique o console.");
            } finally {
              setLoading(false);
            }
          }
        });
      } else {
        toast.warning("Nenhum usuário válido encontrado no CSV.");
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-8 flex flex-col gap-8 h-full relative animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Gerenciamento de Usuários</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Controle de acesso, papéis e permissões globais.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" className="flex items-center gap-2" onClick={handleImportClick}>
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Importar CSV
          </Button>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <span className="material-symbols-outlined">person_add</span>
            Novo Usuário
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Input
            icon="search"
            placeholder="Buscar por nome, e-mail ou matrícula..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="w-40">
            <select
              className="w-full bg-white border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>Todos os Cargos</option>
              <option value="student">Aluno</option>
              <option value="teacher">Professor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Button
            variant="ghost"
            className="text-harven-gold hover:text-harven-dark"
            onClick={() => { setSearchTerm(''); setRoleFilter('Todos os Cargos'); }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="p-5 w-10"><input type="checkbox" className="size-4 rounded text-primary border-input focus:ring-primary" /></th>
                <th className="p-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Usuário</th>
                <th className="p-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="p-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="p-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Criado em</th>
                <th className="p-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando usuários...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 group transition-colors">
                    <td className="p-5"><input type="checkbox" className="size-4 rounded text-primary border-input focus:ring-primary" /></td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} fallback={user.name} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                          {user.title && <p className="text-[10px] text-harven-gold font-bold">{user.title}</p>}
                        </div>
                      </div >
                    </td >
                    <td className="p-5">
                      <Badge variant="outline" className="uppercase">{user.role}</Badge>
                    </td>
                    <td className="p-5">
                      <Badge variant={getStatusVariant(user.is_active !== false)}>{user.is_active !== false ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="p-5 text-xs text-muted-foreground font-bold">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-8"><span className="material-symbols-outlined text-[20px]">edit</span></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive"><span className="material-symbols-outlined text-[20px]">block</span></Button>
                      </div>
                    </td>
                  </tr >
                ))
              )}
            </tbody >
          </table >
        </div >
        <div className="p-4 border-t border-border flex items-center justify-between mt-auto bg-muted/10">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mostrando {filteredUsers.length} usuários</span>
        </div>
      </Card >

      {/* Modal de Criação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-display font-bold text-lg text-foreground">Novo Usuário</h3>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nome Completo</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João da Silva" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">RA / Matrícula</label>
                  <Input
                    value={formData.ra}
                    onChange={e => setFormData({ ...formData, ra: e.target.value })}
                    placeholder="Automático se vazio"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">E-mail Institucional</label>
                  <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: j.silva@harven.edu" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Senha Temporária</label>
                <Input
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha inicial do usuário"
                />
                <p className="text-[10px] text-muted-foreground">O usuário deverá alterar no primeiro acesso.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Função</label>
                  <select
                    className="w-full bg-white border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.role}
                    // @ts-ignore
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="student">Aluno</option>
                    <option value="teacher">Professor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {formData.role === 'teacher' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Título</label>
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: PhD, Dr." />
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default UserManagement;
