
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { chaptersApi, contentsApi } from '../services/api';

const ChapterDetail: React.FC = () => {
  const navigate = useNavigate();
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      if (!chapterId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const contentsData = await contentsApi.list(chapterId);
        if (controller.signal.aborted) return;
        setContents(contentsData || []);
        // Mock chapter data - em produção viria de uma API específica
        setChapter({
          id: chapterId,
          title: `Módulo ${chapterId}`,
          courseTitle: 'Curso',
          duration: '45 minutos',
          level: 'Intermediário'
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar capítulo:', error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => controller.abort();
  }, [chapterId]);

  const completedCount = contents.filter((c: any) => c.completed_at || c.completed).length;
  const progressPercent = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'play_circle';
      case 'AUDIO': return 'headphones';
      default: return 'article';
    }
  };

  const getContentColor = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'bg-blue-50 text-blue-600 group-hover:bg-blue-100';
      case 'AUDIO': return 'bg-purple-50 text-purple-600 group-hover:bg-purple-100';
      default: return 'bg-primary/10 text-primary-dark group-hover:bg-primary/20';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-96" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <span className="text-harven-gold">{chapter?.courseTitle || 'Curso'}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-harven-dark">{chapter?.title || 'Capítulo'}</span>
          </nav>
          <h1 className="text-5xl font-display font-bold text-harven-dark leading-tight tracking-tight">
            {chapter?.title || 'Visão Geral do Capítulo'}
          </h1>
          <div className="flex gap-6 mt-2">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-harven-border">
              <span className="material-symbols-outlined text-harven-gold text-[18px]">schedule</span>
              <span className="text-xs font-bold text-harven-dark uppercase tracking-tight">{chapter?.duration || '30 minutos'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-harven-border">
              <span className="material-symbols-outlined text-harven-gold text-[18px]">psychology</span>
              <span className="text-xs font-bold text-harven-dark uppercase tracking-tight">Nível {chapter?.level || 'Básico'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-harven-border">
              <span className="material-symbols-outlined text-harven-gold text-[18px]">article</span>
              <span className="text-xs font-bold text-harven-dark uppercase tracking-tight">{contents.length} {contents.length === 1 ? 'Conteúdo' : 'Conteúdos'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-sm">
              <h3 className="text-xl font-display font-bold text-harven-dark mb-6">Objetivos de Aprendizagem</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: 'target', text: 'Definir hipóteses de teste claras e mensuráveis.' },
                  { icon: 'rule', text: 'Calcular o tamanho da amostra para significância estatística.' },
                  { icon: 'science', text: 'Diferenciar testes A/B de testes multivariados.' },
                  { icon: 'monitoring', text: 'Interpretar resultados e evitar falsos positivos.' },
                ].map((obj, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="size-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary-dark">
                      <span className="material-symbols-outlined text-[16px] fill-1">{obj.icon}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-snug">{obj.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de Conteúdos do Capítulo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-harven-dark">Conteúdos</h3>
                {contents.length > 0 && (
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {completedCount}/{contents.length} concluídos
                  </span>
                )}
              </div>

              {contents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-harven-border p-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">inbox</span>
                  <p className="text-gray-500 font-medium">Nenhum conteúdo disponível neste capítulo.</p>
                  <p className="text-xs text-gray-400 mt-1">Conteúdos serão adicionados pelo instrutor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contents.map((content: any, index: number) => {
                    const isCompleted = !!(content.completed_at || content.completed);
                    return (
                      <button
                        key={content.id}
                        onClick={() => navigate(`/course/${courseId}/chapter/${chapterId}/content/${content.id}`)}
                        className="w-full bg-white border border-harven-border rounded-xl flex items-center gap-4 hover:border-primary hover:shadow-md transition-all group text-left overflow-hidden"
                      >
                        {/* Step indicator */}
                        <div className={`w-1 self-stretch flex-shrink-0 ${isCompleted ? 'bg-green-500' : index === completedCount ? 'bg-primary' : 'bg-transparent'}`} />

                        <div className="flex items-center gap-4 py-4 pr-4 flex-1">
                          {/* Step number */}
                          <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            isCompleted
                              ? 'bg-green-100 text-green-600'
                              : index === completedCount
                                ? 'bg-primary text-harven-dark'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <span className="material-symbols-outlined text-[16px] fill-1">check</span>
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Type icon */}
                          <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${getContentColor(content.type)}`}>
                            <span className="material-symbols-outlined text-[20px]">
                              {getContentIcon(content.type)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-harven-dark truncate">{content.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{content.type}</span>
                              {isCompleted && (
                                <Badge variant="success" className="text-[9px] py-0 px-1.5">Concluído</Badge>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary-dark transition-colors flex-shrink-0">
                            {index === completedCount && !isCompleted ? 'play_arrow' : 'arrow_forward'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-display font-bold text-harven-dark">Pré-requisitos</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-harven-bg/50 border border-harven-border p-4 rounded-xl flex items-center gap-4 opacity-70">
                   <span className="material-symbols-outlined text-green-600 fill-1">check_circle</span>
                   <div>
                     <p className="text-xs font-bold text-harven-dark">Capítulo anterior</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Concluído</p>
                   </div>
                </div>
                <div className="flex-1 border border-harven-border p-4 rounded-xl flex items-center gap-4 bg-white">
                   <span className="material-symbols-outlined text-harven-gold">warning</span>
                   <div>
                     <p className="text-xs font-bold text-harven-dark">Conhecimentos básicos</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Recomendado</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-harven-dark rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 size-32 bg-primary/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Seu Progresso</h4>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-5xl font-display font-bold">{progressPercent}%</span>
                <span className="text-sm text-gray-400 font-bold mb-2">DO CAPÍTULO</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-8">
                <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(208,255,0,0.5)] transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <button
                onClick={() => {
                  // Se há conteúdos, navega para o primeiro
                  if (contents.length > 0) {
                    const firstContent = contents[0];
                    navigate(`/course/${courseId}/chapter/${chapterId}/content/${firstContent.id}`);
                  }
                }}
                className="w-full bg-primary hover:bg-primary-dark transition-all text-harven-dark py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined fill-1">play_arrow</span>
                {contents.length > 0 ? 'INICIAR ESTUDO' : 'RETOMAR CAPÍTULO'}
              </button>
            </div>

            <div className="bg-white border border-harven-border rounded-2xl p-6 flex flex-col gap-4">
               <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-harven-bg flex items-center justify-center">
                    <span className="material-symbols-outlined text-harven-gold">psychology</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-harven-dark">Tutor Socrático</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Pronto para interagir</p>
                  </div>
               </div>
               <p className="text-xs text-gray-500 leading-relaxed italic">
                 "Neste capítulo, eu ajudarei você a questionar a validade dos seus dados antes de tomar decisões precipitadas."
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterDetail;
