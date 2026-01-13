import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Calendar, TrendingUp, Flame, Clock, Trophy, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WorkoutHistory {
  id: string;
  completed_at: string;
  duration_minutes: number;
  calories_burned: number;
  workout_name: string;
  rating: number;
}

interface UserStats {
  total_workouts: number;
  total_minutes: number;
  total_calories: number;
  current_streak: number;
  longest_streak: number;
}

export function Progress() {
  const { t } = useTranslation('workout');
  const { user } = useAuth();
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load workout history
    const { data: historyData } = await supabase
      .from('workout_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(50);

    // Load user stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setHistory(historyData || []);
    setStats(statsData);
    setLoading(false);
  };

  // Prepare chart data
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');

    const dayWorkouts = history.filter(w =>
      format(new Date(w.completed_at), 'yyyy-MM-dd') === dateStr
    );

    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      workouts: dayWorkouts.length,
      calories: dayWorkouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0),
      minutes: dayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0),
    };
  });

  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const weeksAgo = 3 - i;
    const startDate = subDays(new Date(), weeksAgo * 7 + 6);
    const endDate = subDays(new Date(), weeksAgo * 7);

    const weekWorkouts = history.filter(w => {
      const wDate = new Date(w.completed_at);
      return wDate >= startDate && wDate <= endDate;
    });

    return {
      week: `Sem ${i + 1}`,
      workouts: weekWorkouts.length,
      calories: weekWorkouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0),
    };
  });

  const goalDistribution = [
    { name: 'Perder Peso', value: history.filter(w => w.workout_name?.includes('peso')).length || 1, color: '#FF6B35' },
    { name: 'Ganhar Músculos', value: history.filter(w => w.workout_name?.includes('músculo')).length || 1, color: '#1A1A2E' },
    { name: 'Saúde', value: history.filter(w => w.workout_name?.includes('saúde')).length || 1, color: '#16DB93' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-laranja-energia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-texto-secundario">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinza-claro py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-montserrat font-black text-navy-confianca mb-2">
            Seu Progresso 📊
          </h1>
          <p className="text-xl text-texto-secundario">
            Acompanhe sua evolução e conquistas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-8 w-8 text-laranja-energia" />
                <span className="text-3xl font-bold text-navy-confianca">
                  {stats?.total_workouts || 0}
                </span>
              </div>
              <p className="text-sm text-texto-secundario">Treinos Completados</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-8 w-8 text-verde-progresso" />
                <span className="text-3xl font-bold text-navy-confianca">
                  {stats?.total_minutes || 0}
                </span>
              </div>
              <p className="text-sm text-texto-secundario">Minutos Treinados</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Flame className="h-8 w-8 text-red-500" />
                <span className="text-3xl font-bold text-navy-confianca">
                  {stats?.total_calories || 0}
                </span>
              </div>
              <p className="text-sm text-texto-secundario">Calorias Queimadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-yellow-500" />
                <span className="text-3xl font-bold text-navy-confianca">
                  {stats?.current_streak || 0} 🔥
                </span>
              </div>
              <p className="text-sm text-texto-secundario">
                Dias Seguidos (Recorde: {stats?.longest_streak || 0})
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={last7DaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="date" stroke="#666666" />
                  <YAxis stroke="#666666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="workouts"
                    stroke="#FF6B35"
                    strokeWidth={3}
                    name="Treinos"
                  />
                  <Line
                    type="monotone"
                    dataKey="minutes"
                    stroke="#16DB93"
                    strokeWidth={2}
                    name="Minutos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Calories */}
          <Card>
            <CardHeader>
              <CardTitle>Calorias por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="week" stroke="#666666" />
                  <YAxis stroke="#666666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="calories" fill="#FF6B35" radius={[8, 8, 0, 0]} name="Calorias" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Goal Distribution & Recent Workouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goal Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Treinos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={goalDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Workouts List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Histórico Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {history.slice(0, 10).map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 bg-bg-section rounded-button hover:bg-cinza-claro transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-laranja-energia/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-laranja-energia" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-confianca">
                          {workout.workout_name || 'Treino'}
                        </div>
                        <div className="text-sm text-texto-secundario">
                          {format(new Date(workout.completed_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-verde-progresso">
                        {workout.duration_minutes} min
                      </div>
                      <div className="text-xs text-texto-secundario">
                        ~{workout.calories_burned} cal
                      </div>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-8 text-texto-secundario">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum treino completado ainda.</p>
                    <p className="text-sm">Complete seu primeiro treino para ver estatísticas!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
