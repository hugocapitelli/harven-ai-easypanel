
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import ShareCard from '../components/ShareCard';
import AchievementCard, { Achievement as FullAchievement } from '../components/AchievementCard';
import { usersApi, userStatsApi } from '../services/api';

interface UserData {
   id: string;
   name: string;
   email?: string;
   role?: string;
   ra?: string;
   title?: string;
   avatar_url?: string;
   bio?: string;
   created_at?: string;
}

interface UserStats {
   courses_completed: number;
   courses_in_progress: number;
   hours_studied: number;
   average_score: number;
   certificates: number;
   total_activities: number;
   streak_days: number;
   last_activity: string | null;
}

interface Activity {
   id: string;
   action: string;
   target_type?: string;
   target_id?: string;
   target_title?: string;
   metadata?: Record<string, any>;
   created_at: string;
}

interface Certificate {
   id: string;
   course_id: string;
   course_title: string;
   user_name: string;
   issued_at: string;
   certificate_number: string;
}

interface AchievementsSummary {
   total: number;
   unlocked: number;
   locked: number;
   total_points: number;
   completion_percent: number;
}

const UserProfile: React.FC = () => {
   const navigate = useNavigate();
   const [user, setUser] = useState<UserData | null>(null);
   const [stats, setStats] = useState<UserStats | null>(null);
   const [activities, setActivities] = useState<Activity[]>([]);
   const [certificates, setCertificates] = useState<Certificate[]>([]);
   const [achievements, setAchievements] = useState<FullAchievement[]>([]);
   const [achievementsSummary, setAchievementsSummary] = useState<AchievementsSummary | null>(null);
   const [loading, setLoading] = useState(true);
   const [showShareCard, setShowShareCard] = useState(false);

   useEffect(() => {
      const controller = new AbortController();
      const doLoad = async () => {
         try {
            const storedUser = localStorage.getItem('user-data');
            if (storedUser) {
               const userData = JSON.parse(storedUser);
               try {
                  const freshUser = await usersApi.get(userData.id);
                  if (controller.signal.aborted) return;
                  setUser(freshUser);
                  await Promise.all([
                     loadStats(userData.id),
                     loadActivities(userData.id),
                     loadCertificates(userData.id),
                     loadAchievements(userData.id)
                  ]);
               } catch {
                  if (controller.signal.aborted) return;
                  setUser(userData);
               }
            }
         } catch (error) {
            if (controller.signal.aborted) return;
            console.error("Error loading user:", error);
         } finally {
            if (!controller.signal.aborted) {
               setLoading(false);
            }
         }
      };
      doLoad();
      return () => controller.abort();
   }, []);

   const loadUser = async () => {
      try {
         const storedUser = localStorage.getItem('user-data');
         if (storedUser) {
            const userData = JSON.parse(storedUser);
            try {
               const freshUser = await usersApi.get(userData.id);
               setUser(freshUser);
               await Promise.all([
                  loadStats(userData.id),
                  loadActivities(userData.id),
                  loadCertificates(userData.id),
                  loadAchievements(userData.id)
               ]);
            } catch {
               setUser(userData);
            }
         }
      } catch (error) {
         console.error("Error loading user:", error);
      } finally {
         setLoading(false);
      }
   };

   const loadStats = async (userId: string) => {
      try {
         const data = await userStatsApi.getStats(userId);
         setStats(data);
      } catch (error) {
         console.error("Error loading stats:", error);
      }
   };

   const loadActivities = async (userId: string) => {
      try {
         const data = await userStatsApi.getActivities(userId, 10);
         setActivities(data || []);
      } catch (error) {
         console.error("Error loading activities:", error);
      }
   };

   const loadCertificates = async (userId: string) => {
      try {
         const data = await userStatsApi.getCertificates(userId);
         setCertificates(data || []);
      } catch (error) {
         console.error("Error loading certificates:", error);
      }
   };

   const loadAchievements = async (userId: string) => {
      try {
         const data = await userStatsApi.getAchievements(userId);
         if (data && data.achievements) {
            setAchievements(data.achievements);
            setAchievementsSummary(data.summary || null);
         }
      } catch (error) {
         console.error("Error loading achievements:", error);
      }
   };

   const getUnlockedAchievements = () => {
      return achievements.filter(a => a.unlocked).slice(0, 4);
   };

   const getLevel = () => {
      if (!achievementsSummary) return 1;
      return Math.floor(achievementsSummary.total_points / 100) + 1;
   };

   const getRoleLabel = (role?: string) => {
      const normalized = (role || '').toLowerCase();
      switch (normalized) {
         case 'admin': return 'Administrador';
         case 'teacher':
         case 'instructor': return 'Professor';
         case 'student':
         default: return 'Estudante';
      }
   };

   const getRoleBadge = (role?: string) => {
      const normalized = (role || '').toLowerCase();
      switch (normalized) {
         case 'admin': return { text: 'Admin', color: 'bg-red-500 text-white' };
         case 'teacher':
         case 'instructor': return { text: 'Professor', color: 'bg-blue-500 text-white' };
         default: return { text: 'Aluno', color: 'bg-harven-gold text-white' };
      }
   };

   const getMemberSince = () => {
      if (user?.created_at) {
         const date = new Date(user.created_at);
         return date.getFullYear().toString();
      }
      return new Date().getFullYear().toString();
   };

   const getAvatarUrl = () => {
      if (user?.avatar_url) {
         return user.avatar_url;
      }
      // Generate avatar from name
      const name = user?.name || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
   };

   const getActivityIcon = (action: string) => {
      switch (action) {
         case 'course_completed': return { icon: 'school', color: 'bg-primary text-harven-dark' };
         case 'course_started': return { icon: 'play_arrow', color: 'bg-blue-100 text-blue-600' };
         case 'content_completed': return { icon: 'check_circle', color: 'bg-green-100 text-green-600' };
         case 'chapter_viewed': return { icon: 'visibility', color: 'bg-purple-100 text-purple-600' };
         case 'quiz_completed': return { icon: 'quiz', color: 'bg-orange-100 text-orange-600' };
         case 'login': return { icon: 'login', color: 'bg-gray-100 text-gray-500' };
         default: return { icon: 'history', color: 'bg-gray-100 text-gray-500' };
      }
   };

   const getActivityLabel = (action: string) => {
      switch (action) {
         case 'course_completed': return 'Concluiu o curso';
         case 'course_started': return 'Iniciou o curso';
         case 'content_completed': return 'Completou';
         case 'chapter_viewed': return 'Visualizou';
         case 'quiz_completed': return 'Completou o quiz';
         case 'login': return 'Fez login';
         default: return 'Atividade';
      }
   };

   const formatTimeAgo = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const diffWeeks = Math.floor(diffDays / 7);

      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `Ha ${diffMins} min`;
      if (diffHours < 24) return `Ha ${diffHours}h`;
      if (diffDays < 7) return `Ha ${diffDays} dias`;
      if (diffWeeks < 4) return `Ha ${diffWeeks} semanas`;
      return date.toLocaleDateString('pt-BR');
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
               <p className="text-gray-500">Carregando perfil...</p>
            </div>
         </div>
      );
   }

   if (!user) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="text-center">
               <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
               <p className="text-gray-500 text-lg">Usuario nao encontrado</p>
               <button onClick={() => navigate('/')} className="mt-4 text-primary-dark font-bold hover:underline">
                  Voltar ao Inicio
               </button>
            </div>
         </div>
      );
   }

   const roleBadge = getRoleBadge(user.role);

   return (
      <div className="flex flex-col h-full bg-harven-bg overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
         {/* Banner & Header */}
         <div className="relative h-64 w-full bg-harven-dark overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/texture/1600/400')] bg-cover opacity-30 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-harven-bg via-transparent to-transparent"></div>
         </div>

         <div className="max-w-5xl mx-auto w-full px-8 pb-12 -mt-20 relative z-10 flex flex-col gap-8">
            {/* Profile Info Card */}
            <div className="bg-white rounded-2xl border border-harven-border p-8 shadow-lg flex flex-col md:flex-row gap-8 items-start md:items-end">
               <div className="relative">
                  <div className="size-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                     <img src={getAvatarUrl()} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-1 right-1 size-8 bg-primary rounded-full border-4 border-white flex items-center justify-center text-harven-dark shadow-sm" title="Status: Online">
                     <span className="material-symbols-outlined text-[16px] fill-1">check</span>
                  </div>
               </div>

               <div className="flex-1 mb-2">
                  <div className="flex items-center gap-3 mb-1">
                     <h1 className="text-3xl font-display font-bold text-harven-dark">{user.name}</h1>
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${roleBadge.color}`}>
                        {roleBadge.text}
                     </span>
                  </div>
                  <p className="text-gray-500 font-medium">
                     {user.title ? `${user.title} • ` : ''}{getRoleLabel(user.role)}
                     {user.ra && ` • RA: ${user.ra}`}
                  </p>
                  <div className="flex items-center gap-4 mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest flex-wrap">
                     {user.email && (
                        <span className="flex items-center gap-1">
                           <span className="material-symbols-outlined text-[16px]">mail</span>
                           {user.email}
                        </span>
                     )}
                     <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        Membro desde {getMemberSince()}
                     </span>
                  </div>
               </div>

               <div className="flex gap-3 w-full md:w-auto">
                  <Button variant="outline" onClick={() => navigate('/account')}>
                     <span className="material-symbols-outlined mr-2">settings</span>
                     Configurar
                  </Button>
                  <Button onClick={() => setShowShareCard(true)}>
                     <span className="material-symbols-outlined mr-2">share</span>
                     Compartilhar
                  </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left Column: About & Stats */}
               <div className="space-y-8">
                  <Card className="p-6 space-y-4">
                     <h3 className="font-display font-bold text-harven-dark text-lg">Sobre Mim</h3>
                     <p className="text-sm text-gray-600 leading-relaxed">
                        {user.bio || 'Nenhuma descricao adicionada ainda. Acesse as configuracoes para adicionar uma bio.'}
                     </p>
                     <div className="pt-4 border-t border-harven-border">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Informacoes</h4>
                        <div className="space-y-2 text-sm">
                           <div className="flex justify-between">
                              <span className="text-gray-500">Funcao</span>
                              <span className="font-bold text-harven-dark">{getRoleLabel(user.role)}</span>
                           </div>
                           {user.ra && (
                              <div className="flex justify-between">
                                 <span className="text-gray-500">RA</span>
                                 <span className="font-bold text-harven-dark">{user.ra}</span>
                              </div>
                           )}
                           {user.title && (
                              <div className="flex justify-between">
                                 <span className="text-gray-500">Titulo</span>
                                 <span className="font-bold text-harven-dark">{user.title}</span>
                              </div>
                           )}
                        </div>
                     </div>
                  </Card>

                  <Card className="p-6 space-y-4">
                     <h3 className="font-display font-bold text-harven-dark text-lg">Estatisticas</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-harven-bg p-4 rounded-xl text-center">
                           <span className="block text-2xl font-display font-bold text-harven-dark">
                              {stats?.courses_completed ?? 0}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Cursos Concluidos</span>
                        </div>
                        <div className="bg-harven-bg p-4 rounded-xl text-center">
                           <span className="block text-2xl font-display font-bold text-harven-dark">
                              {stats?.hours_studied ? `${stats.hours_studied}h` : '0h'}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Horas Estudadas</span>
                        </div>
                        <div className="bg-harven-bg p-4 rounded-xl text-center">
                           <span className="block text-2xl font-display font-bold text-harven-dark">
                              {stats?.average_score ? stats.average_score.toFixed(1) : '-'}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Media Geral</span>
                        </div>
                        <div className="bg-harven-bg p-4 rounded-xl text-center">
                           <span className="block text-2xl font-display font-bold text-harven-dark">
                              {certificates.length}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Certificados</span>
                        </div>
                     </div>
                     {stats?.courses_in_progress ? (
                        <div className="text-xs text-gray-500 text-center pt-2">
                           <span className="text-primary-dark font-bold">{stats.courses_in_progress}</span> curso(s) em andamento
                        </div>
                     ) : null}
                  </Card>
               </div>

               {/* Right Column: Recent Activity */}
               <div className="lg:col-span-2 space-y-8">
                  <Card className="p-8">
                     <h3 className="font-display font-bold text-harven-dark text-lg mb-6">Atividade Recente</h3>
                     {activities.length > 0 ? (
                        <div className="relative border-l-2 border-harven-bg space-y-6 ml-3 pl-8">
                           {activities.map((activity) => {
                              const { icon, color } = getActivityIcon(activity.action);
                              return (
                                 <div key={activity.id} className="relative">
                                    <div className={`absolute -left-[43px] top-0 size-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${color}`}>
                                       <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                    </div>
                                    <div className="bg-white hover:bg-harven-bg/30 p-4 rounded-xl border border-harven-border transition-colors cursor-default">
                                       <p className="text-sm text-harven-dark">
                                          <span className="font-bold">{getActivityLabel(activity.action)}</span>
                                          {activity.target_title && (
                                             <span className="font-medium text-gray-600"> "{activity.target_title}"</span>
                                          )}
                                       </p>
                                       <p className="text-xs text-gray-400 font-bold uppercase mt-1">
                                          {formatTimeAgo(activity.created_at)}
                                       </p>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                           <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">history</span>
                           <p className="text-gray-500 font-medium">Nenhuma atividade recente</p>
                           <p className="text-gray-400 text-sm mt-1">
                              Suas atividades aparecerão aqui conforme você interagir com a plataforma
                           </p>
                        </div>
                     )}
                     {activities.length > 0 && (
                        <Button variant="ghost" fullWidth className="mt-6 text-gray-400 hover:text-harven-dark">
                           Ver Historico Completo
                        </Button>
                     )}
                  </Card>

                  <Card className="p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-display font-bold text-harven-dark text-lg">Certificados</h3>
                        {certificates.length > 2 && (
                           <button className="text-xs font-bold text-primary-dark hover:underline uppercase">
                              Ver Todos ({certificates.length})
                           </button>
                        )}
                     </div>
                     {certificates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {certificates.slice(0, 2).map((cert) => (
                              <div key={cert.id} className="aspect-video bg-harven-bg rounded-xl border border-harven-border relative group overflow-hidden cursor-pointer">
                                 <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl">workspace_premium</span>
                                 </div>
                                 <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                    <span className="material-symbols-outlined text-harven-gold text-3xl mb-2">verified</span>
                                    <h4 className="font-display font-bold text-harven-dark text-sm">{cert.course_title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                       {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1 font-mono">{cert.certificate_number}</p>
                                 </div>
                                 <div className="absolute inset-0 bg-harven-dark/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <Button variant="primary" size="sm" className="gap-2">
                                       <span className="material-symbols-outlined text-[16px]">download</span> Baixar
                                    </Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                           <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">workspace_premium</span>
                           <p className="text-gray-500 font-medium">Nenhum certificado ainda</p>
                           <p className="text-gray-400 text-sm mt-1">
                              Complete cursos para ganhar certificados
                           </p>
                        </div>
                     )}
                  </Card>

                  {/* Achievements Section */}
                  <Card className="p-8">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                           <h3 className="font-display font-bold text-harven-dark text-lg">Conquistas</h3>
                           {achievementsSummary && (
                              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                                 <span className="material-symbols-outlined text-primary-dark text-[16px]">emoji_events</span>
                                 <span className="text-xs font-bold text-primary-dark">
                                    Nivel {getLevel()} • {achievementsSummary.total_points} pts
                                 </span>
                              </div>
                           )}
                        </div>
                        <button
                           onClick={() => navigate('/achievements')}
                           className="text-xs font-bold text-primary-dark hover:underline uppercase flex items-center gap-1"
                        >
                           Ver Todas
                           <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                     </div>

                     {/* Achievement Stats */}
                     {achievementsSummary && (
                        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-harven-border">
                           <div className="flex items-center gap-2">
                              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                                 <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                              </div>
                              <div>
                                 <p className="text-lg font-bold text-harven-dark">{achievementsSummary.unlocked}</p>
                                 <p className="text-[10px] text-gray-500 uppercase">Desbloqueadas</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
                                 <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                              </div>
                              <div>
                                 <p className="text-lg font-bold text-harven-dark">{achievementsSummary.locked}</p>
                                 <p className="text-[10px] text-gray-500 uppercase">Bloqueadas</p>
                              </div>
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                 <span className="text-gray-500">Progresso</span>
                                 <span className="font-bold text-harven-dark">{achievementsSummary.completion_percent}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                 <div
                                    className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500"
                                    style={{ width: `${achievementsSummary.completion_percent}%` }}
                                 />
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Achievement Cards */}
                     {getUnlockedAchievements().length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {getUnlockedAchievements().map((achievement) => (
                              <AchievementCard
                                 key={achievement.id}
                                 achievement={achievement}
                                 size="sm"
                                 showProgress={false}
                              />
                           ))}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                           <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">emoji_events</span>
                           <p className="text-gray-500 font-medium">Nenhuma conquista desbloqueada</p>
                           <p className="text-gray-400 text-sm mt-1">
                              Complete atividades para desbloquear conquistas!
                           </p>
                           <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => navigate('/achievements')}
                           >
                              Ver Conquistas Disponiveis
                           </Button>
                        </div>
                     )}
                  </Card>
               </div>
            </div>
         </div>

         {/* Share Card Modal */}
         <ShareCard
            isOpen={showShareCard}
            onClose={() => setShowShareCard(false)}
            user={{
               name: user.name,
               avatar_url: user.avatar_url,
               bio: user.bio,
               role: user.role,
               title: user.title
            }}
            stats={stats}
            certificates={certificates}
            achievements={achievements.filter(a => a.unlocked).map(a => ({
               id: a.id,
               title: a.title,
               description: a.description,
               icon: a.icon
            }))}
         />
      </div>
   );
};

export default UserProfile;
