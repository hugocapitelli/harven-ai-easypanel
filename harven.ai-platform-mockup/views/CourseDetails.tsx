import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { UserRole } from '../types';
import { coursesApi, chaptersApi, contentsApi } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ConfirmDialog';

interface CourseDetailsProps {
  userRole: UserRole;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const isInstructor = userRole === 'INSTRUCTOR';

  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'about' | 'resources' | 'discussion'>('content');

  // Estados para edição
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleData, setEditModuleData] = useState({ title: '', description: '' });
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");

  // Estados para criação de capítulo/aula
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);

  // Discussion comments — driven by API, no local mock data
  const [comments, setComments] = useState<any[]>([]);

  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    contentId?: string;
  }>({
    open: false,
    contentId: undefined,
  });

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const doLoad = async () => {
      try {
        setLoading(true);
        const [courseData, chaptersData] = await Promise.all([
          coursesApi.get(courseId),
          chaptersApi.list(courseId)
        ]);
        if (controller.signal.aborted) return;
        setCourse(courseData);
        setAboutText(courseData.description || "Sem descrição.");
        setModules(chaptersData || []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Erro ao carregar curso:", error);
        setCourse(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    doLoad();
    return () => controller.abort();
  }, [courseId]);

  const loadData = async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [courseData, chaptersData] = await Promise.all([
        coursesApi.get(courseId),
        chaptersApi.list(courseId)
      ]);
      setCourse(courseData);
      setAboutText(courseData.description || "Sem descrição.");
      setModules(chaptersData || []);
    } catch (error) {
      console.error("Erro ao carregar curso:", error);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModuleId(expandedModuleId === id ? null : id);
  };

  const handleAddModule = async () => {
    const newOrder = modules.length + 1;
    try {
      await chaptersApi.create(courseId, {
        title: `Novo Módulo ${newOrder}`,
        description: '',
        order: newOrder
      });
      loadData();
    } catch (e) {
      toast.error("Erro ao criar módulo");
    }
  };

  const startEditingModule = (e: React.MouseEvent, module: any) => {
    e.stopPropagation();
    setEditingModuleId(module.id);
    setEditModuleData({ title: module.title, description: module.description || '' });
  };

  const saveModule = async (id: string) => {
    try {
      await chaptersApi.update(id, editModuleData);
      loadData();
    } catch (e) {
      console.error("Erro ao atualizar módulo:", e);
      toast.error("Erro ao salvar alterações do módulo.");
    }
    setEditingModuleId(null);
  };

  const openChapterModal = (moduleId: string) => {
    setNewChapterTitle('');
    setTargetModuleId(moduleId);
    // Navigate to ContentCreation passing the chapterId (module ID) directly
    navigate(`/course/${courseId}/chapter/${moduleId}/new-content`);
  };


  const tabs = [
    { id: 'content', label: 'Conteúdo', icon: 'list_alt' },
    { id: 'about', label: 'Sobre', icon: 'info' },
    { id: 'resources', label: 'Recursos', icon: 'folder_open' },
    { id: 'discussion', label: 'Discussão', icon: 'forum', count: comments.length }
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#f8f9fa]">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border p-6 flex items-center gap-5">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
          <p className="text-lg font-bold text-gray-600">Curso não encontrado</p>
          <p className="text-sm text-gray-400 mt-2">O curso solicitado não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#f8f9fa] animate-in fade-in duration-500">
      <div className="relative h-64 bg-harven-dark overflow-hidden flex-shrink-0 group">
        <img src={course.image || course.image_url || "https://picsum.photos/seed/growth/1200/600"} className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-harven-dark via-harven-dark/60 to-transparent p-8 flex flex-col justify-end">
          {/* Botão Voltar no topo do banner */}
          <button
            onClick={() => navigate(isInstructor ? '/instructor' : '/dashboard')}
            className="absolute top-4 left-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight tracking-tight drop-shadow-md relative">
                {course.title}
                {isInstructor && (
                  <button
                    onClick={() => navigate(`/instructor/discipline/${courseId}/info`)}
                    className="absolute -right-10 top-1 text-gray-400 hover:text-primary transition-colors"
                    title="Configurações do Curso"
                  >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                  </button>
                )}
              </h1>
              <p className="text-white/80 flex items-center gap-2 text-sm font-medium">
                Instrutor • {course.status || 'Ativo'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8">

        {/* Navegação de Abas */}
        <div className="sticky top-0 z-20 bg-[#f8f9fa]/95 backdrop-blur-sm pt-2 flex justify-between items-center">
          <div className="bg-white rounded-xl border border-harven-border p-1.5 shadow-sm flex overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap min-w-fit
                  ${activeTab === tab.id
                    ? 'bg-harven-dark text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-harven-dark'
                  }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-primary' : 'text-gray-400'}`}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'content' && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {isInstructor && (
                <button
                  onClick={handleAddModule}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-400 font-bold hover:bg-white hover:border-primary hover:text-primary-dark transition-all"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Adicionar Novo Módulo
                </button>
              )}

              {modules.map((module) => {
                const isExpanded = expandedModuleId === module.id;
                const isEditing = editingModuleId === module.id;
                const lessonCount = module.contents ? module.contents.length : 0;

                return (
                  <div
                    key={module.id}
                    className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${isExpanded ? 'border-primary/50 ring-1 ring-primary/20 shadow-md' : 'border-harven-border hover:border-gray-300'}`}
                  >
                    <div
                      className="p-6 flex justify-between items-center bg-white cursor-pointer hover:bg-gray-50 transition-colors select-none group"
                      onClick={() => !isEditing && toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-5 w-full">
                        <div className={`size-10 rounded-full flex items-center justify-center text-harven-dark transition-all duration-300 ${isExpanded ? 'bg-primary text-harven-dark rotate-180' : 'bg-harven-bg group-hover:bg-gray-200'}`}>
                          <span className="material-symbols-outlined text-[24px]">expand_more</span>
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                className="w-full bg-harven-bg border border-primary/50 rounded px-2 py-1 text-lg font-bold text-harven-dark focus:ring-primary"
                                value={editModuleData.title}
                                onChange={(e) => setEditModuleData({ ...editModuleData, title: e.target.value })}
                                autoFocus
                              />
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => saveModule(module.id)} className="bg-primary px-3 py-1 rounded text-xs font-bold text-harven-dark">Salvar</button>
                                <button onClick={() => setEditingModuleId(null)} className="bg-gray-200 px-3 py-1 rounded text-xs font-bold text-gray-600">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-harven-dark text-lg flex items-center gap-2">
                                {module.title}
                                {isInstructor && <button onClick={(e) => startEditingModule(e, module)} className="p-1 rounded hover:bg-harven-bg text-gray-300 hover:text-primary-dark transition-colors"><span className="material-symbols-outlined text-[16px]">edit</span></button>}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">
                                {lessonCount} {lessonCount === 1 ? 'Aula' : 'Aulas'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="divide-y divide-harven-border border-t border-harven-border bg-harven-bg/30">
                        {module.contents && module.contents.map((chapter: any) => (
                          <div
                            key={chapter.id}
                            onClick={() => {
                              // Navega para leitura passando o ID do conteúdo e info do módulo/curso
                              navigate(`/course/${courseId}/chapter/${module.id}/content/${chapter.id}`);
                            }}
                            className={`p-5 flex justify-between items-center transition-all cursor-pointer relative group/chapter hover:bg-white border-l-4 border-l-transparent hover:border-l-primary`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="material-symbols-outlined text-gray-400 text-[22px]">
                                {chapter.type === 'VIDEO' ? 'play_circle' : chapter.type === 'AUDIO' ? 'headphones' : 'article'}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-harven-dark">{chapter.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{chapter.type}</p>
                              </div>
                            </div>
                            {isInstructor && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/course/${courseId}/chapter/${module.id}/content/${chapter.id}/revision`);
                                  }}
                                  className="p-1.5 bg-white border border-harven-border rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                                  title="Editar conteúdo"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({
                                      open: true,
                                      contentId: chapter.id,
                                    });
                                  }}
                                  className="p-1.5 bg-white border border-harven-border rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                                  title="Excluir conteúdo"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {isInstructor && (
                          <button
                            onClick={() => openChapterModal(module.id)}
                            className="w-full py-3 text-xs font-bold text-gray-400 uppercase hover:bg-white hover:text-primary-dark transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Adicionar Aula
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-white p-8 rounded-xl border border-harven-border animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm space-y-8 relative group">
              <div className="prose prose-sm max-w-none text-gray-600">
                <h3 className="text-xl font-display font-bold text-harven-dark mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">verified</span>
                  Sobre o Curso
                </h3>
                <p className="leading-relaxed text-base">{aboutText}</p>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="bg-white p-8 rounded-xl border border-harven-border animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">folder_open</span>
              <p className="text-gray-500 font-medium">Nenhum recurso disponível</p>
              <p className="text-sm text-gray-400 mt-1">Recursos complementares serão adicionados pelo instrutor.</p>
            </div>
          )}

          {activeTab === 'discussion' && (
            <div className="bg-white p-8 rounded-xl border border-harven-border animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">forum</span>
              <p className="text-gray-500 font-medium">Nenhuma discussão ainda</p>
              <p className="text-sm text-gray-400 mt-1">Em breve você poderá discutir com seus colegas aqui.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Excluir Conteúdo"
        message="Tem certeza que deseja excluir este conteúdo?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          if (confirmDialog.contentId) {
            try {
              await contentsApi.delete(confirmDialog.contentId);
              loadData();
            } catch (err) {
              toast.error('Erro ao excluir conteúdo');
            }
          }
          setConfirmDialog({ open: false, contentId: undefined });
        }}
        onCancel={() => {
          setConfirmDialog({ open: false, contentId: undefined });
        }}
      />
    </div>
  );
};

export default CourseDetails;
