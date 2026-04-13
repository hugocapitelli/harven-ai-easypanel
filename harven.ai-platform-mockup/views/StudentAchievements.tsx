import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Progress } from '../components/ui/Progress';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import AchievementCard, { Achievement } from '../components/AchievementCard';
import { Skeleton } from '../components/ui/Skeleton';
import { userStatsApi } from '../services/api';
import { safeJsonParse } from '../lib/utils';

interface AchievementsSummary {
   total: number;
   unlocked: number;
   locked: number;
   total_points: number;
   completion_percent: number;
}

interface UserStats {
   courses_completed: number;
   hours_studied: number;
   average_score: number;
   streak_days: number;
}

const categoryInfo: Record<string, { icon: string; color: string; label: string }> = {
   jornada: { icon: 'route', color: 'text-green-500', label: 'Jornada' },
   tempo: { icon: 'schedule', color: 'text-blue-500', label: 'Tempo' },
   desempenho: { icon: 'trending_up', color: 'text-orange-500', label: 'Desempenho' },
   certificados: { icon: 'workspace_premium', color: 'text-yellow-500', label: 'Certificados' },
   consistencia: { icon: 'bolt', color: 'text-red-500', label: 'Consistencia' },
   social: { icon: 'group', color: 'text-pink-500', label: 'Social' },
   especial: { icon: 'agriculture', color: 'text-emerald-600', label: 'Agro' }
};

