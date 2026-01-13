import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Plus, Play, Eye, Trash2, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Workout } from '../types';

export function Dashboard() {
  const { t } = useTranslation('workout');
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, [user]);

  const loadWorkouts = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('workout_actions.delete_confirm'))) return;

    try {
      await supabase.from('workouts').delete().eq('id', id);
      setWorkouts(workouts.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-laranja-energia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-texto-secundario">Carregando seus treinos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinza-claro py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-montserrat font-black text-navy-confianca mb-2">
            {t('dashboard.welcome', { name: user?.user_metadata?.name || 'Atleta' })}
          </h1>
          <p className="text-xl text-texto-secundario">{t('dashboard.welcome_subtitle')}</p>
        </div>

        {/* Stats */}
        {workouts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-laranja-energia mb-2">
                  {workouts.length}
                </div>
                <div className="text-texto-secundario">{t('dashboard.stats.workouts_created')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-verde-progresso mb-2">
                  {workouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0)}
                </div>
                <div className="text-texto-secundario">Minutos planejados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-navy-confianca mb-2">0</div>
                <div className="text-texto-secundario">{t('dashboard.stats.current_streak')}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workouts Grid or Empty State */}
        {workouts.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="max-w-md mx-auto">
                <div className="h-24 w-24 rounded-full bg-laranja-energia/10 flex items-center justify-center mx-auto mb-6">
                  <Dumbbell className="h-12 w-12 text-laranja-energia" />
                </div>
                <h2 className="text-2xl font-bold text-navy-confianca mb-4">
                  {t('dashboard.empty_state.title')}
                </h2>
                <p className="text-texto-secundario mb-8">
                  {t('dashboard.empty_state.subtitle')}
                </p>
                <Link to="/gerar-treino">
                  <Button size="lg" variant="primary">
                    <Plus className="h-5 w-5" />
                    {t('dashboard.empty_state.button')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-confianca">Seus Treinos</h2>
              <Link to="/gerar-treino">
                <Button variant="primary">
                  <Plus className="h-5 w-5" />
                  {t('dashboard.create_new')}
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workouts.map((workout) => (
                <Card key={workout.id} className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-navy-confianca mb-2">
                        {workout.name || 'Meu Treino'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-laranja-energia/10 text-laranja-energia rounded-full text-xs font-medium">
                          {workout.goal}
                        </span>
                        <span className="px-2 py-1 bg-navy-confianca/10 text-navy-confianca rounded-full text-xs font-medium">
                          {workout.level}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-texto-secundario">
                      <div className="flex justify-between">
                        <span>{t('dashboard.workout_card.created_at')}</span>
                        <span className="font-medium">{formatDate(workout.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('dashboard.workout_card.duration')}</span>
                        <span className="font-medium">{workout.duration_minutes} {t('dashboard.workout_card.duration')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/treino/${workout.id}`} className="flex-1">
                        <Button variant="primary" size="sm" className="w-full">
                          <Eye className="h-4 w-4" />
                          {t('dashboard.workout_card.view')}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(workout.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
