import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { coursesApi, chaptersApi, contentsApi } from '../services/api';
import { handleApiError } from '../lib/error-handler';
import ConfirmDialog from '../components/ConfirmDialog';

interface Course {
   id: string;
   title: string;
   description?: string;
   image_url?: string;
   status?: string;
   discipline_id?: string;
}

interface Chapter {
   id: string;
   title: string;
   order: number;
   status?: string;
}

interface Content {
   id: string;
   title: string;
   type: string;
}

const CourseEdit: React.FC = () => {
   const navigate = useNavigate();
   const { courseId } = useParams<{ courseId: string }>();

   const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   // Course data
   const [course, setCourse] = useState<Course | null>(null);
   const [chapters, setChapters] = useState<Chapter[]>([]);
   const [chapterContents, setChapterContents] = useState<Record<string, Content[]>>({});
   const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

   // New chapter modal
   const [showChapterModal, setShowChapterModal] = useState(false);
   const [newChapterTitle, setNewChapterTitle] = useState('');

   // Image upload
   const [uploadingImage, setUploadingImage] = useState(false);

   // Confirm dialog
   const [confirmDialog, setConfirmDialog] = useState<{
      open: boolean;
      title: string;
      message: string;
      variant?: 'danger' | 'default';
      onConfirm: () => void;
   }>({
      open: false,
      title: '',
      message: '',
      onConfirm: () => {}
   });

   // Load course data
   useEffect(() => {
      if (!courseId) return;
      const controller = new AbortController();
      const doLoad = async () => {
         setLoading(true);
         try {
            const courseData = await coursesApi.get(courseId!);
            if (controller.signal.aborted) return;
            setCourse(courseData);

            const chaptersData = await chaptersApi.list(courseId!);
            if (controller.signal.aborted) return;
            setChapters(chaptersData || []);

            const contentsMap: Record<string, Content[]> = {};
            for (const ch of chaptersData || []) {
               if (controller.signal.aborted) return;
               try {
                  const contents = await contentsApi.list(ch.id);
                  contentsMap[ch.id] = contents || [];
               } catch (e) {
                  contentsMap[ch.id] = [];
               }
            }
            if (!controller.signal.aborted) {
               setChapterContents(contentsMap);
            }
         } catch (e) {
            if (controller.signal.aborted) return;
            handleApiError(e, 'carregar dados do curso');
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
      setLoading(true);
      try {
         const courseData = await coursesApi.get(courseId!);
         setCourse(courseData);

         const chaptersData = await chaptersApi.list(courseId!);
         setChapters(chaptersData || []);

         const contentsMap: Record<string, Content[]> = {};
         for (const ch of chaptersData || []) {
            try {
               const contents = await contentsApi.list(ch.id);
               contentsMap[ch.id] = contents || [];
            } catch (e) {
               contentsMap[ch.id] = [];
            }
         }
         setChapterContents(contentsMap);
      } catch (e) {
         console.error("Erro ao carregar curso:", e);
         toast.error("Erro ao carregar dados do curso");
      } finally {
         setLoading(false);
      }
   };

   const handleSave = async () => {
      if (!course || !courseId) return;
      setSaving(true);
      try {
         await coursesApi.update(courseId, {
            title: course.title,
            description: course.description,
            image_url: course.image_url
         });
         toast.success("Curso atualizado com sucesso!");
      } catch (e) {
         handleApiError(e, 'salvar alterações');
      } finally {
         setSaving(false);
      }
   };

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !courseId) return;
      setUploadingImage(true);
      try {
         const file = e.target.files[0];
         // Preview
         const tempUrl = URL.createObjectURL(file);
         setCourse(prev => prev ? { ...prev, image_url: tempUrl } : null);
         // Upload
         const result = await coursesApi.uploadImage(courseId, file);
         setCourse(prev => prev ? { ...prev, image_url: result.image_url } : null);
         // Show warning if there's one (database column missing)
         if (result.warning) {
            console.warn("Upload warning:", result.warning);
            toast.info(`Imagem enviada! Nota: ${result.warning}`);
         } else {
            toast.success("Imagem de capa atualizada com sucesso!");
         }
      } catch (error: unknown) {
         console.error("Erro no upload:", error);
         const errorMsg = (error as any)?.response?.data?.detail || "Erro ao fazer upload da imagem. Verifique o console para mais detalhes.";
         toast.error(errorMsg);
         // Revert to previous image
         loadData();
      } finally {
         setUploadingImage(false);
      }
   };

   const toggleChapterExpanded = (chapterId: string) => {
      setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
   };

   const handleAddChapter = async () => {
      if (!newChapterTitle || !courseId) return;
      try {
         await chaptersApi.create(courseId, {
            title: newChapterTitle,
            order: chapters.length + 1
         });
         setNewChapterTitle('');
         setShowChapterModal(false);
         await loadData();
      } catch (e) {
         handleApiError(e, 'criar módulo');
      }
   };

   const handleDeleteChapter = async (chapterId: string) => {
      setConfirmDialog({
         open: true,
         title: 'Excluir Modulo',
         message: 'Tem certeza que deseja apagar este modulo e todo seu conteudo?',
         variant: 'danger',
         onConfirm: async () => {
            try {
               await chaptersApi.delete(chapterId);
               await loadData();
            } catch (e) {
               handleApiError(e, 'excluir módulo');
            }
         }
      });
   };

   const handleDeleteCourse = async () => {
      setConfirmDialog({
         open: true,
         title: 'Excluir Curso',
         message: 'TEM CERTEZA? Esta acao e irreversivel. Todo o conteudo sera perdido.',
         variant: 'danger',
         onConfirm: async () => {
            try {
               await coursesApi.delete(courseId!);
               toast.success("Curso excluido.");
               navigate(-1);
            } catch (e) {
               handleApiError(e, 'excluir curso');
            }
         }
      });
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
               <p className="text-gray-500">Carregando curso...</p>
            </div>
         </div>
      );
   }

   if (!course) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="text-center">
               <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">error</span>
               <p className="text-gray-500 text-lg">Curso nao encontrado</p>
               <button onClick={() => navigate(-1)} className="mt-4 text-primary-dark font-bold hover:underline">
                  Voltar
               </button>
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full bg-harven-bg">
         {/* Header */}
         <div className="bg-white border-b border-harven-border px-8 py-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-4">
               <div>
                  <h1 className="text-xl font-display font-bold text-harven-dark flex items-center gap-2">
                     {course.title}
                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                        course.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                     }`}>
                        {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                     </span>
                  </h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     Curso • {courseId?.substring(0, 8)}...
                  </p>
               </div>
            </div>
            <div className="flex gap-3">
               <button
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-harven-dark uppercase tracking-widest flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors"
               >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Voltar
               </button>
               <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-harven-dark font-bold rounded-lg text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
               >
                  <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Salvando...' : 'Salvar'}
               </button>
            </div>
         </div>

         <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-harven-border flex flex-col py-6">
               <nav className="space-y-1 px-4">
                  <button
                     onClick={() => setActiveTab('content')}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'content' ? 'bg-harven-bg text-harven-dark shadow-inner' : 'text-gray-400 hover:bg-gray-50'
                     }`}
                  >
                     <span className={`material-symbols-outlined ${activeTab === 'content' ? 'fill-1' : ''}`}>account_tree</span>
                     Estrutura do Curso
                  </button>
                  <button
                     onClick={() => setActiveTab('settings')}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'settings' ? 'bg-harven-bg text-harven-dark shadow-inner' : 'text-gray-400 hover:bg-gray-50'
                     }`}
                  >
                     <span className={`material-symbols-outlined ${activeTab === 'settings' ? 'fill-1' : ''}`}>settings</span>
                     Configuracoes
                  </button>
               </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
               <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                  {activeTab === 'content' && (
                     <>
                        {/* Chapter management */}
                        <div className="flex justify-between items-center">
                           <div>
                              <h3 className="text-lg font-display font-bold text-harven-dark">Modulos e Conteudos</h3>
                              <p className="text-gray-500 text-sm">Organize a estrutura do seu curso</p>
                           </div>
                           <button
                              onClick={() => setShowChapterModal(true)}
                              className="bg-harven-dark text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black transition-colors"
                           >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              Novo Modulo
                           </button>
                        </div>

                        {/* New chapter modal */}
                        {showChapterModal && (
                           <div className="bg-white p-4 rounded-xl border border-harven-border shadow-md animate-in zoom-in-95">
                              <h4 className="font-bold mb-2">Novo Modulo</h4>
                              <div className="flex gap-2">
                                 <input
                                    autoFocus
                                    className="flex-1 bg-harven-bg border-none rounded-lg px-3 py-2 text-sm"
                                    placeholder="Ex: Introducao ao Tema"
                                    value={newChapterTitle}
                                    onChange={(e) => setNewChapterTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
                                 />
                                 <button onClick={handleAddChapter} className="bg-primary px-4 py-2 rounded-lg font-bold text-xs text-harven-dark">
                                    Criar
                                 </button>
                                 <button onClick={() => setShowChapterModal(false)} className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-xs text-gray-500">
                                    Cancelar
                                 </button>
                              </div>
                           </div>
                        )}

                        {/* Chapters list */}
                        <div className="space-y-4">
                           {chapters.map((chapter, index) => {
                              const contents = chapterContents[chapter.id] || [];
                              const isExpanded = expandedChapters[chapter.id];

                              return (
                                 <div key={chapter.id} className="bg-white rounded-xl border border-harven-border overflow-hidden group hover:border-primary transition-all">
                                    <div className="p-4 flex items-center gap-4">
                                       <div className="flex flex-col gap-1 text-gray-300">
                                          <span className="material-symbols-outlined text-[18px] cursor-move">drag_indicator</span>
                                       </div>
                                       <div className="size-10 bg-harven-bg rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm">
                                          {index + 1}
                                       </div>
                                       <div className="flex-1 cursor-pointer" onClick={() => toggleChapterExpanded(chapter.id)}>
                                          <h4 className="font-bold text-harven-dark flex items-center gap-2">
                                             {chapter.title}
                                             <span className={`material-symbols-outlined text-[16px] text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                expand_more
                                             </span>
                                          </h4>
                                          <p className="text-xs text-gray-400">{contents.length} conteudo(s)</p>
                                       </div>
                                       <button
                                          onClick={() => navigate(`/course/${courseId}/chapter/${chapter.id}/new-content`)}
                                          className="px-3 py-1.5 bg-primary/10 text-primary-dark rounded-lg text-xs font-bold hover:bg-primary hover:text-harven-dark transition-colors flex items-center gap-1"
                                       >
                                          <span className="material-symbols-outlined text-[14px]">add</span>
                                          Adicionar
                                       </button>
                                       <button
                                          onClick={() => handleDeleteChapter(chapter.id)}
                                          className="size-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                                       >
                                          <span className="material-symbols-outlined text-[20px]">delete</span>
                                       </button>
                                    </div>

                                    {/* Expanded contents */}
                                    {isExpanded && (
                                       <div className="border-t border-harven-border bg-harven-bg/30 p-4 animate-in slide-in-from-top-2 duration-200">
                                          {contents.length === 0 ? (
                                             <p className="text-center text-gray-400 text-sm py-4">
                                                Nenhum conteudo ainda. Clique em "Adicionar" para criar.
                                             </p>
                                          ) : (
                                             <div className="space-y-2">
                                                {contents.map((content) => {
                                                   const contentTypeLower = content.type?.toLowerCase() || 'text';
                                                   return (
                                                      <div
                                                         key={content.id}
                                                         className="flex items-center gap-3 p-3 bg-white rounded-lg border border-harven-border hover:border-primary transition-all group"
                                                      >
                                                         <span
                                                            className={`material-symbols-outlined cursor-pointer ${
                                                               contentTypeLower === 'video' ? 'text-red-500' :
                                                               contentTypeLower === 'audio' ? 'text-purple-500' : 'text-blue-500'
                                                            }`}
                                                            onClick={() => navigate(`/course/${courseId}/chapter/${chapter.id}/content/${content.id}/revision`)}
                                                         >
                                                            {contentTypeLower === 'video' ? 'movie' : contentTypeLower === 'audio' ? 'headphones' : 'description'}
                                                         </span>
                                                         <div
                                                            className="flex-1 cursor-pointer"
                                                            onClick={() => navigate(`/course/${courseId}/chapter/${chapter.id}/content/${content.id}/revision`)}
                                                         >
                                                            <p className="text-sm font-bold text-harven-dark">{content.title}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase">{content.type || 'texto'}</p>
                                                         </div>
                                                         <div className="flex items-center gap-1">
                                                            <button
                                                               onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  navigate(`/course/${courseId}/chapter/${chapter.id}/content/${content.id}/revision`);
                                                               }}
                                                               className="size-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                                                               title="Editar conteúdo"
                                                            >
                                                               <span className="material-symbols-outlined text-[20px]">edit</span>
                                                            </button>
                                                            <button
                                                               onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setConfirmDialog({
                                                                     open: true,
                                                                     title: 'Excluir Conteudo',
                                                                     message: `Tem certeza que deseja excluir "${content.title}"?`,
                                                                     variant: 'danger',
                                                                     onConfirm: async () => {
                                                                        try {
                                                                           await contentsApi.delete(content.id);
                                                                           await loadData();
                                                                        } catch (err) {
                                                                           handleApiError(err, 'excluir conteúdo');
                                                                        }
                                                                     }
                                                                  });
                                                               }}
                                                               className="size-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                                                               title="Excluir conteúdo"
                                                            >
                                                               <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            </button>
                                                         </div>
                                                      </div>
                                                   );
                                                })}
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              );
                           })}

                           {chapters.length === 0 && (
                              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                 <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">folder_open</span>
                                 <p className="text-gray-500 font-medium">Nenhum modulo criado ainda</p>
                                 <p className="text-gray-400 text-sm mt-1">Crie modulos para organizar o conteudo do curso</p>
                                 <button
                                    onClick={() => setShowChapterModal(true)}
                                    className="mt-4 bg-primary text-harven-dark text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-primary-dark transition-colors"
                                 >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Criar Primeiro Modulo
                                 </button>
                              </div>
                           )}
                        </div>
                     </>
                  )}

                  {activeTab === 'settings' && (
                     <div className="space-y-8">
                        {/* Course Info */}
                        <section className="bg-white p-8 rounded-2xl border border-harven-border shadow-sm space-y-6">
                           <h3 className="text-lg font-display font-bold text-harven-dark border-b border-harven-bg pb-4">
                              Informacoes do Curso
                           </h3>
                           <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Curso</label>
                                 <input
                                    className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                    value={course.title}
                                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descricao</label>
                                 <textarea
                                    className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark min-h-[100px] resize-none"
                                    value={course.description || ''}
                                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                    placeholder="Descreva o conteudo do curso..."
                                 />
                              </div>
                           </div>
                        </section>

                        {/* Cover Image */}
                        <section className="bg-white p-8 rounded-2xl border border-harven-border shadow-sm space-y-6">
                           <h3 className="text-lg font-display font-bold text-harven-dark border-b border-harven-bg pb-4">
                              Imagem de Capa
                           </h3>
                           <div className="space-y-4">
                              {course.image_url && (
                                 <div className="relative w-full h-48 rounded-lg overflow-hidden border border-harven-border">
                                    <img src={course.image_url} alt="Capa" className="w-full h-full object-cover" />
                                    {uploadingImage && (
                                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                       </div>
                                    )}
                                 </div>
                              )}
                              <div className="flex gap-2">
                                 <input
                                    className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                    placeholder="URL da imagem (https://...)"
                                    value={course.image_url || ''}
                                    onChange={(e) => setCourse({ ...course, image_url: e.target.value })}
                                 />
                                 <label className={`px-4 bg-harven-bg hover:bg-gray-200 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="material-symbols-outlined text-gray-500">upload_file</span>
                                    <input
                                       type="file"
                                       className="hidden"
                                       accept="image/*"
                                       onChange={handleImageUpload}
                                       disabled={uploadingImage}
                                    />
                                 </label>
                              </div>
                              <p className="text-[10px] text-gray-400">Recomendado: 1200x600px</p>
                           </div>
                        </section>

                        {/* Danger Zone */}
                        <section className="bg-red-50 p-8 rounded-2xl border border-red-200 space-y-6">
                           <h3 className="text-lg font-display font-bold text-red-700 border-b border-red-200 pb-4">
                              Zona de Perigo
                           </h3>
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-sm font-bold text-red-900">Excluir este Curso</p>
                                 <p className="text-xs text-red-600">Esta acao nao pode ser desfeita. Todos os modulos e conteudos serao apagados.</p>
                              </div>
                              <button
                                 onClick={handleDeleteCourse}
                                 className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
                              >
                                 Excluir Curso
                              </button>
                           </div>
                        </section>
                     </div>
                  )}

               </div>
            </div>
         </div>

         <ConfirmDialog
            open={confirmDialog.open}
            title={confirmDialog.title}
            message={confirmDialog.message}
            variant={confirmDialog.variant}
            onConfirm={() => {
               confirmDialog.onConfirm();
               setConfirmDialog(prev => ({ ...prev, open: false }));
            }}
            onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
         />
      </div>
   );
};

export default CourseEdit;
