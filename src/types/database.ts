export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          avatar_url: string | null
          preferred_language: string
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          created_at?: string
        }
      }
      fitness_profiles: {
        Row: {
          id: string
          user_id: string
          age: number | null
          gender: string | null
          weight: number | null
          weight_unit: string
          height: number | null
          height_unit: string
          fitness_level: string | null
          primary_goal: string | null
          available_equipment: string[] | null
          preferred_duration: number | null
          days_per_week: number | null
          limitations: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          age?: number | null
          gender?: string | null
          weight?: number | null
          weight_unit?: string
          height?: number | null
          height_unit?: string
          fitness_level?: string | null
          primary_goal?: string | null
          available_equipment?: string[] | null
          preferred_duration?: number | null
          days_per_week?: number | null
          limitations?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          age?: number | null
          gender?: string | null
          weight?: number | null
          weight_unit?: string
          height?: number | null
          height_unit?: string
          fitness_level?: string | null
          primary_goal?: string | null
          available_equipment?: string[] | null
          preferred_duration?: number | null
          days_per_week?: number | null
          limitations?: string | null
          updated_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          name: string | null
          goal: string | null
          level: string | null
          duration_minutes: number | null
          equipment_needed: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          goal?: string | null
          level?: string | null
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          goal?: string | null
          level?: string | null
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string | null
          sets: number | null
          reps: number | null
          duration_seconds: number | null
          rest_seconds: number | null
          order_index: number | null
          muscle_groups: string[] | null
          difficulty: string | null
          instructions: string | null
          beginner_tip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name?: string | null
          sets?: number | null
          reps?: number | null
          duration_seconds?: number | null
          rest_seconds?: number | null
          order_index?: number | null
          muscle_groups?: string[] | null
          difficulty?: string | null
          instructions?: string | null
          beginner_tip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_name?: string | null
          sets?: number | null
          reps?: number | null
          duration_seconds?: number | null
          rest_seconds?: number | null
          order_index?: number | null
          muscle_groups?: string[] | null
          difficulty?: string | null
          instructions?: string | null
          beginner_tip?: string | null
          created_at?: string
        }
      }
    }
  }
}
