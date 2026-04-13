
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { contentsApi, questionsApi, aiApi } from '../services/api';

const ContentCreation: React.FC = () => {
   const navigate = useNavigate();
   const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
   const [file, setFile] = useState<File | null>(null);
   const [mediaType, setMediaType] = useState<'text' | 'video' | 'audio'>('text');
   const [uploadProgress, setUploadProgress] = useState(0);
   const [isUploading, setIsUploading] = useState(false);

   // Flow enforced: Upload -> Selection (Method) -> Processing/Manual
   const [step, setStep] = useState<'upload' | 'selection' | 'manual' | 'ai_processing'>('upload');
   const [processingProgress, setProcessingProgress] = useState(0);
   const [processingStage, setProcessingStage] = useState('Inicializando...');

   // Uploaded file data
   const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

   // Manual Creation Data
   const [contentTitle, setContentTitle] = useState('Novo Conteúdo');
   const [textContent, setTextContent] = useState('');
   const [manualQuestions, setManualQuestions] = useState<any[]>([
      { question_text: '', expected_answer: '', difficulty: 'medium' }
   ]);

   // AI Generated Questions
   const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<any[]>([]);
   const [aiError, setAiError] = useState<string | null>(null);

   const handleFileDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles[0]) {
         await processFile(droppedFiles[0]);
      }
   };

   const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         await processFile(e.target.files[0]);
      }
   };

   const processFile = async (selectedFile: File) => {
      if (!chapterId) {
         toast.error("Erro: ID do capítulo não encontrado.");
         return;
      }

      // Detectar tipo baseado na extensão do arquivo localmente também
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const localTypeMap: Record<string, 'text' | 'video' | 'audio'> = {
         'pdf': 'text', 'doc': 'text', 'docx': 'text', 'txt': 'text', 'pptx': 'text',
         'mp4': 'video', 'mov': 'video', 'avi': 'video', 'webm': 'video', 'mkv': 'video',
         'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio', 'aac': 'audio'
      };
      const detectedType = localTypeMap[fileExt] || 'text';

      // Atualizar tipo imediatamente baseado na extensão
      setMediaType(detectedType);

      setFile(selectedFile);
      setContentTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension for title
      setIsUploading(true);
      setUploadProgress(10);

      try {
         // Upload file to backend
         setUploadProgress(30);
         const uploadResult = await contentsApi.uploadFile(chapterId, selectedFile);
         setUploadProgress(100);

         setUploadedFileUrl(uploadResult.url);

         // Usar tipo do backend se disponível, senão manter o detectado localmente
         if (uploadResult.type) {
            const backendType = uploadResult.type.toLowerCase() as 'text' | 'video' | 'audio';
            setMediaType(backendType);
         } else {
         }

         // Use extracted text from PDF/TXT for AI processing
         if (uploadResult.extracted_text) {
            setTextContent(uploadResult.extracted_text);
         }

         setStep('selection');
      } catch (error) {
         console.error("Erro no upload:", error);
         toast.error("Erro ao fazer upload do arquivo. Tente novamente.");
         setFile(null);
      } finally {
         setIsUploading(false);
         setUploadProgress(0);
      }
   };

   const startAIProcessing = async () => {
      setStep('ai_processing');
      setAiError(null);
      setProcessingProgress(10);
      setProcessingStage('Conectando ao Harven Creator...');

      try {
         // Verificar se IA esta disponivel
         setProcessingProgress(20);
         const status = await aiApi.getStatus();

         if (!status.enabled) {
            throw new Error('Servico de IA nao configurado. Configure OPENAI_API_KEY no backend.');
         }

         setProcessingProgress(30);
         setProcessingStage('Analisando conteudo...');

         // Preparar conteudo para a IA
         const contentForAI = textContent || file?.name || 'Conteudo educacional';

         setProcessingProgress(50);
         setProcessingStage('Gerando perguntas socraticas...');

         // Chamar API de geracao de perguntas
         const result = await aiApi.generateQuestions({
            chapter_content: contentForAI,
            chapter_title: contentTitle,
            difficulty: 'intermediario',
            max_questions: 3
         });

         setProcessingProgress(80);
         setProcessingStage('Processando resultado...');

         // Converter formato da IA para formato do banco
         let formattedQuestions: any[] = [];
         if (result.questions && result.questions.length > 0) {
            formattedQuestions = result.questions.map((q: any) => ({
               question_text: q.text || q.question_text || q.question,
               expected_answer: q.expected_depth || q.intention || q.expected_answer || '',
               difficulty: q.difficulty || 'medium',
               skill: q.skill,
               followup_prompts: q.followup_prompts
            }));
            setAiGeneratedQuestions(formattedQuestions);
         }

         setProcessingProgress(100);
         setProcessingStage('Concluido!');

         // Salvar conteudo com perguntas geradas (passar diretamente para evitar problema de setState assíncrono)
         setTimeout(async () => {
            await saveContentAndQuestions(true, formattedQuestions);
         }, 500);

      } catch (error: unknown) {
         console.error('Erro no processamento de IA:', error);
         const errorMsg = (error as Error).message || 'Erro ao processar com IA';

         // Se erro de configuração, mostrar e voltar
         if (errorMsg.includes('OPENAI_API_KEY') || errorMsg.includes('not configured')) {
            setAiError('IA não configurada. Configure OPENAI_API_KEY no backend/.env');
            setProcessingStage('IA não disponível');
            setTimeout(() => setStep('selection'), 3000);
            return;
         }

         // Para outros erros, continuar com perguntas default
         setProcessingStage('Usando perguntas padrão...');
         setProcessingProgress(90);

         // Limpar erro e salvar com perguntas default
         setAiError(null);
         setTimeout(async () => {
            await saveContentAndQuestions(true);
         }, 500);
      }
   };

   const addQuestionField = () => {
      setManualQuestions([...manualQuestions, { question_text: '', expected_answer: '', difficulty: 'medium' }]);
   };

   const updateQuestion = (index: number, field: string, value: string) => {
      const newQs = [...manualQuestions];
      newQs[index] = { ...newQs[index], [field]: value };
      setManualQuestions(newQs);
   };

   const saveContentAndQuestions = async (isAI: boolean = false, questionsFromAI: any[] = []) => {
      if (!chapterId) {
         toast.error("Erro: ID do capítulo não encontrado. Retornando ao portal.");
         navigate('/instructor');
         return;
      }

      try {
         // 1. Create Content with real file URL
         const newContent = await contentsApi.create(chapterId, {
            title: contentTitle,
            type: mediaType, // 'text', 'video', 'audio'
            text_content: textContent || null,
            content_url: uploadedFileUrl || null, // Real uploaded file URL
            order: 0
         });

         // 2. Create Questions (AI-generated or manual)
         if (newContent && newContent.id) {
            // Use questions passed directly (for AI) or from state (for manual)
            const aiQuestions = questionsFromAI.length > 0 ? questionsFromAI : aiGeneratedQuestions;

            const questionsToSave = isAI
               ? aiQuestions.length > 0
                  ? aiQuestions
                  : [
                     { question_text: "Qual o conceito principal abordado?", expected_answer: "O conceito de...", difficulty: "medium" },
                     { question_text: "Como isso se aplica na vida real?", expected_answer: "Exemplo pratico...", difficulty: "hard" }
                  ]
               : manualQuestions.filter(q => q.question_text.trim() !== '');

            if (questionsToSave.length > 0) {
               await questionsApi.create(newContent.id, questionsToSave);
            }

            // 3. Navigate to the content revision page for approval
            navigate(`/course/${courseId}/chapter/${chapterId}/content/${newContent.id}/revision`);
         }

      } catch (e) {
         console.error("Erro ao salvar conteúdo", e);
         toast.error("Erro ao salvar conteúdo. Verifique o console para mais detalhes.");
      }
   };

   return (
      <div className="flex flex-col flex-1 h-full bg-harven-bg">
         <div className="max-w-5xl mx-auto w-full p-8 flex flex-col gap-8 h-full">

            {/* Header da View */}
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <button
                     onClick={() => navigate(`/course/${courseId}`)}
                     className="p-2 -ml-2 rounded-lg hover:bg-white text-gray-400 hover:text-harven-dark transition-colors flex items-center gap-2"
                     title="Voltar"
                  >
                     <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                     <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
                  </button>
               </div>
               <h1 className="text-3xl font-display font-bold text-harven-dark">
                  Adicionar Conteúdo
               </h1>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Capítulo ID: {chapterId || 'N/A'}</p>
            </div>

            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
               <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">

                  {/* Media Type Selector */}
                  <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-harven-border shadow-sm">
                     <button
                        onClick={() => setMediaType('text')}
                        disabled={isUploading}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${mediaType === 'text' ? 'bg-harven-dark text-white' : 'text-gray-400 hover:text-harven-dark'} disabled:opacity-50`}
                     >
                        <span className="material-symbols-outlined text-[18px]">description</span> Documento
                     </button>
                     <button
                        onClick={() => setMediaType('video')}
                        disabled={isUploading}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${mediaType === 'video' ? 'bg-harven-dark text-white' : 'text-gray-400 hover:text-harven-dark'} disabled:opacity-50`}
                     >
                        <span className="material-symbols-outlined text-[18px]">movie</span> Vídeo
                     </button>
                     <button
                        onClick={() => setMediaType('audio')}
                        disabled={isUploading}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${mediaType === 'audio' ? 'bg-harven-dark text-white' : 'text-gray-400 hover:text-harven-dark'} disabled:opacity-50`}
                     >
                        <span className="material-symbols-outlined text-[18px]">headphones</span> Áudio
                     </button>
                  </div>

                  <div
                     className={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center bg-white transition-all relative ${isUploading ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-primary/5 cursor-pointer group'}`}
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={isUploading ? undefined : handleFileDrop}
                  >
                     {!isUploading && (
                        <input
                           type="file"
                           className="absolute inset-0 opacity-0 cursor-pointer"
                           onChange={handleFileInput}
                           accept={mediaType === 'text' ? '.pdf,.doc,.docx,.txt,.pptx' : mediaType === 'video' ? '.mp4,.mov,.avi,.webm' : '.mp3,.wav,.ogg,.m4a'}
                        />
                     )}

                     {isUploading ? (
                        <>
                           <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                              <span className="material-symbols-outlined text-4xl text-primary-dark animate-spin">sync</span>
                           </div>
                           <h3 className="text-xl font-bold text-harven-dark mb-2">Fazendo upload...</h3>
                           <p className="text-gray-500 mb-4">{file?.name}</p>
                           <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                 className="bg-primary h-full rounded-full transition-all duration-300"
                                 style={{ width: `${uploadProgress}%` }}
                              ></div>
                           </div>
                           <p className="text-xs text-gray-400 mt-2">{uploadProgress}%</p>
                        </>
                     ) : (
                        <>
                           <div className="size-20 bg-harven-bg rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-primary-dark">
                                 {mediaType === 'text' ? 'cloud_upload' : mediaType === 'video' ? 'video_file' : 'audio_file'}
                              </span>
                           </div>
                           <h3 className="text-xl font-bold text-harven-dark mb-2">
                              {mediaType === 'text' ? 'Arraste seu documento (PDF/DOC)' : mediaType === 'video' ? 'Arraste seu vídeo (MP4/MOV)' : 'Arraste seu áudio (MP3/WAV)'}
                           </h3>
                           <p className="text-gray-500 mb-8">Conteúdo base para a aula</p>
                           <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                              {mediaType === 'text' && <span>PDF • DOCX • PPTX • TXT</span>}
                              {mediaType === 'video' && <span>MP4 • MOV • AVI • WEBM</span>}
                              {mediaType === 'audio' && <span>MP3 • WAV • OGG • M4A</span>}
                           </div>
                        </>
                     )}
                  </div>

                  <div className="mt-8 flex gap-4">
                     <button
                        onClick={() => setStep('manual')}
                        disabled={isUploading}
                        className="text-gray-400 hover:text-harven-dark font-bold text-sm underline disabled:opacity-50"
                     >
                        Pular upload e criar manualmente
                     </button>
                  </div>
               </div>
            )}

            {/* STEP 2: SELECTION (METHOD) */}
            {step === 'selection' && (
               <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
                  <div className="bg-white p-4 rounded-xl border border-harven-border flex items-center gap-4 shadow-sm">
                     <div className="size-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">
                           {mediaType === 'text' ? 'description' : mediaType === 'video' ? 'movie' : 'headphones'}
                        </span>
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-bold text-harven-dark">{file?.name || contentTitle}</p>
                        <p className="text-xs text-gray-400">Pronto para processamento</p>
                     </div>
                     <button onClick={() => setStep('upload')} className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase">Trocar</button>
                  </div>

                  {/* Status do conteúdo extraído */}
                  {textContent ? (
                     <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center gap-3">
                        <div className="size-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                           <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-bold text-green-800">Texto extraído automaticamente</p>
                           <p className="text-xs text-green-600">{textContent.length.toLocaleString()} caracteres prontos para análise da IA</p>
                        </div>
                     </div>
                  ) : (
                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center gap-3">
                        <div className="size-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                           <span className="material-symbols-outlined">info</span>
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-bold text-amber-800">Sem texto extraído</p>
                           <p className="text-xs text-amber-600">Para vídeos/áudios, a IA gerará perguntas baseadas no título. Para PDFs, verifique se o arquivo contém texto selecionável.</p>
                        </div>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Card AI */}
                     <button
                        onClick={startAIProcessing}
                        className="bg-white border-2 border-primary/20 rounded-3xl p-8 flex flex-col gap-6 text-left hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all group relative overflow-hidden"
                     >
                        <div className="absolute top-6 right-6">
                           <span className="bg-primary text-harven-dark text-[10px] font-black px-2 py-1 rounded uppercase shadow-sm">BETA</span>
                        </div>
                        <div className="absolute top-0 right-0 size-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors"></div>
                        <div className="size-14 bg-primary rounded-2xl flex items-center justify-center text-harven-dark shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                           <span className="material-symbols-outlined text-3xl fill-1">auto_awesome</span>
                        </div>
                        <div>
                           <h3 className="text-2xl font-display font-bold text-harven-dark mb-2">Processamento Inteligente (IA)</h3>
                           <p className="text-gray-500 leading-relaxed">
                              A Harven AI analisará o conteúdo, extrairá conceitos-chave e gerará automaticamente perguntas socráticas.
                           </p>
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-sm font-bold text-primary-dark uppercase tracking-wide">
                           {textContent ? 'Gerar Perguntas' : 'Gerar Perguntas'} <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                     </button>

                     {/* Card Manual */}
                     <button
                        onClick={() => setStep('manual')}
                        className="bg-white border-2 border-harven-border rounded-3xl p-8 flex flex-col gap-6 text-left hover:border-gray-400 transition-all group"
                     >
                        <div className="size-14 bg-harven-bg rounded-2xl flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors">
                           <span className="material-symbols-outlined text-3xl">edit_document</span>
                        </div>
                        <div>
                           <h3 className="text-2xl font-display font-bold text-harven-dark mb-2">Processamento Manual</h3>
                           <p className="text-gray-500 leading-relaxed">
                              Você define a estrutura do capítulo e escreve as perguntas manualmente. Ideal para controle total.
                           </p>
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-sm font-bold text-gray-400 group-hover:text-harven-dark uppercase tracking-wide transition-colors">
                           Selecionar <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                     </button>
                  </div>
               </div>
            )}

            {/* STEP 3: MANUAL EDITOR */}
            {step === 'manual' && (
               <div className="flex-1 bg-white rounded-2xl border border-harven-border shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="p-6 border-b border-harven-border bg-harven-bg flex justify-between items-center">
                     <h3 className="font-bold text-harven-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">edit</span>
                        Editor Manual de Conteúdo
                     </h3>
                     <button onClick={() => setStep('selection')} className="text-gray-400 hover:text-harven-dark">Cancelar</button>
                  </div>
                  <div className="p-8 flex-1 overflow-y-auto space-y-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Título do Conteúdo</label>
                        <input
                           className="w-full bg-harven-bg border-none rounded-lg p-3 focus:ring-1 focus:ring-primary text-harven-dark"
                           placeholder="Ex: Introdução à Derivadas"
                           value={contentTitle}
                           onChange={e => setContentTitle(e.target.value)}
                        />
                     </div>

                     {mediaType === 'text' && (
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Texto do Conteúdo (Opcional se houver anexo)</label>
                           <textarea
                              className="w-full bg-harven-bg border-none rounded-lg p-3 focus:ring-1 focus:ring-primary min-h-[100px] text-harven-dark resize-none"
                              placeholder="Cole aqui o texto da aula..."
                              value={textContent}
                              onChange={e => setTextContent(e.target.value)}
                           />
                        </div>
                     )}

                     <div className="border-t border-harven-border pt-6">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-harven-dark">Perguntas Socráticas</h4>
                           <button onClick={addQuestionField} className="text-xs font-bold text-primary-dark hover:underline">+ Adicionar Outra</button>
                        </div>

                        <div className="space-y-6">
                           {manualQuestions.map((q, idx) => (
                              <div key={idx} className="bg-harven-bg p-4 rounded-xl border border-gray-200">
                                 <div className="space-y-3">
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase">Pergunta</label>
                                       <input
                                          className="w-full bg-white border-none rounded-lg p-2 text-sm text-harven-dark"
                                          placeholder="Ex: Como X se relaciona com Y?"
                                          value={q.question_text}
                                          onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase">Resposta Esperada</label>
                                       <textarea
                                          className="w-full bg-white border-none rounded-lg p-2 text-sm text-harven-dark h-20 resize-none"
                                          placeholder="Ex: O aluno deve responder que..."
                                          value={q.expected_answer}
                                          onChange={(e) => updateQuestion(idx, 'expected_answer', e.target.value)}
                                       />
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="p-6 border-t border-harven-border bg-gray-50 flex justify-end gap-3">
                     <button
                        onClick={() => saveContentAndQuestions(false)}
                        className="px-6 py-2 bg-primary hover:bg-primary-dark text-harven-dark rounded-lg text-sm font-bold shadow-lg shadow-primary/20"
                     >
                        Salvar Conteúdo
                     </button>
                  </div>
               </div>
            )}

            {/* STEP 4: AI PROCESSING LOADER */}
            {step === 'ai_processing' && (
               <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700">
                  <div className="w-full max-w-md text-center space-y-8">
                     <div className="relative size-32 mx-auto">
                        <div className="absolute inset-0 border-4 border-harven-bg rounded-full"></div>
                        <div
                           className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                           style={{ animationDuration: '1.5s' }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="material-symbols-outlined text-4xl text-harven-gold animate-pulse">psychology</span>
                        </div>
                     </div>

                     <div>
                        <h3 className="text-2xl font-display font-bold text-harven-dark mb-2">Analisando Conteúdo</h3>
                        <p className="text-primary-dark font-mono text-sm">{processingStage}</p>
                     </div>

                     <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                           className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                           style={{ width: `${processingProgress}%` }}
                        ></div>
                     </div>

                     <p className="text-xs text-gray-400">Salvando no banco de dados e gerando perguntas...</p>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
};

export default ContentCreation;
