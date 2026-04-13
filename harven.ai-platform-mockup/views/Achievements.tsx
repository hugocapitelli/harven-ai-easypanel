import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import AchievementCard, { Achievement } from '../components/AchievementCard';
import { userStatsApi } from '../services/api';

interface AchievementsSummary {
   total: number;
   unlocked: number;
   locked: number;
   total_points: number;
   completion_percent: number;
}

const categoryInfo: Record<string, { icon: string; color: string }> = {
   jornada: { icon: 'route', color: 'text-green-500' },
   tempo: { icon: 'schedule', color: 'text-blue-500' },
   desempenho: { icon: 'trending_up', color: 'text-orange-500' },
   certificados: { icon: 'workspace_premium', color: 'text-yellow-500' },
   consistencia: { icon: 'bolt', color: 'text-red-500' },
   social: { icon: 'group', color: 'text-pink-500' },
   especial: { icon: 'auto_awesome', color: 'text-purple-500' }
};

const categoryLabels: Record<string, string> = {
   jornada: 'Jornada',
   tempo: 'Tempo de Estudo',
   desempenho: 'Desempenho',
   certificados: 'Certificados',
   consistencia: 'Consistencia',
   social: 'Social',
   especial: 'Especiais'
};

const Achievements: React.FC = () => {
   const navigate = useNavigate();
   const [achievements, setAchievements] = useState<Achievement[]>([]);
   const [summary, setSummary] = useState<AchievementsSummary | null>(null);
   const [loading, setLoading] = useState(true);
   const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
   const [showLocked, setShowLocked] = useState(true);
   const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

   useEffect(() => {
      loadAchievements();
   }, []);

   const loadAchievements = async () => {
      try {
         const storedUser = localStorage.getItem('user-data');
         if (storedUser) {
            const userData = JSON.parse(storedUser);
            const data = await userStatsApi.getAchievements(userData.id);
            setAchievements(data.achievements || []);
            setSummary(data.summary || null);
         }
      } catch (error) {
         console.error("Erro ao carregar conquistas:", error);
      } finally {
         setLoading(false);
      }
   };

   const getFilteredAchievements = () => {
      let filtered = achievements;

      if (activeCategory !== 'all') {
         filtered = filtered.filter(a => a.category === activeCategory);
      }

      if (!showLocked) {
         filtered = filtered.filter(a => a.unlocked);
      }

      return filtered;
   };

   const getCategories = () => {
      const cats = new Set(achievements.map(a => a.category));
      return Array.from(cats);
   };

   const getCategoryStats = (category: string) => {
      const catAchievements = achievements.filter(a => a.category === category);
      const unlocked = catAchievements.filter(a => a.unlocked).length;
      return { total: catAchievements.length, unlocked };
   };

   const getRarityStats = () => {
      const stats = {
         comum: { total: 0, unlocked: 0 },
         raro: { total: 0, unlocked: 0 },
         epico: { total: 0, unlocked: 0 },
         lendario: { total: 0, unlocked: 0 }
      };

      achievements.forEach(a => {
         stats[a.rarity].total++;
         if (a.unlocked) stats[a.rarity].unlocked++;
      });

      return stats;
   };

   const filteredAchievements = getFilteredAchievements();
   const rarityStats = getRarityStats();

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full bg-harven-bg">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
               <p className="text-gray-500">Carregando conquistas...</p>
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full bg-harven-bg overflow-y-auto custom-scrollbar">
         <div className="max-w-6xl mx-auto w-full p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => navigate('/profile')}
                     className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-harven-dark"
                  >
                     <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                     <h1 className="text-3xl font-display font-bold text-harven-dark">Conquistas</h1>
                     <p className="text-gray-500">Desbloqueie conquistas e ganhe pontos</p>
                  </div>
               </div>
            </div>

            {/* Summary Cards */}
            {summary && (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-6 text-center">
                     <div className="size-12 mx-auto bg-primary/20 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-primary-dark text-[28px]">emoji_events</span>
                     </div>
                     <p className="text-3xl font-display font-bold text-harven-dark">{summary.unlocked}</p>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Desbloqueadas</p>
                  </Card>

                  <Card className="p-6 text-center">
                     <div className="size-12 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-blue-600 text-[28px]">star</span>
                     </div>
                     <p className="text-3xl font-display font-bold text-harven-dark">{summary.total_points}</p>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pontos Totais</p>
                  </Card>

                  <Card className="p-6 text-center">
                     <div className="size-12 mx-auto bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-purple-600 text-[28px]">percent</span>
                     </div>
                     <p className="text-3xl font-display font-bold text-harven-dark">{summary.completion_percent}%</p>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Completo</p>
                  </Card>

                  <Card className="p-6 text-center">
                     <div className="size-12 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-gray-500 text-[28px]">lock_open</span>
                     </div>
                     <p className="text-3xl font-display font-bold text-harven-dark">{summary.locked}</p>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Restantes</p>
                  </Card>
               </div>
            )}

            {/* Rarity Overview */}
            <Card className="p-6">
               <h3 className="font-display font-bold text-harven-dark mb-4">Por Raridade</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                     <div className="size-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600">circle</span>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-harven-dark">{rarityStats.comum.unlocked}/{rarityStats.comum.total}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Comum</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                     <div className="size-10 bg-blue-200 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600">hexagon</span>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-harven-dark">{rarityStats.raro.unlocked}/{rarityStats.raro.total}</p>
                        <p className="text-[10px] text-blue-600 uppercase">Raro</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                     <div className="size-10 bg-purple-200 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-600">diamond</span>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-harven-dark">{rarityStats.epico.unlocked}/{rarityStats.epico.total}</p>
                        <p className="text-[10px] text-purple-600 uppercase">Epico</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl">
                     <div className="size-10 bg-gradient-to-br from-amber-300 to-yellow-300 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">auto_awesome</span>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-harven-dark">{rarityStats.lendario.unlocked}/{rarityStats.lendario.total}</p>
                        <p className="text-[10px] text-amber-600 uppercase">Lendario</p>
                     </div>
                  </div>
               </div>
            </Card>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
               {/* Category Filter */}
               <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                     onClick={() => setActiveCategory('all')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        activeCategory === 'all'
                           ? 'bg-harven-dark text-white'
                           : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                     }`}
                  >
                     Todas
                  </button>
                  {getCategories().map(cat => {
                     const stats = getCategoryStats(cat);
                     const info = categoryInfo[cat] || { icon: 'category', color: 'text-gray-500' };
                     return (
                        <button
                           key={cat}
                           onClick={() => setActiveCategory(cat)}
                           className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                              activeCategory === cat
                                 ? 'bg-harven-dark text-white'
                                 : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                           }`}
                        >
                           <span className={`material-symbols-outlined text-[16px] ${activeCategory === cat ? 'text-white' : info.color}`}>
                              {info.icon}
                           </span>
                           {categoryLabels[cat] || cat}
                           <span className={`text-xs ${activeCategory === cat ? 'text-white/70' : 'text-gray-400'}`}>
                              ({stats.unlocked}/{stats.total})
                           </span>
                        </button>
                     );
                  })}
               </div>

               {/* Show Locked Toggle */}
               <label className="flex items-center gap-2 cursor-pointer ml-auto">
                  <input
                     type="checkbox"
                     checked={showLocked}
                     onChange={(e) => setShowLocked(e.target.checked)}
                     className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${showLocked ? 'bg-primary' : 'bg-gray-300'}`}>
                     <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mt-1 ${showLocked ? 'translate-x-5 ml-0' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-600">Mostrar bloqueadas</span>
               </label>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredAchievements.map(achievement => (
                  <AchievementCard
                     key={achievement.id}
                     achievement={achievement}
                     size="md"
                     showProgress={true}
                     onClick={() => setSelectedAchievement(achievement)}
                  />
               ))}
            </div>

            {filteredAchievements.length === 0 && (
               <div className="text-center py-16">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">emoji_events</span>
                  <p className="text-gray-500 text-lg">Nenhuma conquista encontrada</p>
                  <p className="text-gray-400 text-sm mt-1">
                     {!showLocked ? 'Ative "Mostrar bloqueadas" para ver todas' : 'Continue estudando para desbloquear conquistas!'}
                  </p>
               </div>
            )}
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

export default Achievements;
