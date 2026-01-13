// Service for AI-powered workout generation
// In production, replace with actual OpenAI/Claude API calls

interface WorkoutGenerationParams {
  age: number;
  gender: string;
  weight: number;
  height: number;
  fitnessLevel: string;
  goal: string;
  equipment: string[];
  duration: number;
  daysPerWeek: number;
  limitations?: string;
}

interface GeneratedExercise {
  name: string;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  rest_seconds: number;
  muscle_groups: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string;
  beginner_tip: string;
  video_url?: string;
  calories_burned: number;
}

export class AIWorkoutService {
  private static readonly API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

  // Exercise database with video URLs (using placeholder videos)
  private static exerciseDatabase = {
    beginner: {
      lose_weight: [
        {
          name: 'Jumping Jacks',
          sets: 3,
          reps: 20,
          rest_seconds: 45,
          muscle_groups: ['cardio', 'full-body'],
          difficulty: 'easy' as const,
          instructions: 'Stand with feet together. Jump while spreading legs and raising arms overhead. Return to start.',
          beginner_tip: 'Start with a slower pace and focus on form. You can do half jacks (step side to side) if jumping is too intense.',
          video_url: 'https://www.youtube.com/embed/iSSAk4XCsRA',
          calories_burned: 8,
        },
        {
          name: 'Bodyweight Squats',
          sets: 3,
          reps: 15,
          rest_seconds: 60,
          muscle_groups: ['legs', 'glutes'],
          difficulty: 'easy' as const,
          instructions: 'Stand with feet shoulder-width apart. Lower hips back and down as if sitting in a chair. Keep chest up and knees behind toes.',
          beginner_tip: 'Use a chair behind you - touch it lightly with your glutes to know you went low enough.',
          video_url: 'https://www.youtube.com/embed/aclHkVaku9U',
          calories_burned: 6,
        },
        {
          name: 'Modified Push-ups',
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          muscle_groups: ['chest', 'triceps', 'shoulders'],
          difficulty: 'easy' as const,
          instructions: 'Start on knees in plank position. Lower chest to ground, keeping elbows at 45 degrees. Push back up.',
          beginner_tip: 'Keep your core tight and back straight. Focus on controlled movements rather than speed.',
          video_url: 'https://www.youtube.com/embed/R08gYyypGto',
          calories_burned: 5,
        },
        {
          name: 'Plank Hold',
          sets: 3,
          duration_seconds: 30,
          rest_seconds: 45,
          muscle_groups: ['core', 'abs'],
          difficulty: 'medium' as const,
          instructions: 'Hold a push-up position on forearms. Keep body in straight line from head to heels.',
          beginner_tip: 'Start with 15-20 seconds if 30 is too hard. You can also do it on your knees.',
          video_url: 'https://www.youtube.com/embed/yeKv5oX_6GY',
          calories_burned: 4,
        },
        {
          name: 'Mountain Climbers',
          sets: 3,
          reps: 20,
          rest_seconds: 60,
          muscle_groups: ['core', 'cardio'],
          difficulty: 'medium' as const,
          instructions: 'Start in plank position. Alternate bringing knees to chest in a running motion.',
          beginner_tip: 'Go slower and focus on bringing knee all the way to chest. Speed comes later.',
          video_url: 'https://www.youtube.com/embed/nmwgirgXLYM',
          calories_burned: 9,
        },
        {
          name: 'Walking Lunges',
          sets: 3,
          reps: 12,
          rest_seconds: 60,
          muscle_groups: ['legs', 'glutes'],
          difficulty: 'easy' as const,
          instructions: 'Step forward and lower back knee toward ground. Push off front foot to step forward with other leg.',
          beginner_tip: 'Hold onto a wall for balance if needed. Make sure front knee stays behind toes.',
          video_url: 'https://www.youtube.com/embed/L8fvypPrzzs',
          calories_burned: 7,
        },
      ],
      gain_muscle: [
        {
          name: 'Push-ups',
          sets: 4,
          reps: 8,
          rest_seconds: 90,
          muscle_groups: ['chest', 'triceps'],
          difficulty: 'medium' as const,
          instructions: 'Standard push-up form. Lower chest to ground, push back up.',
          beginner_tip: 'Start on knees if regular push-ups are too hard.',
          video_url: 'https://www.youtube.com/embed/IODxDxX7oi4',
          calories_burned: 6,
        },
        {
          name: 'Squats',
          sets: 4,
          reps: 12,
          rest_seconds: 90,
          muscle_groups: ['legs', 'glutes'],
          difficulty: 'easy' as const,
          instructions: 'Bodyweight squats with perfect form.',
          beginner_tip: 'Focus on depth and control.',
          video_url: 'https://www.youtube.com/embed/aclHkVaku9U',
          calories_burned: 8,
        },
        {
          name: 'Dips (Chair)',
          sets: 3,
          reps: 10,
          rest_seconds: 75,
          muscle_groups: ['triceps', 'shoulders'],
          difficulty: 'medium' as const,
          instructions: 'Use a sturdy chair. Place hands on edge, lower body down, push back up.',
          beginner_tip: 'Keep elbows close to body. Bend knees to make it easier.',
          video_url: 'https://www.youtube.com/embed/0326dy_-CzM',
          calories_burned: 5,
        },
      ],
      flexibility: [
        {
          name: 'Cat-Cow Stretch',
          sets: 3,
          reps: 10,
          rest_seconds: 30,
          muscle_groups: ['back', 'core'],
          difficulty: 'easy' as const,
          instructions: 'On hands and knees, alternate arching and rounding your back.',
          beginner_tip: 'Move slowly and breathe deeply with each movement.',
          video_url: 'https://www.youtube.com/embed/kqnua4rHVVA',
          calories_burned: 2,
        },
        {
          name: 'Downward Dog',
          sets: 3,
          duration_seconds: 30,
          rest_seconds: 30,
          muscle_groups: ['back', 'legs', 'shoulders'],
          difficulty: 'easy' as const,
          instructions: 'From plank, push hips up and back forming an inverted V. Press heels toward ground.',
          beginner_tip: 'Bend knees slightly if hamstrings are tight. Focus on lengthening spine.',
          video_url: 'https://www.youtube.com/embed/E9R7M3nkUPA',
          calories_burned: 3,
        },
      ],
    },
  };

