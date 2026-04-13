import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { Button } from './ui/Button';

interface UserStats {
   courses_completed: number;
   courses_in_progress: number;
   hours_studied: number;
   average_score: number;
   certificates: number;
   total_activities: number;
   streak_days: number;
}

interface Certificate {
   id: string;
   course_title: string;
   issued_at: string;
   certificate_number: string;
}

interface Achievement {
   id: string;
   title: string;
   description: string;
   icon: string;
   unlocked_at?: string;
}

interface ShareCardProps {
   isOpen: boolean;
   onClose: () => void;
   user: {
      name: string;
      avatar_url?: string;
      bio?: string;
      role?: string;
      title?: string;
   };
   stats: UserStats | null;
   certificates: Certificate[];
   achievements?: Achievement[];
}

const ShareCard: React.FC<ShareCardProps> = ({
   isOpen,
   onClose,
   user,
   stats,
   certificates,
   achievements = []
}) => {
   const cardRef = useRef<HTMLDivElement>(null);
   const [isExporting, setIsExporting] = useState(false);
   const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'gradient'>('dark');

   const getAvatarUrl = () => {
      if (user?.avatar_url) {
         return user.avatar_url;
      }
      const name = user?.name || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=D0FF00&color=0a1f09&bold=true`;
   };

   const getRoleLabel = (role?: string) => {
      const normalized = (role || '').toLowerCase();
      switch (normalized) {
         case 'admin': return 'Administrador';
         case 'teacher':
         case 'instructor': return 'Professor';
         default: return 'Estudante';
      }
   };

   const handleExport = async () => {
      if (!cardRef.current) return;

      setIsExporting(true);
      try {
         const canvas = await html2canvas(cardRef.current, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            logging: false
         });

         // Convert to blob and download
         canvas.toBlob((blob) => {
            if (blob) {
               const url = URL.createObjectURL(blob);
               const link = document.createElement('a');
               link.download = `harven-profile-${user.name.toLowerCase().replace(/\s+/g, '-')}.png`;
               link.href = url;
               link.click();
               URL.revokeObjectURL(url);
            }
         }, 'image/png');
      } catch (error) {
         console.error('Error exporting card:', error);
         toast.error('Erro ao exportar card. Tente novamente.');
      } finally {
         setIsExporting(false);
      }
   };

   const handleCopyToClipboard = async () => {
      if (!cardRef.current) return;

      setIsExporting(true);
      try {
         const canvas = await html2canvas(cardRef.current, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            logging: false
         });

         canvas.toBlob(async (blob) => {
            if (blob) {
               try {
                  await navigator.clipboard.write([
                     new ClipboardItem({ 'image/png': blob })
                  ]);
                  toast.success('Card copiado para a area de transferencia!');
               } catch (err) {
                  console.error('Failed to copy:', err);
                  toast.error('Nao foi possivel copiar. Tente baixar a imagem.');
               }
            }
         }, 'image/png');
      } catch (error) {
         console.error('Error copying card:', error);
      } finally {
         setIsExporting(false);
      }
   };

   const themeStyles = {
      dark: {
         bg: 'bg-gradient-to-br from-[#0a1f09] via-[#152214] to-[#0a1f09]',
         text: 'text-white',
         subtext: 'text-gray-400',
         card: 'bg-white/5 border-white/10',
         accent: 'text-[#D0FF00]'
      },
      light: {
         bg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
         text: 'text-gray-900',
         subtext: 'text-gray-500',
         card: 'bg-white border-gray-200 shadow-sm',
         accent: 'text-[#0a1f09]'
      },
      gradient: {
         bg: 'bg-gradient-to-br from-[#D0FF00] via-[#a8cc00] to-[#0a1f09]',
         text: 'text-white',
         subtext: 'text-white/70',
         card: 'bg-black/20 border-white/20 backdrop-blur-sm',
         accent: 'text-white'
      }
   };

   const theme = themeStyles[selectedTheme];

   // Default achievements if none provided
   const defaultAchievements: Achievement[] = [
      { id: '1', title: 'Primeiro Passo', description: 'Completou o primeiro curso', icon: 'rocket_launch' },
      { id: '2', title: 'Dedicado', description: '10 horas de estudo', icon: 'schedule' },
      { id: '3', title: 'Certificado', description: 'Obteve primeiro certificado', icon: 'workspace_premium' },
   ];

   const displayAchievements = achievements.length > 0 ? achievements :
      (stats?.courses_completed || 0) > 0 ? defaultAchievements.slice(0, Math.min(3, stats?.courses_completed || 0)) : [];

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
         <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
               <div>
                  <h2 className="text-xl font-display font-bold text-gray-900">Compartilhar Perfil</h2>
                  <p className="text-sm text-gray-500">Exporte seu card de perfil como imagem</p>
               </div>
               <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               >
                  <span className="material-symbols-outlined text-gray-400">close</span>
               </button>
            </div>

            {/* Theme Selector */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tema:</span>
               <div className="flex gap-2">
                  {[
                     { id: 'dark', label: 'Escuro', color: 'bg-[#0a1f09]' },
                     { id: 'light', label: 'Claro', color: 'bg-white border border-gray-200' },
                     { id: 'gradient', label: 'Gradiente', color: 'bg-gradient-to-r from-[#D0FF00] to-[#0a1f09]' }
                  ].map((t) => (
                     <button
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                           selectedTheme === t.id
                              ? 'bg-gray-100 ring-2 ring-[#D0FF00] ring-offset-1'
                              : 'hover:bg-gray-50'
                        }`}
                     >
                        <div className={`size-4 rounded-full ${t.color}`}></div>
                        {t.label}
                     </button>
                  ))}
               </div>
            </div>

            {/* Card Preview */}
            <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
               <div
                  ref={cardRef}
                  className={`w-[600px] ${theme.bg} rounded-3xl p-8 relative overflow-hidden`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
               >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                     <div className="absolute top-0 right-0 w-96 h-96 bg-[#D0FF00] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                     <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D0FF00] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                     {/* Header with Avatar */}
                     <div className="flex items-start gap-6 mb-6">
                        <div className="relative">
                           <div className="size-24 rounded-2xl overflow-hidden border-2 border-[#D0FF00]/30 shadow-lg">
                              <img
                                 src={getAvatarUrl()}
                                 alt={user.name}
                                 className="w-full h-full object-cover"
                                 crossOrigin="anonymous"
                              />
                           </div>
                           <div className="absolute -bottom-1 -right-1 size-6 bg-[#D0FF00] rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[14px] text-[#0a1f09]">verified</span>
                           </div>
                        </div>
                        <div className="flex-1">
                           <h1 className={`text-2xl font-bold ${theme.text}`}>{user.name}</h1>
                           <p className={`text-sm ${theme.subtext}`}>
                              {user.title ? `${user.title} • ` : ''}{getRoleLabel(user.role)}
                           </p>
                           {user.bio && (
                              <p className={`text-sm ${theme.subtext} mt-2 line-clamp-2`}>
                                 {user.bio}
                              </p>
                           )}
                        </div>
                        <div className="text-right">
                           <div className={`text-xs font-bold ${theme.accent} uppercase tracking-widest`}>Harven.ai</div>
                        </div>
                     </div>

                     {/* Stats Grid */}
                     <div className={`${theme.card} rounded-2xl p-4 mb-4 border`}>
                        <div className="grid grid-cols-4 gap-4">
                           <div className="text-center">
                              <div className={`text-2xl font-bold ${theme.accent}`}>
                                 {stats?.courses_completed ?? 0}
                              </div>
                              <div className={`text-[10px] ${theme.subtext} uppercase tracking-wider`}>
                                 Cursos
                              </div>
                           </div>
                           <div className="text-center">
                              <div className={`text-2xl font-bold ${theme.accent}`}>
                                 {stats?.hours_studied ?? 0}h
                              </div>
                              <div className={`text-[10px] ${theme.subtext} uppercase tracking-wider`}>
                                 Horas
                              </div>
                           </div>
                           <div className="text-center">
                              <div className={`text-2xl font-bold ${theme.accent}`}>
                                 {stats?.average_score ? stats.average_score.toFixed(1) : '-'}
                              </div>
                              <div className={`text-[10px] ${theme.subtext} uppercase tracking-wider`}>
                                 Media
                              </div>
                           </div>
                           <div className="text-center">
                              <div className={`text-2xl font-bold ${theme.accent}`}>
                                 {certificates.length}
                              </div>
                              <div className={`text-[10px] ${theme.subtext} uppercase tracking-wider`}>
                                 Certificados
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Certificates Section */}
                     {certificates.length > 0 && (
                        <div className={`${theme.card} rounded-2xl p-4 mb-4 border`}>
                           <div className={`text-xs font-bold ${theme.subtext} uppercase tracking-widest mb-3 flex items-center gap-2`}>
                              <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                              Certificados ({certificates.length})
                           </div>
                           <div className="space-y-2">
                              {certificates.slice(0, 4).map((cert) => (
                                 <div key={cert.id} className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-[#D0FF00]/20 flex items-center justify-center flex-shrink-0">
                                       <span className="material-symbols-outlined text-[16px] text-[#D0FF00]">verified</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className={`text-sm font-medium ${theme.text} truncate`}>{cert.course_title}</p>
                                       <p className={`text-[10px] ${theme.subtext}`}>
                                          {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                                       </p>
                                    </div>
                                 </div>
                              ))}
                              {certificates.length > 4 && (
                                 <p className={`text-xs ${theme.subtext} text-center pt-1`}>
                                    +{certificates.length - 4} certificados
                                 </p>
                              )}
                           </div>
                        </div>
                     )}

                     {/* Achievements Section */}
                     {displayAchievements.length > 0 && (
                        <div className={`${theme.card} rounded-2xl p-4 border`}>
                           <div className={`text-xs font-bold ${theme.subtext} uppercase tracking-widest mb-3 flex items-center gap-2`}>
                              <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                              Conquistas
                           </div>
                           <div className="flex gap-3">
                              {displayAchievements.slice(0, 5).map((achievement) => (
                                 <div
                                    key={achievement.id}
                                    className="flex flex-col items-center gap-1 flex-1"
                                    title={achievement.description}
                                 >
                                    <div className="size-10 rounded-xl bg-[#D0FF00]/20 flex items-center justify-center">
                                       <span className="material-symbols-outlined text-[20px] text-[#D0FF00]">
                                          {achievement.icon}
                                       </span>
                                    </div>
                                    <span className={`text-[9px] ${theme.subtext} text-center leading-tight`}>
                                       {achievement.title}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Footer */}
                     <div className="mt-6 flex items-center justify-between">
                        <div className={`text-[10px] ${theme.subtext}`}>
                           Gerado em {new Date().toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="size-5 bg-[#D0FF00] rounded flex items-center justify-center">
                              <span className="text-[10px] font-black text-[#0a1f09]">H</span>
                           </div>
                           <span className={`text-xs font-bold ${theme.text}`}>harven.ai</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
               <p className="text-xs text-gray-400">
                  Dica: Use o tema escuro para melhor visualizacao em redes sociais
               </p>
               <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCopyToClipboard} disabled={isExporting}>
                     <span className="material-symbols-outlined mr-2 text-[18px]">content_copy</span>
                     Copiar
                  </Button>
                  <Button onClick={handleExport} disabled={isExporting}>
                     {isExporting ? (
                        <>
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                           Exportando...
                        </>
                     ) : (
                        <>
                           <span className="material-symbols-outlined mr-2 text-[18px]">download</span>
                           Baixar PNG
                        </>
                     )}
                  </Button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default ShareCard;
