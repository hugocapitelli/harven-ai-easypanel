import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { disciplinesApi, usersApi, coursesApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

const AdminClassManagement: React.FC = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [modalTab, setModalTab] = useState<'info' | 'professors' | 'students' | 'courses'>('info');

    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [assignedProfessors, setAssignedProfessors] = useState<any[]>([]);
    const [availableProfessors, setAvailableProfessors] = useState<any[]>([]);
    const [professorSearch, setProfessorSearch] = useState('');

    const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
    const [availableStudents, setAvailableStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    // States para controlar dropdowns de busca
    const [professorDropdownOpen, setProfessorDropdownOpen] = useState(false);
    const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

    // States for courses management
    const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [newCourseData, setNewCourseData] = useState({ title: '', description: '' });
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [instructors, setInstructors] = useState<any[]>([]);

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState<{open: boolean; title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    const fetchData = async () => {
        try {
            setLoading(true);
            const [disciplinesData, professorsData, studentsData, usersData] = await Promise.all([
                disciplinesApi.list(),
                usersApi.list('teacher'),
                usersApi.list('student'),
                usersApi.list()
            ]);
            setClasses(disciplinesData || []);
            setAvailableProfessors(professorsData || []);
            setAvailableStudents(studentsData || []);
            setInstructors(usersData || []);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        const doFetch = async () => {
            try {
                setLoading(true);
                const [disciplinesData, professorsData, studentsData, usersData] = await Promise.all([
                    disciplinesApi.list(),
                    usersApi.list('teacher'),
                    usersApi.list('student'),
                    usersApi.list()
                ]);
                if (controller.signal.aborted) return;
                setClasses(disciplinesData || []);
                setAvailableProfessors(professorsData || []);
                setAvailableStudents(studentsData || []);
                setInstructors(usersData || []);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error("Erro ao carregar dados:", error);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        doFetch();
        return () => controller.abort();
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        department: 'Engenharia'
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (selectedClass) {
                await disciplinesApi.update(selectedClass.id, {
                    title: formData.name,
                    // code: formData.code, // Code is usually immutable or handled differently, but let's assume it's stable for now or add if backend supports
                    department: formData.department
                });
                toast.success("Turma atualizada com sucesso!");
            } else {
                await disciplinesApi.create({
                    name: formData.name,
                    code: formData.code,
                    department: formData.department
                });
            }
            await fetchData();
            setShowModal(false);
            resetForm();
        } catch (error: unknown) {
            console.error("Erro ao salvar:", error);
            if ((error as any).response) {
                toast.error(`Erro ao criar disciplina: ${(error as any).response.data.detail || (error as Error).message}`);
            } else {
                toast.error("Erro ao conectar com o servidor.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', code: '', department: 'Engenharia' });
        setSelectedClass(null);
        setAssignedProfessors([]);
        setAssignedCourses([]);
        setModalTab('info');
    };

    const handleManage = async (cls: any) => {
        setSelectedClass(cls);
        setFormData({
            name: cls.title,
            code: cls.code,
            department: cls.department
        });

        // Fetch assigned professors, students, and courses
        try {
            const [teachers, students, courses] = await Promise.all([
                disciplinesApi.getTeachers(cls.id),
                disciplinesApi.getStudents(cls.id),
                coursesApi.listByClass(cls.id)
            ]);
            setAssignedProfessors(teachers || []);
            setAssignedStudents(students || []);
            setAssignedCourses(courses || []);
        } catch (e) {
            console.error("Erro ao buscar dados:", e);
        }

        setShowModal(true);
    };

    const handleAddProfessor = async (teacherId: number) => {
        if (!selectedClass) return;
        try {
            await disciplinesApi.addTeacher(selectedClass.id, teacherId);
            // Refresh assigned list
            const teachers = await disciplinesApi.getTeachers(selectedClass.id);
            setAssignedProfessors(teachers || []);
        } catch (error: unknown) {
            console.error("Erro ao adicionar professor:", error);
            if ((error as any).response) {
                // Se for erro de validação (422), mostra os detalhes
                const detail = (error as any).response.data.detail;
                const msg = Array.isArray(detail) ? JSON.stringify(detail) : (detail || (error as Error).message);
                toast.error(`Erro ao adicionar professor: ${msg}`);
            } else {
                toast.error("Erro ao adicionar professor: Falha na comunicação.");
            }
        }
    };

    const handleRemoveProfessor = async (teacherId: number) => {
        if (!selectedClass) return;
        try {
            await disciplinesApi.removeTeacher(selectedClass.id, teacherId);
            setAssignedProfessors(prev => prev.filter(p => p.id !== teacherId));
        } catch (e) {
            toast.error("Erro ao remover professor");
        }
    };

    const handleAddStudent = async (studentId: number) => {
        if (!selectedClass) return;
        try {
            await disciplinesApi.addStudent(selectedClass.id, studentId);
            const students = await disciplinesApi.getStudents(selectedClass.id);
            setAssignedStudents(students || []);
        } catch (error: unknown) {
            console.error("Erro ao adicionar aluno:", error);
            if ((error as any).response) {
                const detail = (error as any).response.data.detail;
                const msg = Array.isArray(detail) ? JSON.stringify(detail) : (detail || (error as Error).message);
                toast.error(`Erro ao adicionar aluno: ${msg}`);
            } else {
                toast.error("Erro ao adicionar aluno: Falha na comunicação.");
            }
        }
    };

    const handleRemoveStudent = async (studentId: number) => {
        if (!selectedClass) return;
        try {
            await disciplinesApi.removeStudent(selectedClass.id, studentId);
            setAssignedStudents(prev => prev.filter(s => s.id !== studentId));
        } catch (e) {
            toast.error("Erro ao remover aluno");
        }
    };

    // Filtros de professores e alunos disponíveis
    const filteredAvailableProfessors = availableProfessors.filter(p => {
        const notAssigned = !assignedProfessors.some(ap => ap.id === p.id);
        if (!professorSearch) return notAssigned; // Mostrar todos não atribuídos se busca vazia
        return notAssigned && (
            p.name?.toLowerCase().includes(professorSearch.toLowerCase()) ||
            p.email?.toLowerCase().includes(professorSearch.toLowerCase())
        );
    });

    // CSV Upload Logic
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedClass) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Simple CSV parser: assumes one column of identifiers (RA or Email) OR header 'email'/'ra'
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
            if (lines.length === 0) return;

            // Extract potential identifiers (emails or RAs)
            const identifiers = lines.flatMap(line => line.split(/[,;]/).map(val => val.trim().toLowerCase())).filter(val => val && val.length > 2);

            // Find student IDs matching these identifiers
            const studentIdsToAdd: string[] = [];
            let foundCount = 0;
            let missingCount = 0;

            // Build a map for faster lookup (normalized)
            const studentMap = new Map();
            availableStudents.forEach(s => {
                if (s.email) studentMap.set(s.email.toLowerCase(), s.id);
                if (s.ra) studentMap.set(s.ra.toLowerCase(), s.id);
                // Also map ID directly just in case
                studentMap.set(s.id.toString(), s.id);
            });

            identifiers.forEach(id => {
                // Ignore headers if common ones
                if (['email', 'ra', 'matricula', 'id'].includes(id)) return;

                if (studentMap.has(id)) {
                    const sid = studentMap.get(id);
                    // Avoid duplicates in the payload AND duplicates in the class
                    if (!studentIdsToAdd.includes(sid) && !assignedStudents.some(as => as.id === sid)) {
                        studentIdsToAdd.push(sid);
                        foundCount++;
                    }
                } else {
                    missingCount++;
                }
            });

            if (foundCount === 0) {
                toast.warning("Nenhum aluno encontrado correspondente ao CSV. Verifique se os RAs ou Emails estão corretos.");
                return;
            }

            setConfirmDialog({
                open: true,
                title: 'Adicionar Alunos em Lote',
                message: `Encontrados ${foundCount} alunos novos para adicionar. (${missingCount} não encontrados ou já adicionados). Continuar?`,
                variant: 'default',
                onConfirm: async () => {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    try {
                        setLoading(true);
                        await disciplinesApi.addStudentsBatch(selectedClass.id, studentIdsToAdd);
                        toast.success("Alunos adicionados com sucesso!");

                        // Refresh
                        const students = await disciplinesApi.getStudents(selectedClass.id);
                        setAssignedStudents(students || []);
                    } catch (err) {
                        console.error(err);
                        toast.error("Erro ao adicionar alunos em lote.");
                    } finally {
                        setLoading(false);
                        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    // Filtro de alunos disponíveis
    const filteredAvailableStudents = availableStudents.filter(s => {
        const notAssigned = !assignedStudents.some(as => as.id === s.id);
        if (!studentSearch) return notAssigned; // Mostrar todos não atribuídos se busca vazia
        return notAssigned && (
            s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.ra?.toLowerCase().includes(studentSearch.toLowerCase())
        );
    });



    return (
        <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* ... existing header code ... */}
                <div>
                    <h2 className="text-3xl font-display font-bold text-harven-dark dark:text-white tracking-tight">Gestão de Turmas</h2>
                    <p className="text-gray-500">Administre as turmas, matricule alunos e atribua grades curriculares.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* ... View Mode Buttons ... */}
                    <div className="bg-white dark:bg-gray-800 border border-harven-border dark:border-gray-700 rounded-lg p-1 flex shadow-sm">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-harven-bg dark:bg-gray-600 text-harven-dark dark:text-white' : 'text-gray-400 hover:text-harven-dark dark:hover:text-white'}`}><span className={`material-symbols-outlined text-[20px] ${viewMode === 'grid' ? 'fill-1' : ''}`}>grid_view</span></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-harven-bg dark:bg-gray-600 text-harven-dark dark:text-white' : 'text-gray-400 hover:text-harven-dark dark:hover:text-white'}`}><span className={`material-symbols-outlined text-[20px] ${viewMode === 'list' ? 'fill-1' : ''}`}>view_list</span></button>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="bg-primary hover:bg-primary-dark transition-all text-harven-dark font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/10"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Nova Turma
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-harven-border dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4">
                {/* ... existing filter code ... */}
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-harven-gold">search</span>
                    <input className="w-full bg-harven-bg dark:bg-gray-900 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary text-harven-dark dark:text-white" placeholder="Buscar turma, código ou ano..." />
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl border border-harven-border dark:border-gray-700 shadow-sm hover:border-primary transition-all group cursor-pointer overflow-hidden">
                            {/* Cover Image Header */}
                            <div className="h-24 bg-gradient-to-br from-harven-dark to-harven-dark/80 relative overflow-hidden">
                                {cls.image && (
                                    <img src={cls.image} alt={cls.title} className="absolute inset-0 w-full h-full object-cover" />
                                )}
                                <div className={`absolute inset-0 ${cls.image ? 'bg-gradient-to-t from-black/60 via-black/20 to-transparent' : ''}`}></div>
                                <div className="absolute top-3 left-3">
                                    <span className="bg-black/30 backdrop-blur-sm text-white font-mono font-bold text-xs px-2 py-1 rounded">{cls.code}</span>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase backdrop-blur-sm ${cls.status === 'active' || cls.status === 'Ativa' ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>{cls.status || 'Ativa'}</span>
                                </div>
                                <div className="absolute bottom-3 left-3 bg-white dark:bg-gray-800 size-10 rounded-lg shadow-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-harven-dark dark:text-white">school</span>
                                </div>
                            </div>
                            {/* Card Content */}
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-harven-dark dark:text-white group-hover:text-primary-dark dark:group-hover:text-primary transition-colors mb-1">{cls.title}</h3>
                                <p className="text-xs text-gray-500 font-medium mb-4">{cls.department}</p>

                                <div className="grid grid-cols-2 gap-4 border-t border-harven-bg dark:border-gray-700 pt-4">
                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Materiais</p><p className="text-xl font-display font-bold text-harven-dark dark:text-white">{cls.courses_count || 0}</p></div>
                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Alunos</p><p className="text-xl font-display font-bold text-harven-dark dark:text-white">{cls.students || 0}</p></div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button onClick={() => navigate(`/admin/class/${cls.id}`)} className="flex-1 py-2 bg-primary hover:bg-primary-dark rounded-lg text-xs font-bold text-harven-dark transition-all flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                        Ver Materiais
                                    </button>
                                    <button onClick={() => handleManage(cls)} className="px-3 py-2 bg-harven-bg dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold text-harven-dark dark:text-white transition-all" title="Editar Turma">
                                        <span className="material-symbols-outlined text-[16px]">settings</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // List View
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-harven-border dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-left">
                        {/* ... Table Header ... */}
                        <thead className="bg-harven-bg/50 dark:bg-gray-900/50 border-b border-harven-border dark:border-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Nome da Turma</th>
                                <th className="p-4">Ano/Semestre</th>
                                <th className="p-4">Materiais</th>
                                <th className="p-4">Alunos</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-harven-bg dark:divide-gray-700">
                            {classes.map((cls) => (
                                <tr key={cls.id} className="hover:bg-harven-bg/20 dark:hover:bg-gray-700 group transition-colors">
                                    <td className="p-4 font-mono text-xs font-bold text-gray-600 dark:text-gray-400">{cls.code}</td>
                                    <td className="p-4 text-sm font-bold text-harven-dark dark:text-white">{cls.title}</td>
                                    <td className="p-4 text-sm text-gray-500">{cls.year || '2024.1'}</td>
                                    <td className="p-4 text-sm text-gray-500">{cls.courses_count || 0}</td>
                                    <td className="p-4 text-sm text-gray-500">{cls.students || 0}</td>
                                    <td className="p-4"><span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${cls.status === 'active' || cls.status === 'Ativa' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'}`}>{cls.status || 'Ativa'}</span></td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => navigate(`/admin/class/${cls.id}`)} className="text-gray-400 hover:text-primary-dark transition-colors" title="Ver Materiais">
                                                <span className="material-symbols-outlined">menu_book</span>
                                            </button>
                                            <button onClick={() => handleManage(cls)} className="text-gray-400 hover:text-harven-dark transition-colors" title="Editar Turma">
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Gestão/Criação Turma */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        <div className="p-6 border-b border-harven-border bg-harven-bg flex justify-between items-center">
                            <h3 className="text-lg font-display font-bold text-harven-dark">{selectedClass ? 'Gerenciar Turma' : 'Nova Turma'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-harven-dark">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Tabs do Modal */}
                        <div className="flex border-b border-harven-border px-6 overflow-x-auto">
                            {[
                                { id: 'info', label: 'Dados Gerais' },
                                { id: 'courses', label: 'Materiais' },
                                { id: 'professors', label: 'Professores' },
                                { id: 'students', label: 'Alunos' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setModalTab(tab.id as any)}
                                    // Disable tabs if creating new class
                                    disabled={!selectedClass && tab.id !== 'info'}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${modalTab === tab.id ? 'border-primary text-harven-dark' : 'border-transparent text-gray-400 hover:text-harven-dark'} ${!selectedClass && tab.id !== 'info' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {modalTab === 'info' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome da Turma</label>
                                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark" placeholder="Ex: Engenharia Civil 2024" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Código</label>
                                            <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark" placeholder="EC-24" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departamento Principal</label>
                                        <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark">
                                            <option>Engenharia</option>
                                            <option>Direito</option>
                                            <option>Saúde</option>
                                            <option>Humanidades</option>
                                        </select>
                                    </div>
                                    {!selectedClass && (
                                        <div className="bg-yellow-50 p-4 rounded-lg text-xs text-yellow-700">
                                            Salve a turma antes de adicionar professores, alunos e cursos.
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalTab === 'courses' && selectedClass && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    {/* Link para gestão completa */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate(`/admin/discipline/${selectedClass.id}/edit`);
                                        }}
                                        className="w-full p-4 bg-harven-dark text-white rounded-lg flex items-center justify-between hover:bg-black transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">settings</span>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Gestao Completa da Disciplina</p>
                                                <p className="text-[10px] text-white/70">Imagens, configuracoes e estrutura de cursos</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>

                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-harven-border">
                                        <span className="text-xs font-bold text-gray-500">Materiais desta Turma ({assignedCourses.length})</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewCourseData({ title: '', description: '' });
                                                setEditingCourseId(null);
                                                setShowCourseModal(true);
                                            }}
                                            className="text-primary-dark font-bold text-xs flex items-center gap-1 hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Novo Curso
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                        {assignedCourses.map((course, i) => (
                                            <div key={course.id || i} className="flex justify-between items-center p-4 border border-harven-border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="size-12 bg-harven-bg rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        {(course.image || course.image_url) ? (
                                                            <img src={course.image || course.image_url} alt={course.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-gray-400">menu_book</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-harven-dark truncate">{course.title}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{course.description || 'Sem descrição'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/course/${course.id}/edit`)}
                                                        className="text-gray-400 hover:text-primary-dark p-1 rounded transition-colors"
                                                        title="Editar Curso"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setConfirmDialog({
                                                                open: true,
                                                                title: 'Remover Curso',
                                                                message: 'Tem certeza que deseja remover este curso?',
                                                                variant: 'danger',
                                                                onConfirm: async () => {
                                                                    setConfirmDialog(prev => ({ ...prev, open: false }));
                                                                    try {
                                                                        await coursesApi.delete(course.id);
                                                                        const courses = await coursesApi.listByClass(selectedClass.id);
                                                                        setAssignedCourses(courses || []);
                                                                    } catch (e) {
                                                                        toast.error('Erro ao remover curso');
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                                        title="Remover Curso"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {assignedCourses.length === 0 && (
                                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                                <span className="material-symbols-outlined text-3xl mb-2 block">menu_book</span>
                                                Nenhum curso cadastrado nesta turma.
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewCourseData({ title: '', description: '' });
                                                        setEditingCourseId(null);
                                                        setShowCourseModal(true);
                                                    }}
                                                    className="text-primary-dark font-bold text-xs hover:underline block mx-auto mt-2"
                                                >
                                                    Criar o primeiro curso
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {modalTab === 'professors' && selectedClass && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adicionar Professor</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-harven-bg border-none rounded-lg px-4 py-2 text-sm"
                                                placeholder="Clique ou digite para buscar..."
                                                value={professorSearch}
                                                onChange={(e) => setProfessorSearch(e.target.value)}
                                                onFocus={() => setProfessorDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setProfessorDropdownOpen(false), 200)}
                                            />
                                        </div>
                                        {/* Dropdown de sugestões */}
                                        {professorDropdownOpen && (
                                            <div className="absolute z-10 w-full bg-white border border-harven-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredAvailableProfessors.length > 0 ? (
                                                    filteredAvailableProfessors.slice(0, 20).map(prof => (
                                                        <button
                                                            key={prof.id}
                                                            type="button"
                                                            onClick={() => { handleAddProfessor(prof.id); setProfessorSearch(''); setProfessorDropdownOpen(false); }}
                                                            className="w-full text-left p-3 hover:bg-harven-bg text-sm flex justify-between items-center border-b border-gray-100 last:border-0"
                                                        >
                                                            <div>
                                                                <span className="font-medium">{prof.name}</span>
                                                                {prof.email && <span className="text-xs text-gray-400 ml-2">{prof.email}</span>}
                                                            </div>
                                                            <span className="material-symbols-outlined text-[16px] text-primary">add</span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-xs text-gray-400 text-center">Nenhum professor disponível.</div>
                                                )}
                                                {filteredAvailableProfessors.length > 20 && (
                                                    <div className="p-2 text-xs text-gray-400 text-center border-t">Digite para filtrar mais...</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto mt-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Professores Atribuídos</label>
                                        {assignedProfessors.map((prof, i) => (
                                            <div key={prof.id || i} className="flex justify-between items-center p-3 border border-harven-border rounded-lg bg-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 bg-harven-bg rounded-full flex items-center justify-center font-bold text-xs text-gray-500">{prof.name ? prof.name.charAt(0) : '?'}</div>
                                                    <span className="text-sm font-bold text-harven-dark">{prof.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProfessor(prof.id)}
                                                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {assignedProfessors.length === 0 && <div className="text-xs text-gray-400 italic text-center p-4 border border-dashed rounded-lg">Nenhum professor atribuído a esta turma.</div>}
                                    </div>
                                </div>
                            )}
                            {modalTab === 'students' && selectedClass && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-harven-border">
                                        <span className="text-xs font-bold text-gray-500">Matrícula em Massa</span>
                                        <button type="button" onClick={handleImportClick} className="text-primary-dark font-bold text-xs underline">Importar CSV</button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".csv,.txt"
                                            className="hidden"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adicionar Aluno</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-harven-bg border-none rounded-lg px-4 py-2 text-sm"
                                                placeholder="Clique ou digite para buscar..."
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                onFocus={() => setStudentDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 200)}
                                            />
                                        </div>
                                        {studentDropdownOpen && (
                                            <div className="absolute z-10 w-full bg-white border border-harven-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredAvailableStudents.length > 0 ? (
                                                    filteredAvailableStudents.slice(0, 20).map(student => (
                                                        <button
                                                            key={student.id}
                                                            type="button"
                                                            onClick={() => { handleAddStudent(student.id); setStudentSearch(''); setStudentDropdownOpen(false); }}
                                                            className="w-full text-left p-3 hover:bg-harven-bg text-sm flex justify-between items-center border-b border-gray-100 last:border-0"
                                                        >
                                                            <div>
                                                                <span className="font-medium">{student.name}</span>
                                                                <div className="text-xs text-gray-400">
                                                                    {student.ra && <span>RA: {student.ra}</span>}
                                                                    {student.ra && student.email && <span> • </span>}
                                                                    {student.email && <span>{student.email}</span>}
                                                                </div>
                                                            </div>
                                                            <span className="material-symbols-outlined text-[16px] text-primary">add</span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-xs text-gray-400 text-center">Nenhum aluno disponível.</div>
                                                )}
                                                {filteredAvailableStudents.length > 20 && (
                                                    <div className="p-2 text-xs text-gray-400 text-center border-t">Mostrando 20 de {filteredAvailableStudents.length}. Digite para filtrar...</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto mt-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Alunos Atribuídos</label>
                                        {assignedStudents.map((student, i) => (
                                            <div key={student.id || i} className="flex justify-between items-center p-3 border border-harven-border rounded-lg bg-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 bg-harven-bg rounded-full flex items-center justify-center font-bold text-xs text-gray-500">{student.name ? student.name.charAt(0) : '?'}</div>
                                                    <span className="text-sm font-bold text-harven-dark">{student.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 mr-2">{student.ra}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveStudent(student.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {assignedStudents.length === 0 && (
                                            <div className="text-center py-8 text-gray-400 text-sm">
                                                Nenhum aluno atribuído a esta turma.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            <div className="pt-2 flex gap-3 border-t border-harven-border mt-auto">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-harven-border rounded-xl text-xs font-bold text-harven-dark hover:bg-gray-50 transition-colors uppercase tracking-widest">Fechar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-primary hover:bg-primary-dark rounded-xl text-xs font-bold text-harven-dark transition-all uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mini Modal para Criar/Editar Curso */}
            {showCourseModal && selectedClass && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-harven-border bg-harven-bg flex justify-between items-center">
                            <h3 className="text-base font-display font-bold text-harven-dark">
                                {editingCourseId ? 'Editar Curso' : 'Novo Curso'}
                            </h3>
                            <button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-harven-dark">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                    if (editingCourseId) {
                                        await coursesApi.update(editingCourseId, {
                                            title: newCourseData.title,
                                            description: newCourseData.description,
                                            instructor_id: instructors[0]?.id || ''
                                        });
                                    } else {
                                        await coursesApi.create(selectedClass.id, {
                                            title: newCourseData.title,
                                            description: newCourseData.description,
                                            instructor_id: instructors[0]?.id || ''
                                        });
                                    }
                                    const courses = await coursesApi.listByClass(selectedClass.id);
                                    setAssignedCourses(courses || []);
                                    setShowCourseModal(false);
                                } catch (e: any) {
                                    console.error("Erro ao salvar curso:", e);
                                    toast.error(`Erro ao salvar curso: ${e.response?.data?.detail || e.message}`);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                            className="p-5 flex flex-col gap-4"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Curso</label>
                                <input
                                    required
                                    value={newCourseData.title}
                                    onChange={e => setNewCourseData({ ...newCourseData, title: e.target.value })}
                                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                    placeholder="Ex: Introdução à Programação"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
                                <textarea
                                    value={newCourseData.description}
                                    onChange={e => setNewCourseData({ ...newCourseData, description: e.target.value })}
                                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark resize-none"
                                    rows={3}
                                    placeholder="Breve descrição do curso..."
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCourseModal(false)}
                                    className="flex-1 py-2.5 border border-harven-border rounded-xl text-xs font-bold text-harven-dark hover:bg-gray-50 transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark rounded-xl text-xs font-bold text-harven-dark transition-all uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Salvando...' : (editingCourseId ? 'Salvar' : 'Criar Curso')}
                                </button>
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

export default AdminClassManagement;
