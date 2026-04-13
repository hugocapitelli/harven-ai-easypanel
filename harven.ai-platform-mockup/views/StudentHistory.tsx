import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStatsApi } from '../services/api';
import { Card } from '../components/ui/Card';
import { safeJsonParse } from '../lib/utils';

interface Activity {
  id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_title?: string;
  metadata?: {
    course_id?: string;
    time_spent_minutes?: number;
    score?: number;
    total?: number;
    completed?: boolean;
    question?: string;
  };
  created_at: string;
  course_name?: string;
  course_image?: string;
}

interface ActivityDisplay {
  id: string;
  type: 'CHAT' | 'QUIZ' | 'CONTENT' | 'COURSE' | 'OTHER';
  date: string;
  course: string;
  topic: string;
  result: string;
  score: string | null;
  details: string;
  icon: string;
  color: string;
  passed: boolean;
}

const StudentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'CHAT' | 'QUIZ' | 'CONTENT'>('ALL');
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const doLoad = async () => {
      try {
        setLoading(true);
        const userId = safeJsonParse<{ id?: string }>('user-data', {}).id;

        if (!userId) {
          setLoading(false);
          return;
        }

        const response = await userStatsApi.getActivities(userId, 100, 0);
        if (controller.signal.aborted) return;
        const rawActivities: Activity[] = Array.isArray(response) ? response : (response.activities || []);

        const displayActivities: ActivityDisplay[] = rawActivities.map((act) => {
          const displayData = transformActivity(act);
          return displayData;
        });

        setActivities(displayActivities);
        setTotalCount(displayActivities.length);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar atividades:', error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    doLoad();
    return () => controller.abort();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const userId = safeJsonParse<{ id?: string }>('user-data', {}).id;

      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await userStatsApi.getActivities(userId, 100, 0);
      const rawActivities: Activity[] = Array.isArray(response) ? response : (response.activities || []);

      const displayActivities: ActivityDisplay[] = rawActivities.map((act) => {
        const displayData = transformActivity(act);
        return displayData;
      });

      setActivities(displayActivities);
      setTotalCount(displayActivities.length);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformActivity = (act: Activity): ActivityDisplay => {
    const action = act.action || '';
    const metadata = act.metadata || {};

    // Determine type
    let type: ActivityDisplay['type'] = 'OTHER';
    if (['chat_started', 'chat_completed', 'socratic_session'].includes(action)) {
      type = 'CHAT';
    } else if (['quiz_started', 'quiz_completed'].includes(action)) {
      type = 'QUIZ';
    } else if (['content_completed', 'content_viewed', 'chapter_viewed'].includes(action)) {
      type = 'CONTENT';
    } else if (['course_started', 'course_completed'].includes(action)) {
      type = 'COURSE';
    }

    // Determine icon
    const iconMap: Record<string, string> = {
      'chat_started': 'psychology',
      'chat_completed': 'psychology',
      'socratic_session': 'psychology',
      'quiz_started': 'quiz',
      'quiz_completed': 'quiz',
      'content_completed': 'task_alt',
      'content_viewed': 'visibility',
      'chapter_viewed': 'menu_book',
      'course_started': 'play_circle',
      'course_completed': 'school',
      'login': 'login',
      'certificate_earned': 'workspace_premium'
    };

    // Determine color
    const colorMap: Record<string, string> = {
      'chat_started': 'amber',
      'chat_completed': 'amber',
      'socratic_session': 'amber',
      'quiz_started': 'blue',
      'quiz_completed': 'blue',
      'content_completed': 'green',
      'content_viewed': 'gray',
      'chapter_viewed': 'gray',
      'course_started': 'purple',
      'course_completed': 'green',
      'login': 'gray',
      'certificate_earned': 'yellow'
    };

    // Format date
    const dateObj = new Date(act.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateStr = '';
    if (dateObj.toDateString() === today.toDateString()) {
      dateStr = `Hoje, ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      dateStr = `Ontem, ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    // Determine result
    let result = 'Registrado';
    let score: string | null = null;
    let passed = true;

    if (action === 'quiz_completed') {
      const quizScore = metadata.score;
      const total = metadata.total || 10;
      if (quizScore !== undefined) {
        passed = quizScore >= 7;
        result = passed ? 'Aprovado' : 'Reprovado';
        score = `${quizScore}/${total}`;
      }
    } else if (['chat_completed', 'socratic_session'].includes(action)) {
      const completed = metadata.completed !== false;
      result = completed ? 'Concluído' : 'Incompleto';
      passed = completed;
    } else if (action === 'content_completed') {
      result = 'Concluído';
      const timeSpent = metadata.time_spent_minutes;
      if (timeSpent) {
        score = `${timeSpent} min`;
      }
    } else if (action === 'course_completed') {
      result = 'Curso Concluído';
    } else if (action === 'course_started') {
      result = 'Iniciado';
    }

    // Generate details text
    let details = '';
    if (type === 'CHAT') {
      details = metadata.question
        ? `Debate socrático sobre: "${metadata.question.substring(0, 50)}${metadata.question.length > 50 ? '...' : ''}"`
        : 'Sessão de debate socrático realizada.';
    } else if (type === 'QUIZ') {
      details = score
        ? `Quiz completado com nota ${score}.`
        : 'Quiz iniciado.';
    } else if (type === 'CONTENT') {
      const timeSpent = metadata.time_spent_minutes;
      details = timeSpent
        ? `Conteúdo estudado por ${timeSpent} minutos.`
        : 'Conteúdo visualizado.';
    } else if (type === 'COURSE') {
      details = action === 'course_completed'
        ? 'Parabéns! Curso finalizado com sucesso.'
        : 'Início dos estudos neste curso.';
    }

    return {
      id: act.id,
      type,
      date: dateStr,
      course: act.course_name || act.target_title || 'Atividade',
      topic: act.target_title || getActionLabel(action),
      result,
      score,
      details,
      icon: iconMap[action] || 'history',
      color: colorMap[action] || 'gray',
      passed
    };
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'chat_started': 'Debate Socrático Iniciado',
      'chat_completed': 'Debate Socrático',
      'socratic_session': 'Sessão Socrática',
      'quiz_started': 'Quiz Iniciado',
      'quiz_completed': 'Quiz Completado',
      'content_completed': 'Conteúdo Concluído',
      'content_viewed': 'Conteúdo Visualizado',
      'chapter_viewed': 'Capítulo Visualizado',
      'course_started': 'Curso Iniciado',
      'course_completed': 'Curso Concluído',
      'login': 'Login',
      'certificate_earned': 'Certificado Obtido'
    };
    return labels[action] || action;
  };

  const filteredActivities = filter === 'ALL'
    ? activities
    : activities.filter(a => a.type === filter);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CHAT': return 'amber';
      case 'QUIZ': return 'blue';
      case 'CONTENT': return 'green';
      case 'COURSE': return 'purple';
      default: return 'gray';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CHAT': return 'Debate Socrático';
      case 'QUIZ': return 'Quiz';
      case 'CONTENT': return 'Conteúdo';
      case 'COURSE': return 'Curso';
      default: return 'Atividade';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando histórico...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-display font-bold text-harven-dark dark:text-white tracking-tight">Histórico de Atividades</h2>
          <p className="text-gray-500 mt-1">
            {totalCount > 0
              ? `${totalCount} atividades registradas`
              : 'Revise suas interações socráticas e avaliações passadas.'}
          </p>
        </div>

        <div className="bg-white dark:bg-harven-dark border border-harven-border dark:border-white/10 rounded-lg p-1 flex shadow-sm">
          {[
            { id: 'ALL', label: 'Tudo', icon: 'view_list' },
            { id: 'CHAT', label: 'Debates', icon: 'forum' },
            { id: 'QUIZ', label: 'Quizzes', icon: 'quiz' },
            { id: 'CONTENT', label: 'Conteúdos', icon: 'menu_book' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${filter === tab.id
                  ? 'bg-harven-dark dark:bg-primary text-primary dark:text-harven-dark shadow-sm'
                  : 'text-gray-400 hover:text-harven-dark dark:hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length > 0 ? (
        <div className="relative border-l-2 border-harven-border dark:border-white/10 ml-4 md:ml-6 space-y-8 pb-10">
          {filteredActivities.map((item) => (
            <div key={item.id} className="relative pl-8 md:pl-10 group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[9px] top-0 size-4 rounded-full border-2 border-white dark:border-harven-dark shadow-sm transition-transform group-hover:scale-125 ${item.type === 'CHAT' ? 'bg-amber-500' :
                    item.type === 'QUIZ' ? 'bg-blue-500' :
                      item.type === 'CONTENT' ? 'bg-green-500' :
                        item.type === 'COURSE' ? 'bg-purple-500' : 'bg-gray-400'
                  }`}
              ></div>

              <div className="bg-white dark:bg-harven-dark/50 rounded-xl border border-harven-border dark:border-white/10 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col md:flex-row gap-6">

                {/* Left Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${item.type === 'CHAT' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        item.type === 'QUIZ' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          item.type === 'CONTENT' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            item.type === 'COURSE' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{item.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-harven-dark dark:text-white group-hover:text-primary-dark transition-colors">
                    {item.topic}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1 mb-3">
                    {item.course}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.details}
                  </p>
                </div>

                {/* Right Status/Action */}
                <div className="flex md:flex-col items-center justify-between md:items-end gap-4 min-w-[140px] border-t md:border-t-0 md:border-l border-harven-bg dark:border-white/5 pt-4 md:pt-0 md:pl-6">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Resultado</span>
                    {item.score ? (
                      <span className="text-xl font-display font-bold text-harven-dark dark:text-white">{item.score}</span>
                    ) : (
                      <span className={`text-sm font-bold ${item.passed ? 'text-green-600' : 'text-orange-500'}`}>{item.result}</span>
                    )}
                  </div>

                  <button
                    className="px-4 py-2 rounded-lg border border-harven-border dark:border-white/10 hover:bg-harven-dark hover:text-primary hover:border-harven-dark dark:hover:bg-primary dark:hover:text-harven-dark transition-all text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"
                  >
                    Detalhes
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">history</span>
          <h3 className="text-lg font-bold text-harven-dark dark:text-white mb-2">Nenhuma atividade encontrada</h3>
          <p className="text-gray-500 text-sm">
            {filter === 'ALL'
              ? 'Comece a estudar para ver seu histórico de atividades aqui.'
              : `Nenhuma atividade do tipo "${getTypeLabel(filter)}" encontrada.`}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="mt-4 text-primary-dark font-bold text-sm hover:underline"
            >
              Ver todas as atividades
            </button>
          )}
        </Card>
      )}
    </div>
  );
};

export default StudentHistory;