  static async generateWorkout(params: WorkoutGenerationParams): Promise<GeneratedExercise[]> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In production, you would call OpenAI/Claude API here:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert fitness trainer specializing in beginner workouts.',
        }, {
          role: 'user',
          content: `Generate a personalized workout for: ${JSON.stringify(params)}`,
        }],
      }),
    });
    */

    // For now, use intelligent selection from database
    const goalKey = params.goal as keyof typeof this.exerciseDatabase.beginner;
    const levelKey = params.fitnessLevel === 'beginner' ? 'beginner' : 'beginner';

    let exercises = this.exerciseDatabase[levelKey]?.[goalKey] ||
                    this.exerciseDatabase.beginner.lose_weight;

    // Calculate how many exercises fit in duration
    const avgExerciseTime = 4; // minutes per exercise
    const numExercises = Math.min(
      Math.floor(params.duration / avgExerciseTime),
      exercises.length
    );

    // Select exercises
    const selectedExercises = exercises.slice(0, numExercises);

    // Adjust difficulty based on age and fitness level
    return selectedExercises.map(ex => ({
      ...ex,
      sets: params.fitnessLevel === 'beginner' ? Math.max(2, ex.sets - 1) : ex.sets,
      reps: ex.reps ? (params.age > 50 ? Math.floor(ex.reps * 0.8) : ex.reps) : undefined,
    }));
  }

  static async getSuggestedExercises(muscleGroup: string): Promise<GeneratedExercise[]> {
    // Return exercises for specific muscle group
    const allExercises = [
      ...this.exerciseDatabase.beginner.lose_weight,
      ...this.exerciseDatabase.beginner.gain_muscle,
      ...this.exerciseDatabase.beginner.flexibility,
    ];

    return allExercises.filter(ex =>
      ex.muscle_groups.some(mg => mg.toLowerCase().includes(muscleGroup.toLowerCase()))
    );
  }
}
