import React from 'react';

export interface Achievement {
   id: string;
   title: string;
   description: string;
   icon: string;
   category: string;
   points: number;
   rarity: 'comum' | 'raro' | 'epico' | 'lendario';
   unlocked: boolean;
   progress: number;
   target: number;
   progress_percent: number;
   unlocked_at?: string;
}

interface AchievementCardProps {
   achievement: Achievement;
   size?: 'sm' | 'md' | 'lg';
   showProgress?: boolean;
   onClick?: () => void;
}

const rarityColors = {
   comum: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      text: 'text-gray-600',
      icon: 'text-gray-500',
      badge: 'bg-gray-200 text-gray-600',
      glow: ''
   },
   raro: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-500',
      badge: 'bg-blue-100 text-blue-700',
      glow: 'shadow-blue-200/50'
   },
   epico: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-500',
      badge: 'bg-purple-100 text-purple-700',
      glow: 'shadow-purple-200/50'
   },
   lendario: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      icon: 'text-amber-500',
      badge: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white',
      glow: 'shadow-amber-200/50'
   }
};

const rarityLabels = {
   comum: 'Comum',
   raro: 'Raro',
   epico: 'Epico',
   lendario: 'Lendario'
};

const categoryLabels: Record<string, string> = {
   jornada: 'Jornada',
   tempo: 'Tempo de Estudo',
   desempenho: 'Desempenho',
   certificados: 'Certificados',
   consistencia: 'Consistencia',
   social: 'Social',
   especial: 'Agro'
};

const AchievementCard: React.FC<AchievementCardProps> = ({
   achievement,
   size = 'md',
   showProgress = true,
   onClick
}) => {
   const colors = rarityColors[achievement.rarity] || rarityColors.comum;
   const isUnlocked = achievement.unlocked;

   const sizeClasses = {
      sm: {
         card: 'p-3',
         icon: 'size-10 text-[24px]',
         title: 'text-sm',
         desc: 'text-[10px]',
         points: 'text-[9px]'
      },
      md: {
         card: 'p-4',
         icon: 'size-14 text-[32px]',
         title: 'text-base',
         desc: 'text-xs',
         points: 'text-[10px]'
      },
      lg: {
         card: 'p-6',
         icon: 'size-20 text-[48px]',
         title: 'text-lg',
         desc: 'text-sm',
         points: 'text-xs'
      }
   };

   const sizes = sizeClasses[size];

   return (
      <div
         onClick={onClick}
         className={`
            relative rounded-2xl border-2 transition-all duration-300
            ${sizes.card}
            ${isUnlocked ? colors.bg : 'bg-gray-50'}
            ${isUnlocked ? colors.border : 'border-gray-200 border-dashed'}
            ${isUnlocked && achievement.rarity !== 'comum' ? `shadow-lg ${colors.glow}` : ''}
            ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
            ${!isUnlocked ? 'opacity-60' : ''}
         `}
      >
         {/* Rarity Badge */}
         {isUnlocked && (
            <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full ${sizes.points} font-bold uppercase tracking-wider ${colors.badge}`}>
               {rarityLabels[achievement.rarity]}
            </div>
         )}

         {/* Locked Overlay */}
         {!isUnlocked && (
            <div className="absolute top-2 right-2">
               <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
            </div>
         )}

         <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`
               ${sizes.icon} rounded-xl flex items-center justify-center flex-shrink-0
               ${isUnlocked ? `${colors.bg} ${colors.icon}` : 'bg-gray-100 text-gray-400'}
               ${isUnlocked && achievement.rarity === 'lendario' ? 'animate-pulse' : ''}
            `}>
               <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>
                  {achievement.icon}
               </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
               <h3 className={`font-bold ${sizes.title} ${isUnlocked ? 'text-harven-dark' : 'text-gray-500'} truncate`}>
                  {achievement.title}
               </h3>
               <p className={`${sizes.desc} ${isUnlocked ? 'text-gray-600' : 'text-gray-400'} mt-0.5`}>
                  {achievement.description}
               </p>

               {/* Progress Bar */}
               {showProgress && !isUnlocked && (
                  <div className="mt-2">
                     <div className="flex justify-between items-center mb-1">
                        <span className={`${sizes.points} text-gray-400`}>
                           {achievement.progress} / {achievement.target}
                        </span>
                        <span className={`${sizes.points} text-gray-400`}>
                           {achievement.progress_percent}%
                        </span>
                     </div>
                     <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                           className={`h-full ${colors.badge} rounded-full transition-all duration-500`}
                           style={{ width: `${achievement.progress_percent}%` }}
                        />
                     </div>
                  </div>
               )}

               {/* Points */}
               <div className={`flex items-center gap-2 mt-2 ${sizes.points}`}>
                  <span className={`flex items-center gap-1 font-bold ${isUnlocked ? colors.text : 'text-gray-400'}`}>
                     <span className="material-symbols-outlined text-[14px]">star</span>
                     {achievement.points} pts
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-400">{categoryLabels[achievement.category] || achievement.category}</span>
               </div>
            </div>
         </div>
      </div>
   );
};

export default AchievementCard;
