
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { questionsApi, contentsApi, aiApi } from '../services/api';

const ContentRevision: React.FC = () => {
  const navigate = useNavigate();
  const { courseId, chapterId, contentId } = useParams<{ courseId: string; chapterId: string; contentId: string }>();
  const [showFileModal, setShowFileModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Toggle between file view and text view
  const [viewMode, setViewMode] = useState<'file' | 'text'>('file');

  // Refs para manipulação do input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileType, setPendingFileType] = useState<'PDF' | 'VIDEO' | 'AUDIO'>('PDF');

  // Questions loaded from database
  const [questions, setQuestions] = useState<any[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<any[]>([]);

  // Content loaded from database
  const [contentData, setContentData] = useState<any>(null);

  // State derived from loaded content
  const [contentTitle, setContentTitle] = useState('Conteúdo');
  const [contentType, setContentType] = useState('TEXT');

  const [files, setFiles] = useState<{name: string, type: string}[]>([]);

  // Função para formatar texto extraído de forma bonita
  const formatExtractedText = (rawText: string): string => {
    if (!rawText) return '';
    if (rawText.includes('<h1>') || rawText.includes('<h2>') || rawText.includes('<p>')) {
      return rawText;
    }

    const lines = rawText.split('\n');
    let formattedHtml = '';
    let inList = false;
    let currentParagraph = '';

    const flushParagraph = () => {
      if (currentParagraph.trim()) {
        formattedHtml += `<p class="mb-3 text-gray-600 leading-relaxed text-sm">${currentParagraph.trim()}</p>`;
        currentParagraph = '';
      }
    };

    const closeList = () => {
      if (inList) {
        formattedHtml += '</ul>';
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';

      if (!line) {
        closeList();
        flushParagraph();
        continue;
      }

      const isAllCaps = line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line);
      const isShortTitle = line.length < 60 && !line.endsWith('.') && !line.endsWith(',');
      const isNumberedTitle = /^(\d+\.?\d*\.?\s+|Capítulo\s+\d+|CAPÍTULO\s+\d+)/i.test(line);

      if (isAllCaps && isShortTitle) {
        closeList();
        flushParagraph();
        formattedHtml += `<h3 class="text-base font-bold text-harven-dark mt-6 mb-2 pb-1 border-b border-gray-200">${line.charAt(0) + line.slice(1).toLowerCase()}</h3>`;
        continue;
      }

      if (isNumberedTitle) {
        closeList();
        flushParagraph();
        formattedHtml += `<h4 class="text-sm font-semibold text-harven-dark mt-4 mb-2 text-primary-dark">${line}</h4>`;
        continue;
      }

      const isListItem = /^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
      if (isListItem) {
        flushParagraph();
        if (!inList) {
          formattedHtml += '<ul class="list-none space-y-1.5 my-3 pl-3">';
          inList = true;
        }
        const itemText = line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
        formattedHtml += `<li class="flex items-start gap-2 text-sm"><span class="text-primary text-xs mt-1">●</span><span class="text-gray-600">${itemText}</span></li>`;
        continue;
      }

      closeList();
      if (currentParagraph) {
        currentParagraph += ' ' + line;
      } else {
        currentParagraph = line;
      }

      if (line.endsWith('.') && nextLine && /^[A-Z]/.test(nextLine)) {
        flushParagraph();
      }
    }

    closeList();
    flushParagraph();

    if (!formattedHtml.trim()) {
      return `<div class="space-y-3">${rawText.split('\n\n').map(p =>
        `<p class="text-gray-600 leading-relaxed text-sm">${p.trim()}</p>`
      ).join('')}</div>`;
    }

    return formattedHtml;
  };

  // Load content and questions from database
  useEffect(() => {
      const controller = new AbortController();
      const loadData = async () => {
          if (!contentId) {
              setIsLoading(false);
              return;
          }

          try {
              // Load content
              const content = await contentsApi.get(contentId);
              if (controller.signal.aborted) return;
              setContentData(content);
              setContentTitle(content.title || 'Conteúdo');
              setContentType(content.type?.toUpperCase() || 'TEXT');

              if (content.content_url) {
                  // Detectar tipo também pela extensão da URL
                  const urlExt = content.content_url.split('.').pop()?.toLowerCase() || '';
                  const extTypeMap: Record<string, string> = {
                     'mp4': 'VIDEO', 'mov': 'VIDEO', 'avi': 'VIDEO', 'webm': 'VIDEO', 'mkv': 'VIDEO',
                     'mp3': 'AUDIO', 'wav': 'AUDIO', 'ogg': 'AUDIO', 'm4a': 'AUDIO', 'aac': 'AUDIO',
                     'pdf': 'PDF', 'doc': 'TEXT', 'docx': 'TEXT', 'txt': 'TEXT', 'pptx': 'TEXT'
                  };
                  const detectedType = content.type?.toUpperCase() || extTypeMap[urlExt] || 'PDF';
                  setFiles([{ name: content.title || 'Arquivo', type: detectedType }]);
              }

              // Load questions
              const loadedQuestions = content.questions || await questionsApi.list(contentId);
              if (controller.signal.aborted) return;
              const formattedQuestions = (loadedQuestions || []).map((q: any, idx: number) => ({
                  id: q.id || `temp_${idx}`,
                  text: q.question_text || q.text || '',
                  answer: q.expected_answer || q.answer || '',
                  difficulty: q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'hard' ? 'Difícil' : 'Médio',
                  type: q.skill || 'Conceitual',
                  originalDifficulty: q.difficulty || 'medium'
              }));
              setQuestions(formattedQuestions);
              setOriginalQuestions(JSON.parse(JSON.stringify(formattedQuestions)));
          } catch (error) {
              if (controller.signal.aborted) return;
              console.error('Erro ao carregar dados:', error);
          } finally {
              if (!controller.signal.aborted) {
                  setIsLoading(false);
              }
          }
      };

      loadData();
      return () => controller.abort();
  }, [contentId]);

  
  // Track changes
  useEffect(() => {
      const questionsChanged = JSON.stringify(questions) !== JSON.stringify(originalQuestions);
      setHasChanges(questionsChanged);
  }, [questions, originalQuestions]);

  const handleAddFileClick = () => {
      setShowFileModal(true);
  };

  const triggerFileUpload = (type: 'PDF' | 'VIDEO' | 'AUDIO') => {
      setPendingFileType(type);
      setTimeout(() => {
          if (fileInputRef.current) {
              fileInputRef.current.click();
          }
      }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFiles([...files, { name: file.name, type: pendingFileType }]);
          setShowFileModal(false);
          e.target.value = '';
      }
  };

  const handleRemoveFile = (index: number) => {
      if (index === 0) return;
      setFiles(files.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
      const newId = `new_${Date.now()}`;
      setQuestions([...questions, {
          id: newId,
          text: '',
          answer: '',
          difficulty: 'Médio',
          type: 'Conceitual',
          originalDifficulty: 'medium',
          isNew: true
      }]);
  };

  const updateQuestion = (id: string | number, field: string, value: string) => {
      setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const deleteQuestion = async (id: string | number) => {
      // If it's an existing question (has UUID), delete from backend
      if (typeof id === 'string' && !id.startsWith('new_') && !id.startsWith('temp_')) {
          try {
              await questionsApi.delete(id);
          } catch (error) {
              console.error('Erro ao deletar pergunta:', error);
          }
      }
      setQuestions(questions.filter(q => q.id !== id));
  };

  const handleReprocessAI = async () => {
      if (!contentData?.text_content) {
          toast.warning('Não há conteúdo de texto para reprocessar. Faça upload de um documento com texto.');
          return;
      }

      setIsReprocessing(true);
      try {
          // Check if AI is available
          const status = await aiApi.getStatus();
          if (!status.enabled) {
              toast.error('Serviço de IA não configurado. Configure OPENAI_API_KEY no backend.');
              return;
          }

          // Generate new questions
          const result = await aiApi.generateQuestions({
              chapter_content: contentData.text_content,
              chapter_title: contentTitle,
              difficulty: 'intermediario',
              max_questions: 3
          });

          if (result.questions && result.questions.length > 0) {
              const newQuestions = result.questions.map((q: any, idx: number) => ({
                  id: `new_${Date.now()}_${idx}`,
                  text: q.text || q.question_text || '',
                  answer: q.expected_depth || q.intention || '',
                  difficulty: q.difficulty === 'iniciante' ? 'Fácil' : q.difficulty === 'avancado' ? 'Difícil' : 'Médio',
                  type: q.skill || 'Conceitual',
                  originalDifficulty: q.difficulty || 'medium',
                  isNew: true
              }));
              setQuestions(newQuestions);
              toast.success(`${newQuestions.length} novas perguntas geradas!`);
          } else {
              toast.warning('Nenhuma pergunta foi gerada. Tente novamente.');
          }
      } catch (error: unknown) {
          console.error('Erro ao reprocessar:', error);
          toast.error('Erro ao reprocessar: ' + ((error as Error).message || 'Erro desconhecido'));
      } finally {
          setIsReprocessing(false);
      }
  };

  const handleSaveQuestions = async () => {
      if (!contentId) return;

      setIsSaving(true);
      try {
          // Convert questions to backend format
          const questionsToSave = questions.map(q => ({
              question_text: q.text,
              expected_answer: q.answer,
              difficulty: q.difficulty === 'Fácil' ? 'easy' : q.difficulty === 'Difícil' ? 'hard' : 'medium'
          }));

          // Use batch update which deletes existing and creates new ones
          await questionsApi.updateBatch(contentId, questionsToSave);

          setOriginalQuestions(JSON.parse(JSON.stringify(questions)));
          setHasChanges(false);
          return true;
      } catch (error) {
          console.error('Erro ao salvar perguntas:', error);
          toast.error('Erro ao salvar perguntas. Tente novamente.');
          return false;
      } finally {
          setIsSaving(false);
      }
  };

  const handleApprove = async () => {
      // Save changes if any
      if (hasChanges) {
          const saved = await handleSaveQuestions();
          if (!saved) return;
      }

      // Navigate to ChapterReader
      navigate(`/course/${courseId}/chapter/${chapterId}/content/${contentId}`);
  };

  const handleDiscard = () => {
      if (hasChanges) {
          setShowDiscardModal(true);
      } else {
          confirmDiscard();
      }
  };

  const confirmDiscard = async () => {
      // Delete the content and questions from database
      if (contentId) {
          try {
              await contentsApi.delete(contentId);
          } catch (error) {
              console.error('Erro ao deletar conteúdo:', error);
          }
      }
      navigate(`/course/${courseId}`);
  };

  const getAcceptAttribute = () => {
      switch (pendingFileType) {
          case 'PDF': return '.pdf,.doc,.docx,.txt';
          case 'VIDEO': return 'video/*,.mp4,.mov,.avi';
          case 'AUDIO': return 'audio/*,.mp3,.wav';
          default: return '*/*';
      }
  };

  const cycleDifficulty = (id: string | number) => {
      const current = questions.find(q => q.id === id)?.difficulty;
      const next = current === 'Fácil' ? 'Médio' : current === 'Médio' ? 'Difícil' : 'Fácil';
      updateQuestion(id, 'difficulty', next);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-harven-border sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex justify-between items-start gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Botão Voltar */}
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="p-2 -ml-2 mr-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-harven-dark transition-colors"
                title="Voltar"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h2 className="text-2xl font-display font-bold text-harven-dark tracking-tight">
                {contentTitle || 'Revisão de Conteúdo'}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${hasChanges ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                {hasChanges ? 'Alterado' : 'Salvo'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">menu_book</span> 1 Capítulo</div>
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">quiz</span> {questions.length} Perguntas</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
                onClick={handleDiscard}
                className="px-4 py-2 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg text-xs font-bold text-red-600 transition-colors"
            >
                DESCARTAR
            </button>
            <button
                onClick={handleReprocessAI}
                disabled={isReprocessing || !contentData?.text_content}
                className="px-4 py-2 border border-harven-border hover:bg-gray-50 rounded-lg text-xs font-bold text-harven-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isReprocessing && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
                REPROCESSAR IA
            </button>
            <button
                onClick={handleApprove}
                disabled={isSaving || questions.length === 0}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-harven-dark font-bold rounded-lg text-sm shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                ) : (
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                )}
                {isSaving ? 'SALVANDO...' : 'APROVAR E PUBLICAR'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Source Material */}
          <div className="bg-white rounded-2xl border border-harven-border flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-3 bg-harven-bg border-b border-harven-border flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Fontes de Conteúdo</span>
              <button
                onClick={handleAddFileClick}
                className="flex items-center gap-1 text-[10px] font-bold text-primary-dark hover:underline uppercase"
              >
                  <span className="material-symbols-outlined text-[14px]">add</span> Adicionar Arquivo
              </button>
            </div>

            {/* File List */}
            <div className="p-4 bg-gray-50 border-b border-harven-border flex gap-2 overflow-x-auto no-scrollbar">
                {files.length === 0 && (
                    <div className="text-xs text-gray-400 italic">Nenhum arquivo anexado</div>
                )}
                {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-harven-border shadow-sm flex-shrink-0">
                        <span className="material-symbols-outlined text-gray-400 text-[18px]">
                            {f.type === 'VIDEO' ? 'movie' : f.type === 'AUDIO' ? 'headphones' : 'picture_as_pdf'}
                        </span>
                        <span className="text-xs font-bold text-harven-dark truncate max-w-[200px]">{f.name}</span>
                        {i > 0 && (
                            <button
                                onClick={() => handleRemoveFile(i)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Toggle entre visualização de arquivo e texto */}
            {contentData?.content_url && contentData?.text_content && (
               <div className="px-4 py-2 bg-gray-50 border-b border-harven-border flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Visualizar:</span>
                  <button
                     onClick={() => setViewMode('file')}
                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'file' ? 'bg-primary text-harven-dark' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'}`}
                  >
                     Arquivo Original
                  </button>
                  <button
                     onClick={() => setViewMode('text')}
                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'text' ? 'bg-primary text-harven-dark' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'}`}
                  >
                     Texto Extraído
                  </button>
               </div>
            )}

            <div className="flex-1 overflow-hidden bg-white">
               {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                     <span className="material-symbols-outlined animate-spin text-gray-400 mr-2">sync</span>
                     <span className="text-gray-400">Carregando conteúdo...</span>
                  </div>
               ) : viewMode === 'file' && contentData?.content_url ? (
                  <div className="h-full w-full">
                     {contentType === 'VIDEO' || contentData?.content_url?.match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <video
                           src={contentData.content_url}
                           controls
                           className="w-full h-full object-contain bg-black"
                        />
                     ) : contentType === 'AUDIO' || contentData?.content_url?.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                        <div className="flex flex-col items-center justify-center h-full">
                           <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">headphones</span>
                           <audio src={contentData.content_url} controls className="w-full max-w-md" />
                        </div>
                     ) : (
                        <iframe
                           src={`${contentData.content_url}#toolbar=1&navpanes=0`}
                           className="w-full h-full border-0"
                           title="Visualização do documento"
                        />
                     )}
                  </div>
               ) : contentData?.text_content ? (
                  <div className="h-full overflow-y-auto custom-scrollbar">
                     {/* Header */}
                     <div className="sticky top-0 bg-gradient-to-r from-harven-bg to-white px-6 py-3 border-b border-harven-border flex items-center gap-3 z-10">
                        <span className="material-symbols-outlined text-harven-dark text-[20px]">article</span>
                        <span className="text-xs font-bold text-harven-dark uppercase tracking-wide">Texto Extraído</span>
                     </div>
                     {/* Conteúdo formatado */}
                     <div
                        className="p-6"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatExtractedText(contentData.text_content)) }}
                     />
                  </div>
               ) : contentData?.content_url ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                     <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                        {contentType === 'VIDEO' ? 'movie' : contentType === 'AUDIO' ? 'headphones' : 'picture_as_pdf'}
                     </span>
                     <p className="text-gray-500 font-medium mb-2">Arquivo anexado</p>
                     <p className="text-xs text-gray-400 mb-4">{contentTitle || 'Documento'}</p>
                     <a
                        href={contentData.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary/20 text-primary-dark rounded-lg text-sm font-bold hover:bg-primary/30 transition-colors"
                     >
                        Abrir arquivo em nova aba
                     </a>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
                     <span className="material-symbols-outlined text-6xl mb-4">description</span>
                     <p>Nenhum conteúdo disponível</p>
                     <p className="text-xs mt-2">Faça upload de um arquivo para visualizar</p>
                  </div>
               )}
            </div>
          </div>

          {/* Questions Editor */}
          <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4">
             <div className="flex justify-between items-end px-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Perguntas Socráticas</span>
                <span className="bg-harven-gold/10 text-harven-gold text-[10px] font-bold px-2 py-1 rounded uppercase">Editor Ativo</span>
             </div>

             <div className="space-y-4">
               {/* Chapter Block */}
               <div className="bg-white rounded-xl border-l-4 border-primary shadow-sm overflow-hidden">
                  <div className="p-5 flex justify-between items-center bg-harven-bg/10 border-b border-harven-border">
                    <div>
                       <h4 className="font-bold text-harven-dark">{contentTitle}</h4>
                       <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{questions.length} perguntas</p>
                    </div>
                  </div>

                  <div className="p-5 bg-harven-bg/5 flex flex-col gap-4">
                     {isLoading && (
                        <div className="flex items-center justify-center py-8">
                           <span className="material-symbols-outlined animate-spin text-gray-400 mr-2">sync</span>
                           <span className="text-sm text-gray-400">Carregando perguntas...</span>
                        </div>
                     )}
                     {!isLoading && questions.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                           <span className="material-symbols-outlined text-4xl mb-2">quiz</span>
                           <p className="text-sm">Nenhuma pergunta encontrada</p>
                           <p className="text-xs">Clique em "Adicionar Pergunta" ou "Reprocessar IA"</p>
                        </div>
                     )}
                     {!isLoading && questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl border border-harven-border shadow-sm relative group/card hover:border-primary/30 hover:shadow-md transition-all">
                            {/* Header da Pergunta */}
                            <div className="flex justify-between items-center mb-5 pb-4 border-b border-harven-border">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-harven-dark flex items-center justify-center text-white text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <span className="text-xs font-bold text-harven-dark uppercase tracking-wide">Pergunta</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => cycleDifficulty(q.id)}
                                        className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase cursor-pointer hover:opacity-80 transition-opacity ${
                                            q.difficulty === 'Fácil' ? 'bg-green-100 text-green-700 border border-green-200' :
                                            q.difficulty === 'Difícil' ? 'bg-red-100 text-red-700 border border-red-200' :
                                            'bg-amber-100 text-amber-700 border border-amber-200'
                                        }`}
                                        title="Clique para alterar dificuldade"
                                    >
                                        {q.difficulty}
                                    </button>
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-blue-200">{q.type}</span>
                                </div>
                            </div>

                            {/* Área da Pergunta */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Texto da Pergunta
                                </label>
                                <textarea
                                    className="w-full text-base font-semibold text-harven-dark leading-relaxed border border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-4 resize-none bg-gray-50/50 transition-all"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                    placeholder="Digite a pergunta aqui..."
                                    rows={3}
                                />
                            </div>

                            {/* Área da Resposta Esperada */}
                            <div className="p-5 bg-gradient-to-br from-harven-gold/5 to-harven-gold/10 rounded-xl border border-harven-gold/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-harven-gold text-[18px]">lightbulb</span>
                                    <p className="text-xs font-bold text-harven-gold uppercase tracking-wide">Resposta Esperada / Intenção Pedagógica</p>
                                </div>
                                <textarea
                                    className="w-full text-sm text-gray-600 leading-relaxed border border-harven-gold/20 hover:border-harven-gold/40 focus:border-harven-gold focus:ring-2 focus:ring-harven-gold/20 rounded-lg p-4 resize-none bg-white/80 transition-all"
                                    value={q.answer}
                                    onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                                    placeholder="Descreva a resposta esperada ou a intenção pedagógica desta pergunta..."
                                    rows={4}
                                />
                            </div>

                            {/* Ações */}
                            <div className="mt-5 pt-4 border-t border-harven-border flex justify-between items-center">
                                <span className="text-[10px] text-gray-400">
                                    {q.isNew ? 'Nova pergunta (não salva)' : 'Pergunta salva'}
                                </span>
                                <button
                                    onClick={() => deleteQuestion(q.id)}
                                    className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                                </button>
                            </div>
                        </div>
                     ))}

                     <button
                        onClick={handleAddQuestion}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold text-xs uppercase hover:border-primary hover:text-primary-dark hover:bg-white transition-all flex items-center justify-center gap-2"
                     >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Adicionar Pergunta
                     </button>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Input de arquivo oculto */}
      <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={getAcceptAttribute()}
          onChange={handleFileChange}
      />

      {/* Modal de Seleção de Tipo de Arquivo */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-harven-border bg-harven-bg flex justify-between items-center">
               <h3 className="text-lg font-display font-bold text-harven-dark">Adicionar Arquivo</h3>
               <button onClick={() => setShowFileModal(false)} className="text-gray-400 hover:text-harven-dark">
                 <span className="material-symbols-outlined">close</span>
               </button>
             </div>

             <div className="p-6 grid grid-cols-1 gap-3">
                <button
                    onClick={() => triggerFileUpload('PDF')}
                    className="flex items-center gap-4 p-4 border border-harven-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left"
                >
                    <div className="size-10 rounded-full bg-harven-bg flex items-center justify-center group-hover:bg-primary group-hover:text-harven-dark transition-colors">
                        <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-harven-dark">Texto / Documento</span>
                        <span className="text-xs text-gray-500">PDF, DOCX, TXT</span>
                    </div>
                </button>

                <button
                    onClick={() => triggerFileUpload('VIDEO')}
                    className="flex items-center gap-4 p-4 border border-harven-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left"
                >
                    <div className="size-10 rounded-full bg-harven-bg flex items-center justify-center group-hover:bg-primary group-hover:text-harven-dark transition-colors">
                        <span className="material-symbols-outlined">movie</span>
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-harven-dark">Vídeo</span>
                        <span className="text-xs text-gray-500">MP4, MOV, AVI</span>
                    </div>
                </button>

                <button
                    onClick={() => triggerFileUpload('AUDIO')}
                    className="flex items-center gap-4 p-4 border border-harven-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left"
                >
                    <div className="size-10 rounded-full bg-harven-bg flex items-center justify-center group-hover:bg-primary group-hover:text-harven-dark transition-colors">
                        <span className="material-symbols-outlined">headphones</span>
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-harven-dark">Áudio</span>
                        <span className="text-xs text-gray-500">MP3, WAV</span>
                    </div>
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Modal de Confirmação de Descarte */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-harven-border bg-red-50 flex justify-between items-center">
               <h3 className="text-lg font-display font-bold text-red-700 flex items-center gap-2">
                 <span className="material-symbols-outlined">warning</span>
                 Descartar Conteúdo?
               </h3>
               <button onClick={() => setShowDiscardModal(false)} className="text-gray-400 hover:text-harven-dark">
                 <span className="material-symbols-outlined">close</span>
               </button>
             </div>

             <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                    Você tem alterações não salvas. Ao descartar, o conteúdo e todas as perguntas serão <strong>permanentemente excluídos</strong>.
                </p>
                <p className="text-xs text-gray-400">Esta ação não pode ser desfeita.</p>
             </div>

             <div className="p-6 border-t border-harven-border bg-gray-50 flex justify-end gap-3">
                <button
                    onClick={() => setShowDiscardModal(false)}
                    className="px-4 py-2 border border-harven-border hover:bg-white rounded-lg text-sm font-bold text-gray-600"
                >
                    Cancelar
                </button>
                <button
                    onClick={confirmDiscard}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
                >
                    Sim, Descartar
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ContentRevision;
