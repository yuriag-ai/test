import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Play, Pause, SkipForward, Check, X } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Workout, Exercise } from '../types';
import { NotificationService } from '../services/notificationService';

export function WorkoutMode() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('workout');

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0 && isRunning && isResting) {
      // Rest period ended
      setIsResting(false);
      setIsRunning(false);
    }

    return () => clearInterval(interval);
  }, [isRunning, timer, isResting]);

  const loadWorkout = async () => {
    if (!id) return;

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
  };

  const currentExercise = exercises[currentExerciseIndex];

  const startExercise = () => {
    if (currentExercise.duration_seconds) {
      setTimer(currentExercise.duration_seconds);
      setIsRunning(true);
    }
  };

  const completeSet = () => {
    if (!currentExercise) return;

    const totalSets = currentExercise.sets || 1;

    if (currentSet < totalSets) {
      // Start rest period
      setIsResting(true);
      setTimer(currentExercise.rest_seconds || 60);
      setIsRunning(true);
      setCurrentSet(currentSet + 1);
    } else {
      // Move to next exercise
      nextExercise();
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsResting(false);
      setIsRunning(false);
      setTimer(0);
    } else {
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    if (!user || !workout) return;

    const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
    const caloriesBurned = duration * 5; // Rough estimate

    // Save to history
    await supabase.from('workout_history').insert({
      user_id: user.id,
      workout_id: workout.id,
      workout_name: workout.name,
      completed_at: new Date().toISOString(),
      duration_minutes: duration,
      calories_burned: caloriesBurned,
      exercises_completed: exercises.length,
      rating: 5,
    });

    // Send achievement notification
    NotificationService.notifyAchievement(
      'Treino Completo!',
      `Parabéns! Você completou ${exercises.length} exercícios e queimou ~${caloriesBurned} calorias! 🔥`
    );

    setCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!workout || exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-laranja-energia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-texto-secundario">Carregando treino...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />

        <Card className="max-w-md mx-4">
          <CardContent className="pt-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-navy-confianca mb-4">
              Treino Completo!
            </h2>
            <p className="text-lg text-texto-secundario mb-6">
              Parabéns! Você arrasou! 💪
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-bg-section rounded-button">
                <div className="text-2xl font-bold text-laranja-energia">
                  {exercises.length}
                </div>
                <div className="text-sm text-texto-secundario">Exercícios</div>
              </div>
              <div className="p-4 bg-bg-section rounded-button">
                <div className="text-2xl font-bold text-verde-progresso">
                  {Math.floor((Date.now() - startTime) / 1000 / 60)}
                </div>
                <div className="text-sm text-texto-secundario">Minutos</div>
              </div>
              <div className="p-4 bg-bg-section rounded-button">
                <div className="text-2xl font-bold text-navy-confianca">
                  ~{Math.floor((Date.now() - startTime) / 1000 / 60) * 5}
                </div>
                <div className="text-sm text-texto-secundario">Calorias</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/meus-treinos')}
                className="w-full"
              >
                Voltar para Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/treino/${id}`)}
                className="w-full"
              >
                Ver Detalhes do Treino
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-confianca text-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Exercício {currentExerciseIndex + 1} de {exercises.length}</span>
            <span>{Math.round(((currentExerciseIndex) / exercises.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-navy-light rounded-full overflow-hidden">
            <div
              className="h-full bg-laranja-energia transition-all duration-300"
              style={{ width: `${((currentExerciseIndex) / exercises.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Exercise */}
        <Card className="mb-6 bg-white/10 border-0">
          <CardContent className="pt-6">
            {isResting ? (
              <div className="text-center py-12">
                <div className="text-verde-progresso text-xl mb-4">Descanse</div>
                <div className="text-7xl font-bold mb-4">{formatTime(timer)}</div>
                <p className="text-white/70">Prepare-se para a próxima série</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-laranja-energia text-sm mb-2">
                    Série {currentSet} de {currentExercise.sets}
                  </div>
                  <h2 className="text-3xl font-bold mb-2">{currentExercise.exercise_name}</h2>

                  {currentExercise.duration_seconds ? (
                    <div className="text-6xl font-bold my-8">
                      {isRunning ? formatTime(timer) : formatTime(currentExercise.duration_seconds)}
                    </div>
                  ) : (
                    <div className="text-4xl font-bold my-8">
                      {currentExercise.reps} repetições
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="mb-6 p-4 bg-navy-light/50 rounded-button">
                  <p className="text-white/90 mb-3">{currentExercise.instructions}</p>
                  {currentExercise.beginner_tip && (
                    <div className="text-sm text-verde-progresso">
                      💡 <strong>Dica:</strong> {currentExercise.beginner_tip}
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {currentExercise.duration_seconds && !isRunning && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={startExercise}
                      className="flex-1"
                    >
                      <Play className="h-5 w-5" />
                      Iniciar
                    </Button>
                  )}

                  {isRunning && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setIsRunning(false)}
                      className="flex-1"
                    >
                      <Pause className="h-5 w-5" />
                      Pausar
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={completeSet}
                    className="flex-1"
                  >
                    <Check className="h-5 w-5" />
                    {currentSet < (currentExercise.sets || 1) ? 'Série Completa' : 'Próximo'}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={nextExercise}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Exit Button */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Tem certeza que deseja sair? Seu progresso não será salvo.')) {
                navigate(`/treino/${id}`);
              }
            }}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
            Sair do Treino
          </Button>
        </div>
      </div>
    </div>
  );
}
