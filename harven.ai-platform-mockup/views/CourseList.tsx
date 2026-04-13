import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Progress } from '../components/ui/Progress';
import { Select } from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import { coursesApi, disciplinesApi } from '../services/api';

interface CourseListProps {
  userRole: UserRole;
}

const CourseList: React.FC<CourseListProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', instructor: userRole === 'INSTRUCTOR' ? 'Eu (Instrutor)' : '', category: 'Geral' });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Courses
  const loadCourses = async () => {
    try {
      const data = await coursesApi.list();
      // Filter out invalid courses (e.g. empty rows from DB)
      const validCourses = data.filter((c: any) => c.title && c.title.trim() !== '');
      setCourses(validCourses);
    } catch (error) {
      console.error("Erro ao buscar cursos", error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const data = await coursesApi.list();
        if (!controller.signal.aborted) {
          const validCourses = data.filter((c: any) => c.title && c.title.trim() !== '');
          setCourses(validCourses);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Erro ao buscar cursos", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await disciplinesApi.create(newCourse);
      await loadCourses(); // Reload list
      setShowCreateModal(false);
      setNewCourse({ title: '', instructor: '', category: 'Geral' });
    } catch (error) {
      toast.error('Erro ao criar curso');
    } finally {
      setIsCreating(false);
    }
  };

  // Extrair categorias únicas
  const categories = ['Todas', ...Array.from(new Set(courses.map(c => c.category)))];

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Determine status based on progress for filtering
      let status = 'Não Iniciado';
      if (course.progress > 0 && course.progress < 100) {
        status = 'Em Andamento';
      } else if (course.progress === 100) {
        status = 'Concluído';
      }

      // Filtro por Aba
      let matchesTab = true;
      if (activeTab === 'Em Andamento') {
        matchesTab = status === 'Em Andamento';
      } else if (activeTab === 'Não Iniciados') {
        matchesTab = status === 'Não Iniciado';
      } else if (activeTab === 'Concluídos') {
        matchesTab = status === 'Concluído';
      } else if (activeTab === 'Favoritos') {
        matchesTab = !!course.isFavorite;
      }

      // Filtro por Texto
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        (course.title || '').toLowerCase().includes(query) ||
        (course.instructor && course.instructor.toLowerCase().includes(query)) ||
        (course.category || '').toLowerCase().includes(query);

      // Filtro por Categoria
      const matchesCategory = selectedCategory === 'Todas' || course.category === selectedCategory;

      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeTab, selectedCategory, courses]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-72 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8 h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Meus Estudos</h2>
          <p className="text-muted-foreground mt-1">Explore seu catálogo e continue aprendendo.</p>
        </div>

        <div className="flex items-end gap-3 w-full md:w-auto">
          <Input
            icon="search"
            placeholder="Buscar materiais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <div className="w-40">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="border-b border-border pb-1">
        <Tabs
          items={['Todos', 'Em Andamento', 'Não Iniciados', 'Concluídos', 'Favoritos']}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="bg-transparent p-0 justify-start"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        {filteredCourses.map((course) => (
          <Card
            key={course.id}
            hoverEffect
            className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 group"
            onClick={() => navigate(`/course/${course.id}`)}
          >
            <div className="relative h-40 overflow-hidden bg-muted">
              <img src={course.image || course.image_url || 'https://picsum.photos/seed/default/600/400'} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
              <div className="absolute top-3 right-3">
                <Badge variant="default" className="bg-white/90 backdrop-blur text-foreground border-none">
                  {course.category}
                </Badge>
              </div>
              {course.isFavorite && (
                <div className="absolute top-3 left-3 text-harven-gold drop-shadow-md">
                  <span className="material-symbols-outlined fill-1 text-[20px]">star</span>
                </div>
              )}
              {course.progress === 100 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <Badge variant="success" className="bg-primary text-primary-foreground border-none">
                    <span className="material-symbols-outlined text-[16px] fill-1 mr-1">check_circle</span> Concluído
                  </Badge>
                </div>
              )}
            </div>

            <CardContent className="flex-1 flex flex-col p-5">
              <h3 className="font-display font-bold text-lg text-foreground leading-tight line-clamp-2 group-hover:text-primary-dark transition-colors">
                {course.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">school</span>
                {course.instructor}
              </p>

              <div className="mt-auto pt-6 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progresso</span>
                  <span className="text-xs font-bold text-foreground">{course.progress || 0}%</span>
                </div>

                <Progress value={course.progress || 0} className="h-1.5" />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                    {course.total_modules || 0} Módulos
                  </span>
                  <button className="text-xs font-bold text-foreground hover:text-primary-dark transition-colors">
                    {course.progress > 0 ? 'Continuar' : 'Iniciar'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Card de Ação (Condicional) */}
        <Card
          hoverEffect
          className="flex flex-col items-center justify-center p-6 gap-4 text-center border-dashed bg-muted/20 min-h-[300px]"
          onClick={() => userRole === 'INSTRUCTOR' ? setShowCreateModal(true) : toast.info('Catálogo em breve')}
        >
          <div className="size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary-dark">
              {userRole === 'INSTRUCTOR' ? 'add' : 'search'}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {userRole === 'INSTRUCTOR' ? 'Criar Novo Curso' : 'Explorar Catálogo'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {userRole === 'INSTRUCTOR' ? 'Adicione um novo conteúdo' : 'Descubra novos conteúdos'}
            </p>
          </div>
        </Card>
      </div>

      {/* Modal Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Novo Curso</h3>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <Input label="Título" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} required />
              <Input label="Instrutor" value={newCourse.instructor} onChange={e => setNewCourse({ ...newCourse, instructor: e.target.value })} />
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">Categoria</label>
                <select className="w-full border rounded p-2" value={newCourse.category} onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}>
                  <option>Geral</option>
                  <option>Marketing</option>
                  <option>Tecnologia</option>
                  <option>Design</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} fullWidth>Cancelar</Button>
                <Button type="submit" disabled={isCreating} fullWidth>{isCreating ? 'Criando...' : 'Criar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CourseList;
