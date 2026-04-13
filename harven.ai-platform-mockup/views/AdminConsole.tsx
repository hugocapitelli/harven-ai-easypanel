
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../services/api';

const AdminConsole: React.FC = () => {
   const navigate = useNavigate();
   const [showModal, setShowModal] = useState(false);
   const [actionType, setActionType] = useState<'ANNOUNCEMENT' | 'MAINTENANCE'>('ANNOUNCEMENT');
   const [recipientType, setRecipientType] = useState('ALL');
   const [message, setMessage] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [loading, setLoading] = useState(true);

   // Real Data State
   const [logs, setLogs] = useState<any[]>([]);
   const [stats, setStats] = useState({
      total_users: 0,
      total_disciplines: 0,
      active_users_last_month: 0,
      system_health: 'Verificando...'
   });

   useEffect(() => {
      const controller = new AbortController();
      const doFetch = async () => {
         try {
            const [statsData, logsData] = await Promise.all([
               adminApi.getStats(),
               adminApi.getLogs()
            ]);
            if (!controller.signal.aborted) {
               setStats(statsData);
               setLogs(logsData || []);
               setLoading(false);
            }
         } catch (error) {
            if (controller.signal.aborted) return;
            console.error("Error fetching admin data:", error);
            setLoading(false);
         }
      };
      doFetch();
      return () => controller.abort();
   }, []);

   const fetchData = async () => {
      try {
         const [statsData, logsData] = await Promise.all([
            adminApi.getStats(),
            adminApi.getLogs()
         ]);
         setStats(statsData);
         setLogs(logsData || []);
         setLoading(false);
      } catch (error) {
         console.error("Error fetching admin data:", error);
         setLoading(false);
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
         const userData = JSON.parse(sessionStorage.getItem('user-data') || '{}');
         await adminApi.createAction({
            type: actionType,
            message: message,
            author: userData.name || 'Admin'
         });

         // Refresh logs
         const logsData = await adminApi.getLogs();
         setLogs(logsData || []);

         setShowModal(false);
         setMessage('');
      } catch (error) {
         console.error("Error creating action:", error);
         toast.error("Erro ao criar ação global");
      } finally {
         setIsSubmitting(false);
      }
   };

   // Stats Config mapped to real data
   const statCards = [
      { label: 'Total Usuários', val: loading ? '...' : stats.total_users, icon: 'group', trend: '+12% este mês', color: 'blue' },
      { label: 'Turmas', val: loading ? '...' : stats.total_disciplines, icon: 'menu_book', trend: 'Ativas', color: 'harven-gold' },
      { label: 'Performance', val: stats.system_health || '...', icon: 'monitoring', trend: stats.latency ? `Latência: ${stats.latency}` : 'Calculando...', color: 'green' },
      { label: 'Status', val: 'Online', icon: 'check_circle', trend: 'Todos sistemas UP', color: 'green' },
   ];
   return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8 relative">
         <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
               <h2 className="text-3xl font-display font-bold text-harven-dark dark:text-white tracking-tight">Bem-vindo, Admin</h2>
               <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Visão geral do sistema e métricas de hoje.</p>
            </div>
            <button
               onClick={() => setShowModal(true)}
               className="bg-primary hover:bg-primary-dark transition-all text-harven-dark font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20 uppercase tracking-wider text-xs"
            >
               <span className="material-symbols-outlined text-[20px]">add_circle</span>
               Nova Ação Global
            </button>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
               <div key={stat.label} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-harven-border dark:border-gray-700 shadow-sm flex flex-col gap-1 group hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                     <div className="bg-harven-bg dark:bg-gray-700 p-2 rounded-lg text-harven-dark dark:text-white group-hover:bg-primary group-hover:dark:text-harven-dark transition-colors">
                        <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                     </div>
                     <span className={`text-[9px] font-black text-white bg-${stat.color}-500 px-1.5 py-0.5 rounded uppercase tracking-tighter`}>Live</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-harven-dark dark:text-white">{stat.val}</p>
                  <p className="text-[10px] font-bold text-green-600 mt-2">{stat.trend}</p>
               </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-harven-border dark:border-gray-700 p-8 shadow-sm flex flex-col">
               <div className="flex justify-between items-start mb-8">
                  <div>
                     <h3 className="font-display font-bold text-lg text-harven-dark dark:text-white">Crescimento de Usuários</h3>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Últimos 6 meses</p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                     <span className="material-symbols-outlined text-[16px]">trending_up</span> +15%
                  </div>
               </div>
               <div className="flex-1 h-64 w-full flex items-end justify-between px-2 pt-10 relative">
                  {/* Simple Chart Mockup with CSS/SVG */}
                  <svg className="absolute inset-0 h-full w-full opacity-20">
                     <path d="M0,100 Q100,50 200,80 T400,30 T600,10" fill="none" stroke="#d0ff00" strokeWidth="4" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                     <div className="w-full h-px bg-gray-400"></div>
                     <div className="w-full h-px bg-gray-400"></div>
                     <div className="w-full h-px bg-gray-400"></div>
                     <div className="w-full h-px bg-gray-400"></div>
                  </div>
                  {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN'].map((m, idx) => (
                     <div key={m} className="flex flex-col items-center gap-2 group w-full">
                        <div className="w-full bg-harven-bg dark:bg-gray-700 rounded-t-lg h-32 relative overflow-hidden">
                           <div className="absolute bottom-0 w-full bg-harven-dark dark:bg-gray-900 group-hover:bg-primary transition-all rounded-t-lg" style={{ height: `${20 + idx * 15}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">{m}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-harven-border dark:border-gray-700 p-8 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <div>
                     <h3 className="font-display font-bold text-lg text-harven-dark dark:text-white">Ações Rápidas</h3>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gerenciamento imediato</p>
                  </div>
                  <button className="text-gray-400 hover:text-harven-dark transition-colors"><span className="material-symbols-outlined">more_horiz</span></button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button
                     onClick={() => navigate('/admin/users')}
                     className="p-6 bg-harven-bg dark:bg-gray-700 rounded-xl border border-transparent hover:border-primary hover:bg-white dark:hover:bg-gray-600 hover:shadow-md transition-all group flex flex-col gap-3"
                  >
                     <span className="material-symbols-outlined text-gray-400 group-hover:text-primary-dark transition-colors text-3xl">person_add</span>
                     <span className="text-sm font-bold text-harven-dark dark:text-white">Criar Usuário</span>
                  </button>
                  <button
                     onClick={() => navigate('/admin/classes')}
                     className="p-6 bg-harven-bg dark:bg-gray-700 rounded-xl border border-transparent hover:border-primary hover:bg-white dark:hover:bg-gray-600 hover:shadow-md transition-all group flex flex-col gap-3"
                  >
                     <span className="material-symbols-outlined text-gray-400 group-hover:text-primary-dark transition-colors text-3xl">school</span>
                     <span className="text-sm font-bold text-harven-dark dark:text-white">Gestão de Turmas</span>
                  </button>
                  <button className="col-span-2 p-4 bg-harven-dark rounded-xl text-white font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-3">
                     <span className="material-symbols-outlined text-primary text-[20px]">build</span>
                     ENTRAR EM MODO MANUTENÇÃO
                  </button>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-gray-800 rounded-xl border border-harven-border dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-harven-border dark:border-gray-700 flex justify-between items-center">
               <h3 className="font-display font-bold text-harven-dark dark:text-white">Logs Recentes do Sistema</h3>
               <button onClick={fetchData} className="text-[10px] font-black text-primary-dark uppercase tracking-widest hover:underline">Atualizar</button>
            </div>
            <div className="divide-y divide-harven-border max-h-[400px] overflow-y-auto">
               {logs.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">Nenhum log registrado.</div>
               ) : (
                  logs.map((log, i) => (
                     <div key={log.id || i} className="p-4 flex items-center justify-between hover:bg-harven-bg/30 dark:hover:bg-gray-700 transition-colors group">
                        <div className="flex items-center gap-4">
                           <div className="size-8 rounded-full bg-harven-bg dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-harven-dark dark:group-hover:text-white">
                              <span className="material-symbols-outlined text-[18px]">history</span>
                           </div>
                           <div>
                              <p className="text-sm font-bold text-harven-dark dark:text-white">{log.msg}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{log.author} • {new Date(log.created_at).toLocaleTimeString()}</p>
                           </div>
                        </div>
                        <span className={`bg-${log.color || 'gray'}-50 text-${log.color || 'gray'}-600 border border-${log.color || 'gray'}-100 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter`}>{log.status}</span>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Modal de Ação Global */}
         {
            showModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-harven-dark/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                     {/* Header do Modal */}
                     <div className="p-6 border-b border-harven-border bg-harven-bg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="size-10 bg-harven-dark rounded-lg flex items-center justify-center text-primary shadow-sm">
                              <span className="material-symbols-outlined">campaign</span>
                           </div>
                           <div>
                              <h3 className="text-lg font-display font-bold text-harven-dark">Ação Global</h3>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Impacto em todo o sistema</p>
                           </div>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-harven-dark transition-colors">
                           <span className="material-symbols-outlined">close</span>
                        </button>
                     </div>

                     <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                        {/* Tipo de Ação */}
                        <div className="flex p-2 bg-white border-b border-harven-border gap-2 sticky top-0 z-10">
                           <button
                              type="button"
                              onClick={() => setActionType('ANNOUNCEMENT')}
                              className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${actionType === 'ANNOUNCEMENT' ? 'bg-primary/10 text-harven-dark ring-1 ring-primary' : 'text-gray-400 hover:bg-gray-50'}`}
                           >
                              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                              Comunicado
                           </button>
                           <button
                              type="button"
                              onClick={() => setActionType('MAINTENANCE')}
                              className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${actionType === 'MAINTENANCE' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'text-gray-400 hover:bg-gray-50'}`}
                           >
                              <span className="material-symbols-outlined text-[18px]">engineering</span>
                              Manutenção
                           </button>
                        </div>

                        <div className="p-6 space-y-4">
                           {actionType === 'ANNOUNCEMENT' && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de Destinatário</label>
                                    <select
                                       value={recipientType}
                                       // @ts-ignore
                                       onChange={(e) => setRecipientType(e.target.value)}
                                       className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark"
                                    >
                                       <option value="ALL">Todos os Usuários (12.450)</option>
                                       <option value="ROLE">Por Função (Professor/Aluno)</option>
                                       <option value="SPECIFIC_USER">Usuários Específicos</option>
                                       <option value="SPECIFIC_CLASS">Por Turma</option>
                                    </select>
                                 </div>

                                 {recipientType === 'SPECIFIC_CLASS' && (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selecione a Turma</label>
                                       <select className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary text-harven-dark">
                                          <option>Selecione uma turma...</option>
                                          <option>Engenharia de Software 2023.1</option>
                                          <option>Cálculo I - Turma A</option>
                                          <option>Direito Constitucional - Noturno</option>
                                          <option>Medicina - Anatomia II</option>
                                       </select>
                                    </div>
                                 )}

                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mensagem do Sistema</label>
                                    <textarea
                                       required
                                       value={message}
                                       onChange={(e) => setMessage(e.target.value)}
                                       className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary min-h-[100px] resize-none text-harven-dark"
                                       placeholder="Digite seu comunicado aqui..."
                                    />
                                 </div>
                                 <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                    Isso enviará uma notificação push e um e-mail.
                                 </div>
                              </div>
                           )}

                           {actionType === 'MAINTENANCE' && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                 <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                                    <span className="material-symbols-outlined text-red-500">warning</span>
                                    <div>
                                       <h4 className="text-sm font-bold text-red-800">Zona de Perigo</h4>
                                       <p className="text-xs text-red-700 mt-1">Ativar o modo manutenção impedirá o login de todos os usuários exceto administradores.</p>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Início Programado</label>
                                       <input type="datetime-local" className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-red-500 text-harven-dark" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duração Estimada</label>
                                       <select className="w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-red-500 text-harven-dark">
                                          <option>30 minutos</option>
                                          <option>1 hora</option>
                                          <option>4 horas</option>
                                          <option>Indeterminado</option>
                                       </select>
                                    </div>
                                 </div>
                              </div>
                           )}

                           <div className="pt-2 flex gap-3 border-t border-harven-border mt-2">
                              <button
                                 type="button"
                                 onClick={() => setShowModal(false)}
                                 className="flex-1 py-3 border border-harven-border rounded-xl text-xs font-bold text-harven-dark hover:bg-gray-50 transition-colors uppercase tracking-widest"
                              >
                                 Cancelar
                              </button>
                              <button
                                 type="submit"
                                 disabled={isSubmitting}
                                 className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${actionType === 'MAINTENANCE'
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                                    : 'bg-primary hover:bg-primary-dark text-harven-dark shadow-primary/20'
                                    }`}
                              >
                                 {isSubmitting ? (
                                    <>
                                       <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                       Processando...
                                    </>
                                 ) : (
                                    actionType === 'MAINTENANCE' ? 'Agendar Manutenção' : 'Enviar Comunicado'
                                 )}
                              </button>
                           </div>
                        </div>
                     </form>
                  </div>
               </div >
            )
         }
      </div >
   );
};

export default AdminConsole;