const StudentAchievements: React.FC = () => {
   const navigate = useNavigate();
   const [achievements, setAchievements] = useState<Achievement[]>([]);
   const [summary, setSummary] = useState<AchievementsSummary | null>(null);
   const [userStats, setUserStats] = useState<UserStats | null>(null);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState('all');
   const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

   useEffect(() => {
      const controller = new AbortController();
      const doLoad = async () => {
         try {
            const userData = safeJsonParse<{ id?: string }>('user-data', {});
            if (userData.id) {
               const [achievementsData, statsData] = await Promise.all([
                  userStatsApi.getAchievements(userData.id),
                  userStatsApi.getStats(userData.id)
               ]);
               if (controller.signal.aborted) return;
               setAchievements(achievementsData.achievements || []);
               setSummary(achievementsData.summary || null);
               setUserStats(statsData);
            }
         } catch (error) {
            if (controller.signal.aborted) return;
            console.error("Erro ao carregar dados:", error);
         } finally {
            if (!controller.signal.aborted) {
               setLoading(false);
            }
         }
      };
      doLoad();
      return () => controller.abort();
   }, []);

   const loadData = async () => {
      try {
         const userData = safeJsonParse<{ id?: string }>('user-data', {});
         if (userData.id) {
            const [achievementsData, statsData] = await Promise.all([
               userStatsApi.getAchievements(userData.id),
               userStatsApi.getStats(userData.id)
            ]);
            setAchievements(achievementsData.achievements || []);
            setSummary(achievementsData.summary || null);
            setUserStats(statsData);
         }
      } catch (error) {
         console.error("Erro ao carregar dados:", error);
      } finally {
         setLoading(false);
      }
   };

   const getFilteredAchievements = () => {
      if (activeTab === 'unlocked') return achievements.filter(a => a.unlocked);
      if (activeTab === 'locked') return achievements.filter(a => !a.unlocked);
      return achievements;
   };

   const getLevel = () => {
      if (!summary) return 1;
      // Level based on total points: every 100 points = 1 level
      return Math.floor(summary.total_points / 100) + 1;
   };

   const getLevelProgress = () => {
      if (!summary) return 0;
      // Progress within current level
      return (summary.total_points % 100);
   };

   const getLevelTitle = () => {
      const level = getLevel();
      if (level >= 20) return 'Lenda Suprema';
      if (level >= 15) return 'Mestre Erudito';
      if (level >= 10) return 'Erudito Socratico';
      if (level >= 7) return 'Estudioso Dedicado';
      if (level >= 5) return 'Aprendiz Curioso';
      if (level >= 3) return 'Iniciante Promissor';
      return 'Novato';
   };

   const getRecentUnlocks = () => {
      return achievements.filter(a => a.unlocked).slice(0, 3);
   };

   const getCloseToUnlock = () => {
      return achievements
         .filter(a => !a.unlocked && a.progress_percent >= 50)
         .sort((a, b) => b.progress_percent - a.progress_percent)
         .slice(0, 3);
   };

   const filteredAchievements = getFilteredAchievements();

   if (loading) {
      return (
         <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8">
            {/* Hero skeleton */}
            <Skeleton className="h-56 w-full rounded-2xl" />
            {/* Quick stats skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border p-4 flex items-center gap-4">
                     <Skeleton className="size-12 rounded-xl" />
                     <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-3 w-24" />
                     </div>
                  </div>
               ))}
            </div>
            {/* Achievements grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                     <div key={i} className="rounded-xl border p-4 space-y-3">
                        <Skeleton className="size-12 rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full" />
                     </div>
                  ))}
               </div>
               <div className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-36 w-full rounded-xl" />
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">

         {/* Hero Section - Level & Stats */}
         <div className="bg-harven-dark rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 size-40 bg-harven-gold/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
               {/* Level Circle */}
               <div className="relative size-32 flex-shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                     <path
                        className="text-white/10"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                     />
                     <path
                        className="text-primary"
                        strokeDasharray={`${getLevelProgress()}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-xs font-bold text-primary uppercase tracking-widest">Nivel</span>
                     <span className="text-4xl font-display font-bold">{getLevel()}</span>
                  </div>
               </div>

               <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                     <h2 className="text-3xl font-display font-bold tracking-tight">{getLevelTitle()}</h2>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                     Voce acumulou <strong className="text-primary">{summary?.total_points || 0} pontos</strong>.
                     {getLevelProgress() > 0 && (
                        <> Faltam <strong className="text-white">{100 - getLevelProgress()} pontos</strong> para o proximo nivel.</>
                     )}
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                     <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                        <span className="material-symbols-outlined text-orange-500 fill-1">local_fire_department</span>
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">Ofensiva</p>
                           <p className="text-sm font-bold">{userStats?.streak_days || 0} dias</p>
                        </div>
                     </div>
                     <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                        <span className="material-symbols-outlined text-harven-gold fill-1">military_tech</span>
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">Conquistas</p>
                           <p className="text-sm font-bold">{summary?.unlocked || 0} / {summary?.total || 0}</p>
                        </div>
                     </div>
                     <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400 fill-1">schedule</span>
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">Horas</p>
                           <p className="text-sm font-bold">{userStats?.hours_studied || 0}h estudadas</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Progress Circle */}
               <div className="text-center">
                  <div className="relative size-20">
                     <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                        <path
                           className="text-white/10"
                           d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="4"
                        />
                        <path
                           className="text-harven-gold"
                           strokeDasharray={`${summary?.completion_percent || 0}, 100`}
                           d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="4"
                           strokeLinecap="round"
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">{summary?.completion_percent || 0}%</span>
                     </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">Completo</p>
               </div>
            </div>
         </div>

         {/* Quick Stats */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
               { icon: 'emoji_events', label: 'Desbloqueadas', value: summary?.unlocked || 0, color: 'text-primary' },
               { icon: 'star', label: 'Pontos Totais', value: summary?.total_points || 0, color: 'text-yellow-500' },
               { icon: 'school', label: 'Estudos Completos', value: userStats?.courses_completed || 0, color: 'text-blue-500' },
               { icon: 'trending_up', label: 'Media Geral', value: userStats?.average_score?.toFixed(1) || '-', color: 'text-green-500' }
            ].map((stat) => (
               <Card key={stat.label} className="p-4 flex items-center gap-4">
                  <div className={`size-12 rounded-xl bg-gray-100 flex items-center justify-center ${stat.color}`}>
                     <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
                  </div>
                  <div>
                     <p className="text-2xl font-display font-bold text-harven-dark">{stat.value}</p>
                     <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  </div>
               </Card>
            ))}
         </div>

         {/* Close to Unlock */}
         {getCloseToUnlock().length > 0 && (
            <Card className="p-6">
               <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-orange-500">hourglass_top</span>
                  <h3 className="font-display font-bold text-harven-dark">Quase La!</h3>
                  <span className="text-xs text-gray-400">Conquistas proximas de desbloquear</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getCloseToUnlock().map(achievement => (
                     <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        size="sm"
                        showProgress={true}
                        onClick={() => setSelectedAchievement(achievement)}
                     />
                  ))}
               </div>
            </Card>
         )}

         {/* Main Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main Column: Achievements Grid */}
            <div className="lg:col-span-2 flex flex-col gap-6">
               <div className="flex items-center justify-between flex-wrap gap-4">
                  <h3 className="text-xl font-display font-bold text-harven-dark">Todas as Conquistas</h3>

                  <Tabs
                     items={[
                        { id: 'all', label: `Todas (${achievements.length})` },
                        { id: 'unlocked', label: `Obtidas (${summary?.unlocked || 0})` },
                        { id: 'locked', label: `Bloqueadas (${summary?.locked || 0})` },
                     ]}
                     activeTab={activeTab}
                     onChange={setActiveTab}
                     className="bg-white border border-harven-border"
                  />
               </div>

               {filteredAchievements.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {filteredAchievements.map((achievement) => (
                        <AchievementCard
                           key={achievement.id}
                           achievement={achievement}
                           size="md"
                           showProgress={true}
                           onClick={() => setSelectedAchievement(achievement)}
                        />
                     ))}
                  </div>
               ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border border-harven-border">
                     <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">emoji_events</span>
                     <p className="text-gray-500 text-lg">Nenhuma conquista encontrada</p>
                     <p className="text-gray-400 text-sm mt-1">
                        {activeTab === 'unlocked' ? 'Continue estudando para desbloquear conquistas!' : 'Todas as conquistas foram desbloqueadas!'}
                     </p>
                  </div>
               )}
            </div>

            {/* Right Column: Categories & Tips */}
            <div className="flex flex-col gap-6">
               {/* Categories Overview */}
               <Card className="p-6">
                  <h3 className="font-display font-bold text-harven-dark mb-4 flex items-center gap-2">
                     <span className="material-symbols-outlined text-purple-500">category</span>
                     Por Categoria
                  </h3>
                  <div className="space-y-3">
                     {Object.entries(categoryInfo).map(([key, info]) => {
                        const catAchievements = achievements.filter(a => a.category === key);
                        const unlocked = catAchievements.filter(a => a.unlocked).length;
                        const total = catAchievements.length;
                        const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;

                        if (total === 0) return null;

                        return (
                           <div key={key} className="flex items-center gap-3">
                              <div className={`size-8 rounded-lg bg-gray-100 flex items-center justify-center ${info.color}`}>
                                 <span className="material-symbols-outlined text-[18px]">{info.icon}</span>
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-harven-dark">{info.label}</span>
                                    <span className="text-gray-500">{unlocked}/{total}</span>
                                 </div>
                                 <Progress value={percent} className="h-1.5" />
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </Card>

               {/* Rarity Stats */}
               <Card className="p-6">
                  <h3 className="font-display font-bold text-harven-dark mb-4 flex items-center gap-2">
                     <span className="material-symbols-outlined text-harven-gold">diamond</span>
                     Por Raridade
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                        { id: 'comum', label: 'Comum', color: 'bg-gray-100 text-gray-600' },
                        { id: 'raro', label: 'Raro', color: 'bg-blue-100 text-blue-600' },
                        { id: 'epico', label: 'Epico', color: 'bg-purple-100 text-purple-600' },
                        { id: 'lendario', label: 'Lendario', color: 'bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600' }
                     ].map(rarity => {
                        const rarityAchievements = achievements.filter(a => a.rarity === rarity.id);
                        const unlocked = rarityAchievements.filter(a => a.unlocked).length;
                        const total = rarityAchievements.length;

                        return (
                           <div key={rarity.id} className={`p-3 rounded-xl ${rarity.color}`}>
                              <p className="text-lg font-bold">{unlocked}/{total}</p>
                              <p className="text-[10px] uppercase tracking-wider opacity-80">{rarity.label}</p>
                           </div>
                        );
                     })}
                  </div>
               </Card>

               {/* Tips */}
               <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <h3 className="font-display font-bold text-harven-dark mb-3 flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary-dark">lightbulb</span>
                     Dica
                  </h3>
                  <p className="text-sm text-gray-600">
                     Complete cursos e mantenha sua ofensiva de estudos para desbloquear mais conquistas.
                     Conquistas <span className="font-bold text-purple-600">epicas</span> e <span className="font-bold text-amber-600">lendarias</span> dao mais pontos!
                  </p>
               </Card>
            </div>
         </div>

         {/* Achievement Detail Modal */}
         {selectedAchievement && (
            <div
               className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
               onClick={() => setSelectedAchievement(null)}
            >
               <div
                  className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
               >
                  <div className="text-center">
                     {/* Icon */}
                     <div className={`
                        size-24 mx-auto rounded-2xl flex items-center justify-center mb-4
                        ${selectedAchievement.unlocked
                           ? selectedAchievement.rarity === 'lendario'
                              ? 'bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-500'
                              : selectedAchievement.rarity === 'epico'
                                 ? 'bg-purple-100 text-purple-500'
                                 : selectedAchievement.rarity === 'raro'
                                    ? 'bg-blue-100 text-blue-500'
                                    : 'bg-gray-100 text-gray-500'
                           : 'bg-gray-100 text-gray-400'
                        }
                     `}>
                        <span className="material-symbols-outlined text-[48px]">
                           {selectedAchievement.unlocked ? selectedAchievement.icon : 'lock'}
                        </span>
                     </div>

                     {/* Title */}
                     <h2 className="text-2xl font-display font-bold text-harven-dark mb-2">
                        {selectedAchievement.title}
                     </h2>

                     {/* Rarity Badge */}
                     <span className={`
                        inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4
                        ${selectedAchievement.rarity === 'lendario' ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white' :
                          selectedAchievement.rarity === 'epico' ? 'bg-purple-100 text-purple-700' :
                          selectedAchievement.rarity === 'raro' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'}
                     `}>
                        {selectedAchievement.rarity}
                     </span>

                     {/* Description */}
                     <p className="text-gray-600 mb-6">{selectedAchievement.description}</p>

                     {/* Progress */}
                     {!selectedAchievement.unlocked && (
                        <div className="mb-6">
                           <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-500">Progresso</span>
                              <span className="font-bold text-harven-dark">
                                 {selectedAchievement.progress} / {selectedAchievement.target}
                              </span>
                           </div>
                           <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                 className={`h-full rounded-full transition-all duration-500 ${
                                    selectedAchievement.rarity === 'lendario' ? 'bg-gradient-to-r from-amber-400 to-yellow-400' :
                                    selectedAchievement.rarity === 'epico' ? 'bg-purple-500' :
                                    selectedAchievement.rarity === 'raro' ? 'bg-blue-500' :
                                    'bg-gray-400'
                                 }`}
                                 style={{ width: `${selectedAchievement.progress_percent}%` }}
                              />
                           </div>
                        </div>
                     )}

                     {/* Points */}
                     <div className="flex items-center justify-center gap-2 text-lg">
                        <span className="material-symbols-outlined text-yellow-500">star</span>
                        <span className="font-bold text-harven-dark">{selectedAchievement.points} pontos</span>
                     </div>

                     {/* Status */}
                     <div className={`mt-6 py-3 px-4 rounded-xl ${
                        selectedAchievement.unlocked ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                     }`}>
                        <span className="material-symbols-outlined text-[18px] mr-2 align-middle">
                           {selectedAchievement.unlocked ? 'check_circle' : 'hourglass_empty'}
                        </span>
                        {selectedAchievement.unlocked ? 'Conquista desbloqueada!' : 'Ainda nao desbloqueada'}
                     </div>
                  </div>

                  <button
                     onClick={() => setSelectedAchievement(null)}
                     className="w-full mt-6 py-3 bg-harven-dark text-white font-bold rounded-xl hover:bg-black transition-colors"
                  >
                     Fechar
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default StudentAchievements;
