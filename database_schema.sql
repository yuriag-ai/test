-- TreinaÍ Database Schema
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  preferred_language text default 'pt-BR',
  created_at timestamp with time zone default now()
);

-- User fitness profiles
create table if not exists fitness_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  age integer,
  gender text,
  weight numeric,
  weight_unit text default 'kg',
  height numeric,
  height_unit text default 'cm',
  fitness_level text,
  primary_goal text,
  available_equipment text[],
  preferred_duration integer,
  days_per_week integer,
  limitations text,
  updated_at timestamp with time zone default now()
);

-- Workouts
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  goal text,
  level text,
  duration_minutes integer,
  equipment_needed text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Exercises in workouts
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text,
  sets integer,
  reps integer,
  duration_seconds integer,
  rest_seconds integer,
  order_index integer,
  muscle_groups text[],
  difficulty text,
  instructions text,
  beginner_tip text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table profiles enable row level security;
alter table fitness_profiles enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Fitness profiles policies
create policy "Users can view own fitness profile"
  on fitness_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own fitness profile"
  on fitness_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fitness profile"
  on fitness_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own fitness profile"
  on fitness_profiles for delete
  using (auth.uid() = user_id);

-- Workouts policies
create policy "Users can view own workouts"
  on workouts for select
  using (auth.uid() = user_id);

create policy "Users can create own workouts"
  on workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on workouts for delete
  using (auth.uid() = user_id);

-- Workout exercises policies
create policy "Users can view exercises from own workouts"
  on workout_exercises for select
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can insert exercises into own workouts"
  on workout_exercises for insert
  with check (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can update exercises in own workouts"
  on workout_exercises for update
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can delete exercises from own workouts"
  on workout_exercises for delete
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'pt-BR')
  );
  return new;
end;
$$;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger update_fitness_profiles_updated_at
  before update on fitness_profiles
  for each row execute procedure update_updated_at_column();

create trigger update_workouts_updated_at
  before update on workouts
  for each row execute procedure update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_fitness_profiles_user_id on fitness_profiles(user_id);
create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_workout_exercises_workout_id on workout_exercises(workout_id);
create index if not exists idx_workout_exercises_order on workout_exercises(workout_id, order_index);

-- ============================================
-- INITIAL DATA (Optional - Sample exercises)
-- ============================================

-- You can add sample exercises here if needed
-- For now, exercises are generated dynamically in the app
