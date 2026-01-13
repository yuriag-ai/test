import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Play, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Workout, Exercise } from '../types';

export function WorkoutView() {
  const { id } = useParams();
  const { t } = useTranslation('workout');
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    if (!id) return;

    try {
      const { data: workoutData } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();

      const { data: exercisesData } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', id)
        .order('order_index');

      setWorkout(workoutData);
      setExercises(exercisesData || []);
    } catch (error) {
      console.error('Error loading workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(t('workout_actions.delete_confirm'))) return;

    try {
      await supabase.from('workouts').delete().eq('id', id);
      navigate('/meus-treinos');
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-laranja-energia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-texto-secundario">Carregando treino...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-navy-confianca mb-4">Treino não encontrado</h2>
          <Button onClick={() => navigate('/meus-treinos')}>Voltar para meus treinos</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinza-claro py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate('/meus-treinos')}
          className="flex items-center gap-2 text-texto-secundario hover:text-texto-principal mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>

        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">
                  {workout.name || t('workout_header.default_name')}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-laranja-energia/10 text-laranja-energia rounded-full text-sm font-medium">
                    {workout.goal}
                  </span>
                  <span className="px-3 py-1 bg-navy-confianca/10 text-navy-confianca rounded-full text-sm font-medium">
                    {workout.level}
                  </span>
                  <span className="px-3 py-1 bg-verde-progresso/10 text-verde-progresso rounded-full text-sm font-medium">
                    {workout.duration_minutes} min
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  <Play className="h-4 w-4" />
                  {t('workout_header.actions.start')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-laranja-energia">{exercises.length}</div>
                <div className="text-sm text-texto-secundario">{t('workout_summary.total_exercises')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-laranja-energia">{workout.duration_minutes}</div>
                <div className="text-sm text-texto-secundario">{t('workout_summary.estimated_time')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-laranja-energia">
                  {new Set(exercises.flatMap(e => e.muscle_groups || [])).size}
                </div>
                <div className="text-sm text-texto-secundario">{t('workout_summary.muscle_groups')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-laranja-energia">~{workout.duration_minutes * 5}</div>
                <div className="text-sm text-texto-secundario">{t('workout_summary.calories_estimate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-navy-confianca">Exercícios</h3>
          {exercises.map((exercise, index) => (
            <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-laranja-energia text-white font-bold text-sm">
                        {index + 1}
                      </span>
                      <h4 className="text-xl font-bold text-navy-confianca">
                        {exercise.exercise_name}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {exercise.muscle_groups?.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-1 bg-cinza-claro text-texto-secundario rounded text-xs"
                        >
                          {muscle}
                        </span>
                      ))}
                      <span className={`px-2 py-1 rounded text-xs ${
                        exercise.difficulty === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : exercise.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {t(`exercise_card.difficulty.${exercise.difficulty}`)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-cinza-claro rounded-button mb-4">
                  {exercise.sets && (
                    <div>
                      <div className="text-2xl font-bold text-laranja-energia">{exercise.sets}</div>
                      <div className="text-sm text-texto-secundario">{t('exercise_card.sets')}</div>
                    </div>
                  )}
                  {exercise.reps && (
                    <div>
                      <div className="text-2xl font-bold text-laranja-energia">{exercise.reps}</div>
                      <div className="text-sm text-texto-secundario">{t('exercise_card.reps')}</div>
                    </div>
                  )}
                  {exercise.duration_seconds && (
                    <div>
                      <div className="text-2xl font-bold text-laranja-energia">{exercise.duration_seconds}s</div>
                      <div className="text-sm text-texto-secundario">{t('exercise_card.duration')}</div>
                    </div>
                  )}
                  {exercise.rest_seconds && (
                    <div>
                      <div className="text-2xl font-bold text-laranja-energia">{exercise.rest_seconds}s</div>
                      <div className="text-sm text-texto-secundario">{t('exercise_card.rest')}</div>
                    </div>
                  )}
                </div>

                {exercise.instructions && (
                  <div className="mb-3">
                    <h5 className="font-bold text-navy-confianca mb-2">{t('exercise_card.how_to_do')}</h5>
                    <p className="text-texto-secundario text-sm">{exercise.instructions}</p>
                  </div>
                )}

                {exercise.beginner_tip && (
                  <div className="p-3 bg-verde-progresso/10 border-l-4 border-verde-progresso rounded">
                    <p className="text-sm text-texto-principal">
                      <strong>{t('exercise_card.beginner_tip')}</strong> {exercise.beginner_tip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
