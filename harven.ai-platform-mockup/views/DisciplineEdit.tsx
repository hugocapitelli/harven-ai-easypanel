import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { disciplinesApi, coursesApi, usersApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

interface Discipline {
   id: string;
   title: string;
   code?: string;
   department?: string;
   description?: string;
   image?: string;
   status?: string;
}

interface Course {
   id: string;
   title: string;
   description?: string;
   image?: string;
   image_url?: string;
   status?: string;
   chapters_count?: number;
}

const DisciplineEdit: React.FC = () => {
   const navigate = useNavigate();
   const { disciplineId } = useParams<{ disciplineId: string }>();

   const [activeTab, setActiveTab] = useState<'courses' | 'settings'>('courses');
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   // Discipline data
   const [discipline, setDiscipline] = useState<Discipline | null>(null);
   const [courses, setCourses] = useState<Course[]>([]);

   // New course modal
   const [showCourseModal, setShowCourseModal] = useState(false);
   const [newCourseTitle, setNewCourseTitle] = useState('');
   const [newCourseDescription, setNewCourseDescription] = useState('');
   const [instructors, setInstructors] = useState<any[]>([]);

   // Image upload
   const [uploadingImage, setUploadingImage] = useState(false);

   // Confirm Dialog
   const [confirmDialog, setConfirmDialog] = useState<{open: boolean; title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

   // Load discipline data
   useEffect(() => {
      if (!disciplineId) return;
      const controller = new AbortController();
      const doLoad = async () => {
         setLoading(true);
         try {
            const disciplineData = await disciplinesApi.get(disciplineId!);
            if (controller.signal.aborted) return;
            setDiscipline(disciplineData);

            const coursesData = await coursesApi.listByClass(disciplineId!);
            if (controller.signal.aborted) return;
            setCourses(coursesData || []);

            const usersData = await usersApi.list();
            if (controller.signal.aborted) return;
            setInstructors(usersData || []);
         } catch (e) {
            if (controller.signal.aborted) return;
            console.error("Erro ao carregar disciplina:", e);
            toast.error("Erro ao carregar dados da disciplina");
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
         const disciplineData = await disciplinesApi.get(disciplineId!);
         setDiscipline(disciplineData);

         const coursesData = await coursesApi.listByClass(disciplineId!);
         setCourses(coursesData || []);

         const usersData = await usersApi.list();
         setInstructors(usersData || []);
      } catch (e) {
         console.error("Erro ao carregar disciplina:", e);
         toast.error("Erro ao carregar dados da disciplina");
      } finally {
         setLoading(false);
      }
   };

   const handleSave = async () => {
      if (!discipline || !disciplineId) return;
      setSaving(true);
      try {
         await disciplinesApi.update(disciplineId, {
            title: discipline.title,
            code: discipline.code,
            department: discipline.department,
            description: discipline.description
         });
         toast.success("Disciplina atualizada com sucesso!");
      } catch (e) {
         console.error("Erro ao salvar:", e);
         toast.error("Erro ao salvar alteracoes");
      } finally {
         setSaving(false);
      }
   };

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !disciplineId) return;
      setUploadingImage(true);
      try {
         const file = e.target.files[0];
         // Preview
         const tempUrl = URL.createObjectURL(file);
         setDiscipline(prev => prev ? { ...prev, image: tempUrl } : null);
         // Upload
         const result = await disciplinesApi.uploadImage(disciplineId, file);
         setDiscipline(prev => prev ? { ...prev, image: result.image_url || result.image } : null);
         if (result.warning) {
            console.warn("Upload warning:", result.warning);
            toast.info(`Imagem enviada! Nota: ${result.warning}`);
         } else {
            toast.success("Imagem de capa atualizada com sucesso!");
         }
      } catch (error: unknown) {
         console.error("Erro no upload:", error);
         const errorMsg = (error as any)?.response?.data?.detail || "Erro ao fazer upload da imagem.";
         toast.error(errorMsg);
         loadData();
      } finally {
         setUploadingImage(false);
      }
   };

   const handleAddCourse = async () => {
      if (!newCourseTitle || !disciplineId) return;
      try {
         await coursesApi.create(disciplineId, {
            title: newCourseTitle,
            description: newCourseDescription,
            instructor_id: instructors[0]?.id || ''
         });
         setNewCourseTitle('');
         setNewCourseDescription('');
         setShowCourseModal(false);
         await loadData();
      } catch (e: any) {
         console.error("Erro ao criar curso:", e);
         toast.error(`Erro ao criar curso: ${e.response?.data?.detail || e.message}`);
      }
   };

   const handleDeleteCourse = async (courseId: string) => {
      setConfirmDialog({
         open: true,
         title: 'Excluir Curso',
         message: 'Tem certeza que deseja excluir este curso e todo seu conteudo?',
         variant: 'danger',
         onConfirm: async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            try {
               await coursesApi.delete(courseId);
               await loadData();
            } catch (e) {
               console.error("Erro ao deletar:", e);
               toast.error("Erro ao deletar curso");
            }
         }
      });
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
               <p className="text-gray-500">Carregando disciplina...</p>
            </div>
         </div>
      );
   }

   if (!discipline) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="text-center">
               <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">error</span>
               <p className="text-gray-500 text-lg">Disciplina nao encontrada</p>
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
                     {discipline.title}
                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                        discipline.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                     }`}>
                        {discipline.status === 'active' ? 'Ativa' : 'Inativa'}
                     </span>
                  </h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     Disciplina • {discipline.code || disciplineId?.substring(0, 8)}
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
                     onClick={() => setActiveTab('courses')}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'courses' ? 'bg-harven-bg text-harven-dark shadow-inner' : 'text-gray-400 hover:bg-gray-50'
                     }`}
                  >
                     <span className={`material-symbols-outlined ${activeTab === 'courses' ? 'fill-1' : ''}`}>menu_book</span>
                     Materiais da Disciplina
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

                  {activeTab === 'courses' && (
                     <>
                        {/* Course management */}
                        <div className="flex justify-between items-center">
                           <div>
                              <h3 className="text-lg font-display font-bold text-harven-dark">Materiais da Disciplina</h3>
                              <p className="text-gray-500 text-sm">Gerencie os materiais que fazem parte desta disciplina</p>
                           </div>
                           <button
                              onClick={() => setShowCourseModal(true)}
                              className="bg-harven-dark text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black transition-colors"
                           >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              Novo Curso
                           </button>
                        </div>

                        {/* New course modal */}
                        {showCourseModal && (
                           <div className="bg-white p-6 rounded-xl border border-harven-border shadow-md animate-in zoom-in-95 space-y-4">
                              <h4 className="font-bold text-harven-dark">Novo Curso</h4>
                              <div className="space-y-3">
                                 <input
                                    autoFocus
                                    className="w-full bg-harven-bg border-none rounded-lg px-3 py-2.5 text-sm"
                                    placeholder="Nome do Curso"
                                    value={newCourseTitle}
                                    onChange={(e) => setNewCourseTitle(e.target.value)}
                                 />
                                 <textarea
                                    className="w-full bg-harven-bg border-none rounded-lg px-3 py-2.5 text-sm resize-none"
                                    placeholder="Descricao (opcional)"
                                    rows={2}
                                    value={newCourseDescription}
                                    onChange={(e) => setNewCourseDescription(e.target.value)}
                                 />
                              </div>
                              <div className="flex gap-2 justify-end">
                                 <button onClick={() => setShowCourseModal(false)} className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-xs text-gray-500">
                                    Cancelar
                                 </button>
                                 <button onClick={handleAddCourse} className="bg-primary px-4 py-2 rounded-lg font-bold text-xs text-harven-dark">
                                    Criar Curso
                                 </button>
                              </div>
                           </div>
                        )}

                        {/* Courses list */}
                        <div className="space-y-4">
                           {courses.map((course) => (
                              <div key={course.id} className="bg-white rounded-xl border border-harven-border overflow-hidden group hover:border-primary transition-all">
                                 <div className="p-4 flex items-center gap-4">
                                    <div className="size-16 bg-harven-bg rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                       {(course.image || course.image_url) ? (
                                          <img src={course.image || course.image_url} alt={course.title} className="w-full h-full object-cover" />
                                       ) : (
                                          <span className="material-symbols-outlined text-2xl text-gray-400">menu_book</span>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-harven-dark truncate">{course.title}</h4>
                                       <p className="text-xs text-gray-400 truncate">{course.description || 'Sem descricao'}</p>
                                       <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                             {course.chapters_count || 0} módulos
                                          </span>
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                             course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                             {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                                          </span>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button
                                          onClick={() => navigate(`/course/${course.id}/edit`)}
                                          className="px-3 py-1.5 bg-harven-bg text-harven-dark rounded-lg text-xs font-bold hover:bg-primary transition-colors flex items-center gap-1"
                                       >
                                          <span className="material-symbols-outlined text-[14px]">edit</span>
                                          Editar
                                       </button>
                                       <button
                                          onClick={() => handleDeleteCourse(course.id)}
                                          className="size-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                                       >
                                          <span className="material-symbols-outlined text-[20px]">delete</span>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}

                           {courses.length === 0 && (
                              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                 <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">menu_book</span>
                                 <p className="text-gray-500 font-medium">Nenhum curso nesta disciplina</p>
                                 <p className="text-gray-400 text-sm mt-1">Crie cursos para organizar o conteudo da disciplina</p>
                                 <button
                                    onClick={() => setShowCourseModal(true)}
                                    className="mt-4 bg-primary text-harven-dark text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-primary-dark transition-colors"
                                 >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Criar Primeiro Curso
                                 </button>
                              </div>
                           )}
                        </div>
                     </>
                  )}

                  {activeTab === 'settings' && (
                     <div className="space-y-8">
                        {/* Discipline Info */}
                        <section className="bg-white p-8 rounded-2xl border border-harven-border shadow-sm space-y-6">
                           <h3 className="text-lg font-display font-bold text-harven-dark border-b border-harven-bg pb-4">
                              Informacoes da Disciplina
                           </h3>
                           <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome da Disciplina</label>
                                 <input
                                    className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                    value={discipline.title}
                                    onChange={(e) => setDiscipline({ ...discipline, title: e.target.value })}
                                 />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Codigo</label>
                                    <input
                                       className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                       value={discipline.code || ''}
                                       onChange={(e) => setDiscipline({ ...discipline, code: e.target.value })}
                                       placeholder="Ex: ADM-01"
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departamento</label>
                                    <select
                                       className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                       value={discipline.department || ''}
                                       onChange={(e) => setDiscipline({ ...discipline, department: e.target.value })}
                                    >
                                       <option value="">Selecione...</option>
                                       <option value="Engenharia">Engenharia</option>
                                       <option value="Direito">Direito</option>
                                       <option value="Saude">Saude</option>
                                       <option value="Humanidades">Humanidades</option>
                                       <option value="Exatas">Exatas</option>
                                       <option value="Negocios">Negocios</option>
                                    </select>
                                 </div>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descricao</label>
                                 <textarea
                                    className="w-full bg-harven-bg border-none rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark min-h-[100px] resize-none"
                                    value={discipline.description || ''}
                                    onChange={(e) => setDiscipline({ ...discipline, description: e.target.value })}
                                    placeholder="Descreva o conteudo da disciplina..."
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
                              {discipline.image && (
                                 <div className="relative w-full h-48 rounded-lg overflow-hidden border border-harven-border">
                                    <img src={discipline.image} alt="Capa" className="w-full h-full object-cover" />
                                    {uploadingImage && (
                                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                       </div>
                                    )}
                                 </div>
                              )}
                              <div className="flex gap-2">
                                 <label className={`flex-1 px-4 py-3 bg-harven-bg hover:bg-gray-200 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="material-symbols-outlined text-gray-500">upload_file</span>
                                    <span className="text-sm font-medium text-gray-600">Escolher Imagem</span>
                                    <input
                                       type="file"
                                       className="hidden"
                                       accept="image/*"
                                       onChange={handleImageUpload}
                                       disabled={uploadingImage}
                                    />
                                 </label>
                              </div>
                              <p className="text-[10px] text-gray-400">Recomendado: 1200x600px. JPG ou PNG.</p>
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
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
         />
      </div>
   );
};

export default DisciplineEdit;
