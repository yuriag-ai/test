export interface FitnessProfile {
  age?: number;
  gender?: string;
  weight?: number;
  weightUnit: 'kg' | 'lbs';
  height?: number;
  heightUnit: 'cm' | 'ft';
  fitnessLevel?: 'beginner' | 'beginner_plus' | 'intermediate';
  primaryGoal?: string;
  availableEquipment?: string[];
  preferredDuration?: number;
  daysPerWeek?: number;
  limitations?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  goal?: string;
  level?: string;
  duration_minutes?: number;
  equipment_needed?: string[];
  created_at: string;
  updated_at: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  rest_seconds?: number;
  order_index?: number;
  muscle_groups?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  instructions?: string;
  beginner_tip?: string;
}

export interface User {
  id: string;
  name?: string;
  avatar_url?: string;
  preferred_language: string;
}
