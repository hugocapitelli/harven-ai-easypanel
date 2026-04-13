import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { dashboardApi, disciplinesApi, coursesApi } from '../services/api';
import { safeJsonParse } from '../lib/utils';

interface StatItem {
  label: string;
  val: string;
  icon: string;
  trend: string;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatItem[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get user ID from localStorage
        const userId = safeJsonParse<{ id?: string }>('user-data', {}).id;
        const statsData = await dashboardApi.getStats(userId);
        if (controller.signal.aborted) return;
        setStats(statsData);

        // Buscar disciplinas do aluno
        const disciplinesData = await disciplinesApi.list();
        if (controller.signal.aborted) return;
        setDisciplines(disciplinesData);

        // Buscar cursos de cada disciplina (em paralelo)
        const coursesArrays = await Promise.all(
          disciplinesData.slice(0, 3).map(async (disc: any) => {
            try {
              const courses = await coursesApi.listByClass(disc.id);
              return courses.map((c: any) => ({ ...c, disciplineName: disc.title }));
            } catch (e) {
              return [];
            }
          })
        );
        const allCourses = coursesArrays.flat();
        if (!controller.signal.aborted) {
          setEnrolledCourses(allCourses);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => controller.abort();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-harven-dark dark:text-gray-100">Bem-vindo de volta, Aluno</h2>
          <p className="text-gray-500 mt-1">Continue sua jornada de aprendizado socrático hoje.</p>
        </div>
        <Button onClick={() => navigate('/courses')}>
          <span className="material-symbols-outlined fill-1 text-[18px] mr-2">play_arrow</span>
          Retomar Estudos
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={`${stat.label}-${stat.icon}`} hoverEffect className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-start text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <span className="material-symbols-outlined text-harven-gold">{stat.icon}</span>
            </div>
            <p className="text-3xl font-display font-bold text-harven-dark dark:text-white">{stat.val}</p>
            <p className="text-[10px] font-bold text-green-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              {stat.trend}
            </p>
          </Card>
        ))}
      </div>

      {/* Minhas Disciplinas */}
      <div>
        <h3 className="text-lg font-display font-bold text-harven-dark dark:text-white mb-4">Minhas Disciplinas</h3>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">school</span>
            <p className="text-gray-500">Você ainda não está matriculado em nenhum material.</p>
            <p className="text-sm text-gray-400 mt-1">Entre em contato com seu instrutor para ser adicionado a uma disciplina.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((course) => (
              <Card
                key={course.id}
                hoverEffect
                className="cursor-pointer overflow-hidden"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="relative h-40">
                  <img
                    src={course.image || course.image_url || `https://picsum.photos/seed/${course.id}/600/400`}
                    className="w-full h-full object-cover"
                    alt={course.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-harven-dark/80 to-transparent flex items-end p-4">
                    <Badge variant="default" className="bg-primary text-harven-dark border-none shadow-sm">
                      {course.status || 'ATIVO'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {course.disciplineName || 'Disciplina'}
                  </p>
                  <h4 className="font-display font-bold text-harven-dark dark:text-white line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {course.description || 'Clique para ver o conteúdo'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-harven-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {course.chapters_count || 0} módulos
                    </span>
                    <span className="material-symbols-outlined text-primary">arrow_forward</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
