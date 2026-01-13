import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function WorkoutGenerator() {
  const { t } = useTranslation('generator');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    weight: '',
    height: '',
    fitnessLevel: '',
    goal: '',
    equipment: [] as string[],
    duration: '',
    daysPerWeek: '',
    limitations: '',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Save fitness profile
      const { data: profile } = await supabase
        .from('fitness_profiles')
        .upsert({
          user_id: user.id,
          age: parseInt(formData.age),
          gender: formData.gender,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          fitness_level: formData.fitnessLevel,
          primary_goal: formData.goal,
          available_equipment: formData.equipment,
          preferred_duration: parseInt(formData.duration),
          days_per_week: parseInt(formData.daysPerWeek),
          limitations: formData.limitations,
        })
        .select()
        .single();

      // Create workout
      const { data: workout } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: t('step4.success_message'),
          goal: formData.goal,
          level: formData.fitnessLevel,
          duration_minutes: parseInt(formData.duration),
          equipment_needed: formData.equipment,
        })
        .select()
        .single();

      // Generate sample exercises (in production, this would call an AI API)
      const sampleExercises = [
        {
          workout_id: workout.id,
          exercise_name: 'Push-ups',
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          order_index: 0,
          muscle_groups: ['chest', 'triceps'],
          difficulty: 'medium',
          instructions: 'Start in plank position, lower body until chest nearly touches floor, push back up.',
          beginner_tip: 'Start with knee push-ups if regular push-ups are too difficult.',
        },
        {
          workout_id: workout.id,
          exercise_name: 'Squats',
          sets: 3,
          reps: 15,
          rest_seconds: 60,
          order_index: 1,
          muscle_groups: ['legs', 'glutes'],
          difficulty: 'easy',
          instructions: 'Stand with feet shoulder-width apart, lower hips back and down, return to standing.',
          beginner_tip: 'Keep your weight on your heels and chest up.',
        },
        {
          workout_id: workout.id,
          exercise_name: 'Plank',
          duration_seconds: 30,
          sets: 3,
          rest_seconds: 45,
          order_index: 2,
          muscle_groups: ['core', 'abs'],
          difficulty: 'medium',
          instructions: 'Hold a push-up position with forearms on ground, keep body straight.',
          beginner_tip: 'Start with 15-20 seconds if 30 is too challenging.',
        },
      ];

      await supabase.from('workout_exercises').insert(sampleExercises);

      navigate(`/treino/${workout.id}`);
    } catch (error) {
      console.error('Error generating workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              label={t('step1.fields.age.label')}
              placeholder={t('step1.fields.age.placeholder')}
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-texto-principal mb-2">
                {t('step1.fields.gender.label')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {t('step1.fields.gender.options', { returnObjects: true }).map((option: string) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: option })}
                    className={`p-3 rounded-button border-2 transition-all ${
                      formData.gender === option
                        ? 'border-laranja-energia bg-laranja-energia/10 text-laranja-energia'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label={t('step1.fields.weight.label')}
              placeholder={t('step1.fields.weight.placeholder')}
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
            <Input
              label={t('step1.fields.height.label')}
              placeholder={t('step1.fields.height.placeholder')}
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            />
            <p className="text-sm text-texto-secundario">{t('step1.encouragement')}</p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-texto-principal mb-3">
                {t('step2.fields.fitness_level.label')}
              </label>
              <div className="space-y-3">
                {t('step2.fields.fitness_level.options', { returnObjects: true }).map((option: any) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, fitnessLevel: option.value })}
                    className={`w-full p-4 rounded-button border-2 text-left transition-all ${
                      formData.fitnessLevel === option.value
                        ? 'border-laranja-energia bg-laranja-energia/10'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    <div className="font-bold text-navy-confianca">{option.title}</div>
                    <div className="text-sm text-texto-secundario mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto-principal mb-3">
                {t('step2.fields.goal.label')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {t('step2.fields.goal.options', { returnObjects: true }).map((option: any) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, goal: option.value })}
                    className={`p-4 rounded-button border-2 transition-all ${
                      formData.goal === option.value
                        ? 'border-laranja-energia bg-laranja-energia/10'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">💪</div>
                    <div className="font-bold text-sm">{option.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-texto-secundario">{t('step2.encouragement')}</p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-texto-principal mb-2">
                {t('step3.fields.equipment.label')}
              </label>
              <p className="text-sm text-texto-secundario mb-3">{t('step3.fields.equipment.hint')}</p>
              <div className="grid grid-cols-2 gap-3">
                {t('step3.fields.equipment.options', { returnObjects: true }).map((option: any) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const newEquipment = formData.equipment.includes(option.value)
                        ? formData.equipment.filter((e) => e !== option.value)
                        : [...formData.equipment, option.value];
                      setFormData({ ...formData, equipment: newEquipment });
                    }}
                    className={`p-3 rounded-button border-2 transition-all ${
                      formData.equipment.includes(option.value)
                        ? 'border-laranja-energia bg-laranja-energia/10'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto-principal mb-2">
                {t('step3.fields.duration.label')}
              </label>
              <p className="text-sm text-texto-secundario mb-3">{t('step3.fields.duration.hint')}</p>
              <div className="flex gap-2">
                {t('step3.fields.duration.options', { returnObjects: true }).map((option: string) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, duration: option.replace(' min', '') })}
                    className={`flex-1 py-2 rounded-button border-2 transition-all ${
                      formData.duration === option.replace(' min', '')
                        ? 'border-laranja-energia bg-laranja-energia text-white'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto-principal mb-2">
                {t('step3.fields.days_per_week.label')}
              </label>
              <p className="text-sm text-texto-secundario mb-3">{t('step3.fields.days_per_week.hint')}</p>
              <div className="flex gap-2">
                {t('step3.fields.days_per_week.options', { returnObjects: true }).map((option: string) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, daysPerWeek: option.replace(' dias', '').replace(' days', '') })}
                    className={`flex-1 py-2 rounded-button border-2 transition-all ${
                      formData.daysPerWeek === option.replace(' dias', '').replace(' days', '')
                        ? 'border-laranja-energia bg-laranja-energia text-white'
                        : 'border-cinza-medio hover:border-laranja-energia/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={t('step3.fields.limitations.label')}
              placeholder={t('step3.fields.limitations.placeholder')}
              hint={t('step3.fields.limitations.hint')}
              value={formData.limitations}
              onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="p-4 bg-bg-section rounded-button">
                <h4 className="font-bold text-navy-confianca mb-2">{t('step4.sections.personal')}</h4>
                <div className="text-sm text-texto-secundario space-y-1">
                  <p>Idade: {formData.age} anos</p>
                  <p>Gênero: {formData.gender}</p>
                  <p>Peso: {formData.weight} kg</p>
                  <p>Altura: {formData.height} cm</p>
                </div>
              </div>

              <div className="p-4 bg-bg-section rounded-button">
                <h4 className="font-bold text-navy-confianca mb-2">{t('step4.sections.fitness')}</h4>
                <div className="text-sm text-texto-secundario space-y-1">
                  <p>Nível: {formData.fitnessLevel}</p>
                  <p>Objetivo: {formData.goal}</p>
                </div>
              </div>

              <div className="p-4 bg-bg-section rounded-button">
                <h4 className="font-bold text-navy-confianca mb-2">{t('step4.sections.routine')}</h4>
                <div className="text-sm text-texto-secundario space-y-1">
                  <p>Equipamentos: {formData.equipment.join(', ') || 'Nenhum'}</p>
                  <p>Duração: {formData.duration} min</p>
                  <p>Frequência: {formData.daysPerWeek} dias/semana</p>
                  {formData.limitations && <p>Limitações: {formData.limitations}</p>}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-section via-white to-bg-section py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                  step <= currentStep ? 'bg-laranja-energia' : 'bg-cinza-medio'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-texto-secundario">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t(`step${currentStep}.title`)}</CardTitle>
            <CardDescription>{t(`step${currentStep}.subtitle`)}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader className="h-12 w-12 text-laranja-energia animate-spin mx-auto mb-4" />
                <p className="text-texto-secundario">{t('step4.loading_messages.0')}</p>
              </div>
            ) : (
              <>
                {renderStep()}

                <div className="flex justify-between mt-8">
                  {currentStep > 1 && (
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="h-5 w-5" />
                      {t('step2.back_button')}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className={currentStep === 1 ? 'ml-auto' : ''}
                  >
                    {currentStep === totalSteps ? t('step4.generate_button') : t('step1.next_button')}
                    {currentStep < totalSteps && <ChevronRight className="h-5 w-5" />}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
