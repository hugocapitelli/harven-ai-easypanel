import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { coursesApi, disciplinesApi, usersApi, sessionReviewsApi } from '../services/api';
import type { SessionWithReview } from '../types';

const InstructorDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId: disciplineId } = useParams<{ classId: string }>();

  // Determine if this is being accessed from admin route
  const isAdminContext = location.pathname.startsWith('/admin');
  const backRoute = isAdminContext ? '/admin/classes' : '/instructor';

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'subjects' | 'students' | 'grades' | 'conversations'>('subjects');
  const [searchTerm, setSearchTerm] = useState('');

  // State
  const [subjects, setSubjects] = useState<any[]>([]); // Courses/Disciplinas
  const [students, setStudents] = useState<any[]>([]); // Enrollments/Users
  const [stats, setStats] = useState({ total_courses: 0, total_students: 0, avg_progress: 0, socratic_interactions: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!disciplineId) return;
    const controller = new AbortController();
    const doLoad = async () => {
      setLoading(true);
      try {
        const [coursesData, statsData, studentsData, usersData] = await Promise.all([
          coursesApi.listByClass(disciplineId!),
          disciplinesApi.getStats(disciplineId!),
          disciplinesApi.getStudents(disciplineId!),
          usersApi.list()
        ]);
        if (controller.signal.aborted) return;
        setSubjects(coursesData);
        setStats(statsData);
        setStudents(studentsData);

        const instructorsList = usersData || [];
        setInstructors(instructorsList);

        if (instructorsList.length > 0 && !formData.instructor_id) {
          setFormData(prev => ({ ...prev, instructor_id: instructorsList[0].id }));
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Error loading data", e);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    doLoad();
    return () => controller.abort();
  }, [disciplineId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesData, statsData, studentsData, usersData] = await Promise.all([
        coursesApi.listByClass(disciplineId!),
        disciplinesApi.getStats(disciplineId!),
        disciplinesApi.getStudents(disciplineId!),
        usersApi.list()
      ]);
      setSubjects(coursesData);
      setStats(statsData);
      setStudents(studentsData);

      const instructorsList = usersData || [];
      setInstructors(instructorsList);

      if (instructorsList.length > 0 && !formData.instructor_id) {
        setFormData(prev => ({ ...prev, instructor_id: instructorsList[0].id }));
      }
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  // Re-load only courses after create
  const reloadCourses = async () => {
    const data = await coursesApi.listByClass(disciplineId!);
    setSubjects(data);
    // Update stats and students too
    const s = await disciplinesApi.getStats(disciplineId!);
    setStats(s);
  };

  const [studentsStats, setStudentsStats] = useState<any[]>([]);

  const [conversations, setConversations] = useState<SessionWithReview[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  useEffect(() => {
    if (!disciplineId || (activeTab !== 'students' && activeTab !== 'grades')) return;
    if (studentsStats.length > 0) return; // already loaded
    const loadStudentsStats = async () => {
      try {
        const data = await disciplinesApi.getStudentsStats(disciplineId);
        setStudentsStats(data);
      } catch (e) {
        console.error("Error loading students stats", e);
      }
    };
    loadStudentsStats();
  }, [activeTab, disciplineId]);

  useEffect(() => {
    if (activeTab !== 'conversations' || !disciplineId) return;
    const loadConversations = async () => {
      setConversationsLoading(true);
      try {
        const data = await sessionReviewsApi.listByDiscipline(disciplineId);
        setConversations(data);
      } catch (e) {
        console.error("Error loading conversations", e);
      } finally {
        setConversationsLoading(false);
      }
    };
    loadConversations();
  }, [activeTab, disciplineId]);

  const [instructors, setInstructors] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor_id: '',
    image_url: ''
  });


  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplineId) return;

    setIsSubmitting(true);
    try {
      // Use the first available student/user as instructor for now if plain string, 
      // or rely on form input if we add one. For now, let's try to get a valid ID.
      // Better: assume the backend might handle it or we need a real ID.
      // Let's use a real UUID if possible, or just catch the error nicely.
      // Ideally we should have a 'instructors' list.
      // For this fix, I will rely on the formData.instructor_id BUT I will add a fetch for it.

      await coursesApi.create(disciplineId, {
        title: formData.title,
        description: formData.description,
        instructor_id: formData.instructor_id,
        image_url: formData.image_url
      });

      await reloadCourses();
      setShowModal(false);
      setFormData({ title: '', description: '', instructor_id: formData.instructor_id, image_url: '' });
    } catch (e: any) {
      console.error("Error creating course", e);
      toast.error(`Erro ao criar disciplina: ${e.response?.data?.detail || e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (grade: number) => {
    return (
      <div className="flex gap-0.5 justify-center" title={`Nota: ${grade}/5`}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`material-symbols-outlined text-[18px] ${star <= grade ? 'text-harven-gold fill-1' : 'text-gray-200'}`}
          >
            star
          </span>
        ))}
      </div>
    )
  };

  const filteredSubjects = subjects.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col flex-1 h-full animate-in fade-in duration-500 relative bg-harven-bg">
      <div className="relative h-64 bg-harven-dark overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(https://picsum.photos/seed/math/1200/600)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-harven-dark via-harven-dark/80 to-transparent p-10 flex flex-col justify-end">
          <div className="max-w-6xl mx-auto w-full flex justify-between items-end">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="bg-primary text-harven-dark text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Turma Ativa</span>
                <span className="text-harven-gold text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">school</span> {disciplineId || 'Turma'}
                </span>
              </div>
              <h1 className="text-4xl font-display font-bold text-white tracking-tight">Gestão da Turma</h1>
              <p className="text-white/60 max-w-xl text-sm leading-relaxed">
                Visualize e gerencie as disciplinas (cursos) que compõem esta turma.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(backRoute)}
                className="px-4 py-2 border border-white/20 text-white hover:bg-white/10 transition-colors font-bold rounded-lg text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2 bg-primary text-harven-dark font-bold rounded-lg text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Adicionar Disciplina
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Disciplinas', val: stats.total_courses.toString(), trend: 'Atualizado agora', icon: 'menu_book' },
            { label: 'Alunos Matriculados', val: stats.total_students.toString(), trend: 'Baseado na turma', icon: 'groups' },
            { label: 'Progresso Médio', val: `${stats.avg_progress}%`, trend: 'Média da turma', icon: 'analytics' },
            { label: 'Conversas Socráticas', val: stats.socratic_interactions.toString(), trend: 'Total acumulado', icon: 'forum' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-5 rounded-xl border border-harven-border shadow-sm flex flex-col gap-1 group relative overflow-hidden">
              <div className="absolute top-4 right-4 size-8 bg-harven-bg rounded-lg flex items-center justify-center text-harven-gold group-hover:bg-primary group-hover:text-harven-dark transition-colors">
                <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-display font-bold text-harven-dark mt-1">{stat.val}</p>
              <p className="text-[10px] font-bold text-green-600 mt-2">{stat.trend}</p>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-harven-border gap-4 pb-0">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`text-sm font-bold pb-4 -mb-px transition-colors border-b-4 ${activeTab === 'subjects' ? 'text-harven-dark border-primary' : 'text-gray-400 border-transparent hover:text-harven-dark'}`}
              >
                Disciplinas da Turma
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`text-sm font-bold pb-4 -mb-px transition-colors border-b-4 ${activeTab === 'students' ? 'text-harven-dark border-primary' : 'text-gray-400 border-transparent hover:text-harven-dark'}`}
              >
                Alunos
              </button>
              <button
                onClick={() => setActiveTab('grades')}
                className={`text-sm font-bold pb-4 -mb-px transition-colors border-b-4 ${activeTab === 'grades' ? 'text-harven-dark border-primary' : 'text-gray-400 border-transparent hover:text-harven-dark'}`}
              >
                Quadro de Notas
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`text-sm font-bold pb-4 -mb-px transition-colors border-b-4 ${activeTab === 'conversations' ? 'text-harven-dark border-primary' : 'text-gray-400 border-transparent hover:text-harven-dark'}`}
              >
                Conversas
              </button>
            </div>

            <div className="flex items-center gap-4 pb-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-harven-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary placeholder-gray-400"
                  placeholder={activeTab === 'students' ? "Buscar aluno..." : activeTab === 'conversations' ? "Buscar conversa..." : "Buscar disciplina..."}
                />
              </div>
            </div>
          </div>

          <div className="min-h-[300px]">
            {activeTab === 'subjects' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="bg-white p-5 rounded-xl border border-harven-border flex flex-col md:flex-row items-center gap-8 shadow-sm group hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/course/${subject.id}`)}
                  >
                    <div className="w-full md:w-32 h-20 rounded-xl bg-harven-bg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {(subject.image || subject.image_url) ? (
                        <img src={subject.image || subject.image_url} alt={subject.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[36px] text-harven-dark group-hover:text-primary-dark transition-colors">functions</span>
                      )}

                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/40 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course/${subject.id}/edit`);
                          }}
                        >
                          <span className="material-symbols-outlined text-white">settings</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-harven-dark leading-tight">{subject.title}</h4>
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        <span>{subject.chapters_count || 0} Módulos</span>
                        <span className="size-1 rounded-full bg-gray-200"></span>
                        <span>{stats.total_students || 0} Alunos</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/course/${subject.id}/edit`);
                      }}
                      className="px-4 py-2 bg-harven-bg hover:bg-primary group-hover:bg-primary group-hover:text-harven-dark border border-transparent rounded-lg text-xs font-bold text-harven-dark transition-all shadow-sm flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      GERENCIAR
                    </button>
                  </div>
                ))}
                {filteredSubjects.length === 0 && !loading && (
                  <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-400 text-sm">Nenhuma disciplina cadastrada nesta turma.</p>
                    <button onClick={() => setShowModal(true)} className="text-primary-dark font-bold text-sm hover:underline mt-2">Criar a primeira</button>
                  </div>
                )}
                {loading && (
                  <div className="text-center py-10">Carregando disciplinas...</div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-xl border border-harven-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-harven-bg/50 border-b border-harven-border text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Aluno</th>
                        <th className="p-4">Progresso Geral</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Último Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-harven-bg">
                      {(studentsStats.length > 0 ? studentsStats : filteredStudents)
                        .filter((s: any) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((student: any) => {
                          const progress = student.progress ?? 0;
                          const status = student.total_sessions > 0
                            ? (progress > 70 ? 'Ativo' : progress > 30 ? 'Regular' : 'Iniciante')
                            : 'Sem atividade';
                          const lastAccess = student.last_activity
                            ? new Date(student.last_activity).toLocaleDateString('pt-BR')
                            : 'Nunca';

                          return (
                            <tr key={student.id} className="hover:bg-harven-bg/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-harven-dark text-white flex items-center justify-center font-bold text-xs uppercase">
                                    {student.name ? student.name.charAt(0) : '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-harven-dark">{student.name || 'Sem Nome'}</p>
                                    <p className="text-[10px] text-gray-400">{student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 max-w-[150px]">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${progress > 70 ? 'bg-green-500' : progress > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold text-harven-dark">{progress}%</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  status === 'Ativo' ? 'bg-green-50 text-green-600 border-green-100' :
                                  status === 'Regular' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                  status === 'Iniciante' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-gray-50 text-gray-400 border-gray-200'
                                }`}>
                                  {status}
                                </span>
                              </td>
                              <td className="p-4 text-xs font-medium text-gray-500">{lastAccess}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'grades' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-xl border border-harven-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-harven-bg/50 border-b border-harven-border text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Aluno</th>
                        <th className="p-4 text-center">Nota Média (Reviews)</th>
                        <th className="p-4 text-center">Sessões Avaliadas</th>
                        <th className="p-4 text-center">Conceito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-harven-bg">
                      {(studentsStats.length > 0 ? studentsStats : filteredStudents)
                        .filter((s: any) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((student: any) => {
                          const avgRating = student.avg_rating;
                          const reviewed = student.reviewed_sessions || 0;
                          const total = student.total_sessions || 0;
                          const conceito = avgRating == null ? '—' : avgRating >= 4 ? 'A' : avgRating >= 3 ? 'B' : avgRating >= 2 ? 'C' : 'D';

                          return (
                            <tr key={student.id} className="hover:bg-harven-bg/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-harven-dark text-white flex items-center justify-center font-bold text-xs uppercase">
                                    {student.name ? student.name.charAt(0) : '?'}
                                  </div>
                                  <p className="text-sm font-bold text-harven-dark">{student.name || 'Sem Nome'}</p>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {avgRating != null ? renderStars(Math.round(avgRating)) : <span className="text-xs text-gray-300">Sem avaliação</span>}
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-xs font-bold text-harven-dark">{reviewed}/{total}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-xs font-bold ${conceito === '—' ? 'text-gray-300' : 'text-harven-dark'}`}>{conceito}</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'conversations' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-xl border border-harven-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-harven-bg/50 border-b border-harven-border text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Aluno</th>
                        <th className="p-4">Conteúdo</th>
                        <th className="p-4">Data</th>
                        <th className="p-4 text-center">Msgs</th>
                        <th className="p-4 text-center">Avaliação</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-harven-bg">
                      {conversations
                        .filter(c => c.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.content_title?.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((conv) => {
                          const reviewStatus = conv.review?.status;
                          const statusLabel = !conv.review ? 'Não avaliada' : reviewStatus === 'pending_student' ? 'Aguardando aluno' : reviewStatus === 'replied' ? 'Aluno respondeu' : 'Fechada';
                          const statusColor = !conv.review ? 'bg-gray-50 text-gray-500 border-gray-200' : reviewStatus === 'replied' ? 'bg-blue-50 text-blue-600 border-blue-100' : reviewStatus === 'closed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-200';

                          return (
                            <tr key={conv.id} className="hover:bg-harven-bg/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-harven-dark text-white flex items-center justify-center font-bold text-xs uppercase">
                                    {conv.student_name ? conv.student_name.charAt(0) : '?'}
                                  </div>
                                  <p className="text-sm font-bold text-harven-dark">{conv.student_name || 'Desconhecido'}</p>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-gray-600 max-w-[200px] truncate">{conv.content_title || '—'}</td>
                              <td className="p-4 text-xs text-gray-500">{conv.created_at ? new Date(conv.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="p-4 text-center text-xs font-bold text-harven-dark">{conv.total_messages || 0}</td>
                              <td className="p-4 text-center">
                                {conv.review ? renderStars(conv.review.rating) : <span className="text-xs text-gray-300">—</span>}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => navigate(`/session/${conv.id}/review`)}
                                  className="px-3 py-1.5 bg-harven-bg hover:bg-primary hover:text-harven-dark border border-transparent rounded-lg text-[10px] font-bold text-harven-dark transition-all uppercase tracking-wider"
                                >
                                  {conv.review ? 'VER' : 'AVALIAR'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {conversations.length === 0 && !conversationsLoading && (
                    <div className="p-10 text-center">
                      <p className="text-gray-400 text-sm">Nenhuma conversa socrática encontrada nesta turma.</p>
                    </div>
                  )}
                  {conversationsLoading && (
                    <div className="text-center py-10 text-sm text-gray-400">Carregando conversas...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-harven-border bg-harven-bg flex justify-between items-center">
              <h3 className="text-lg font-display font-bold text-harven-dark">Nova Disciplina</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-harven-dark">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome da Disciplina</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary placeholder-gray-400 text-harven-dark"
                    placeholder="Ex: Física II"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary placeholder-gray-400 text-harven-dark"
                    placeholder="Breve descrição..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL da Imagem de Capa</label>
                  <input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary placeholder-gray-400 text-harven-dark"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  <p className="text-[10px] text-gray-400">Recomendado: 1200x600px</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Professor Responsável</label>
                  <select
                    required
                    value={formData.instructor_id}
                    onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                    className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                  >
                    <option value="" disabled>Selecione um professor</option>
                    {instructors.map((inst: any) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-harven-border rounded-xl text-xs font-bold text-harven-dark hover:bg-gray-50 transition-colors uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-primary hover:bg-primary-dark rounded-xl text-xs font-bold text-harven-dark transition-all uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Criando...
                    </>
                  ) : (
                    'Criar Disciplina'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDetail;
