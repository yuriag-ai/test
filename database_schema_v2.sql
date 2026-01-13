-- TreinaÍ Database Schema V2 - With all new features
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- NEW TABLES FOR ENHANCED FEATURES
-- ============================================

-- Workout History (completed workouts tracking)
create table if not exists workout_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  workout_id uuid references workouts(id) on delete set null,
  workout_name text,
  completed_at timestamp with time zone default now(),
  duration_minutes integer,
  calories_burned integer,
  exercises_completed integer,
  notes text,
  rating integer check (rating >= 1 and rating <= 5)
);

-- User Achievements
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  achievement_type text not null,
  achievement_name text not null,
  achievement_description text,
  earned_at timestamp with time zone default now(),
  icon text,
  points integer default 0
);

-- Challenges
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  challenge_type text not null, -- 'streak', 'total_workouts', 'calories', 'duration'
  target_value integer not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  reward_points integer default 0,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- User Challenge Progress
create table if not exists user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  current_value integer default 0,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, challenge_id)
);

-- Community Posts (Social Feed)
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  workout_id uuid references workouts(id) on delete set null,
  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Post Likes
create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

-- Post Comments
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- User Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null, -- 'reminder', 'achievement', 'streak', 'challenge', 'social'
  read boolean default false,
  action_url text,
  created_at timestamp with time zone default now()
);

-- Workout Reminders
create table if not exists workout_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  days_of_week integer[] not null, -- [0,1,2,3,4,5,6] where 0 is Sunday
  time_of_day time not null,
  enabled boolean default true,
  created_at timestamp with time zone default now()
);

-- Premium Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  plan_type text not null, -- 'free', 'premium', 'pro'
  status text not null default 'active', -- 'active', 'cancelled', 'expired'
  started_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text
);

-- Exercise Videos (enhanced exercise library)
create table if not exists exercise_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_name text not null unique,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  difficulty text,
  muscle_groups text[],
  equipment_needed text[],
  instructions text,
  beginner_tip text,
  calories_per_rep numeric,
  created_at timestamp with time zone default now()
);

-- User Stats (for analytics)
create table if not exists user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  total_workouts integer default 0,
  total_minutes integer default 0,
  total_calories integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_workout_date date,
  total_points integer default 0,
  updated_at timestamp with time zone default now()
);

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

alter table workout_history enable row level security;
alter table achievements enable row level security;
alter table challenges enable row level security;
alter table user_challenge_progress enable row level security;
alter table community_posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table notifications enable row level security;
alter table workout_reminders enable row level security;
alter table subscriptions enable row level security;
alter table exercise_videos enable row level security;
alter table user_stats enable row level security;

-- Workout History policies
create policy "Users can view own workout history"
  on workout_history for select using (auth.uid() = user_id);

create policy "Users can create own workout history"
  on workout_history for insert with check (auth.uid() = user_id);

-- Achievements policies
create policy "Users can view own achievements"
  on achievements for select using (auth.uid() = user_id);

create policy "Users can create own achievements"
  on achievements for insert with check (auth.uid() = user_id);

-- Challenges policies
create policy "Everyone can view active challenges"
  on challenges for select using (is_active = true);

-- User Challenge Progress policies
create policy "Users can view own challenge progress"
  on user_challenge_progress for select using (auth.uid() = user_id);

create policy "Users can update own challenge progress"
  on user_challenge_progress for all using (auth.uid() = user_id);

-- Community Posts policies
create policy "Everyone can view community posts"
  on community_posts for select using (true);

create policy "Users can create own posts"
  on community_posts for insert with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on community_posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on community_posts for delete using (auth.uid() = user_id);

-- Post Likes policies
create policy "Everyone can view post likes"
  on post_likes for select using (true);

create policy "Users can create own likes"
  on post_likes for insert with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on post_likes for delete using (auth.uid() = user_id);

-- Post Comments policies
create policy "Everyone can view comments"
  on post_comments for select using (true);

create policy "Users can create comments"
  on post_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on post_comments for delete using (auth.uid() = user_id);

-- Notifications policies
create policy "Users can view own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on notifications for update using (auth.uid() = user_id);

-- Workout Reminders policies
create policy "Users can manage own reminders"
  on workout_reminders for all using (auth.uid() = user_id);

-- Subscriptions policies
create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on subscriptions for update using (auth.uid() = user_id);

-- Exercise Videos policies
create policy "Everyone can view exercise videos"
  on exercise_videos for select using (true);

-- User Stats policies
create policy "Users can view own stats"
  on user_stats for select using (auth.uid() = user_id);

create policy "Users can update own stats"
  on user_stats for all using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update user stats after workout completion
create or replace function update_user_stats_on_workout_completion()
returns trigger
language plpgsql
security definer
as $$
declare
  last_workout date;
  current_streak int;
begin
  -- Get user stats
  select last_workout_date, current_streak
  into last_workout, current_streak
  from user_stats
  where user_id = new.user_id;

  -- Calculate streak
  if last_workout is null then
    current_streak := 1;
  elsif last_workout = current_date - interval '1 day' then
    current_streak := current_streak + 1;
  elsif last_workout = current_date then
    current_streak := current_streak;
  else
    current_streak := 1;
  end if;

  -- Update stats
  insert into user_stats (user_id, total_workouts, total_minutes, total_calories, current_streak, last_workout_date)
  values (
    new.user_id,
    1,
    coalesce(new.duration_minutes, 0),
    coalesce(new.calories_burned, 0),
    current_streak,
    current_date
  )
  on conflict (user_id) do update set
    total_workouts = user_stats.total_workouts + 1,
    total_minutes = user_stats.total_minutes + coalesce(new.duration_minutes, 0),
    total_calories = user_stats.total_calories + coalesce(new.calories_burned, 0),
    current_streak = current_streak,
    longest_streak = greatest(user_stats.longest_streak, current_streak),
    last_workout_date = current_date,
    updated_at = now();

  return new;
end;
$$;

create trigger on_workout_completed
  after insert on workout_history
  for each row execute procedure update_user_stats_on_workout_completion();

-- Function to update post counts
create or replace function update_post_likes_count()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update community_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update community_posts set likes_count = likes_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_post_like_change
  after insert or delete on post_likes
  for each row execute procedure update_post_likes_count();

create or replace function update_post_comments_count()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update community_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update community_posts set comments_count = comments_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_post_comment_change
  after insert or delete on post_comments
  for each row execute procedure update_post_comments_count();

-- Initialize user stats for existing users
insert into user_stats (user_id)
select id from profiles
on conflict (user_id) do nothing;

-- Initialize free subscriptions for existing users
insert into subscriptions (user_id, plan_type, status)
select id, 'free', 'active' from profiles
on conflict (user_id) do nothing;

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_workout_history_user_id on workout_history(user_id);
create index if not exists idx_workout_history_completed_at on workout_history(completed_at desc);
create index if not exists idx_achievements_user_id on achievements(user_id);
create index if not exists idx_community_posts_created_at on community_posts(created_at desc);
create index if not exists idx_community_posts_user_id on community_posts(user_id);
create index if not exists idx_notifications_user_id on notifications(user_id, read);
create index if not exists idx_user_stats_user_id on user_stats(user_id);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample challenges
insert into challenges (title, description, challenge_type, target_value, reward_points, start_date, end_date) values
('Primeira Semana', 'Complete 3 treinos em 7 dias', 'total_workouts', 3, 100, now(), now() + interval '30 days'),
('Queimador de Calorias', 'Queime 1000 calorias no total', 'calories', 1000, 200, now(), now() + interval '30 days'),
('Maratonista', 'Treine por 300 minutos no total', 'duration', 300, 250, now(), now() + interval '30 days'),
('Sequência Vitoriosa', 'Mantenha uma sequência de 7 dias', 'streak', 7, 500, now(), now() + interval '60 days')
on conflict do nothing;

-- Insert sample exercise videos
insert into exercise_videos (exercise_name, video_url, difficulty, muscle_groups, instructions, beginner_tip, calories_per_rep) values
('Jumping Jacks', 'https://www.youtube.com/embed/iSSAk4XCsRA', 'easy', ARRAY['cardio', 'full-body'], 'Stand with feet together. Jump while spreading legs and raising arms overhead.', 'Start slow and focus on form.', 0.4),
('Push-ups', 'https://www.youtube.com/embed/IODxDxX7oi4', 'medium', ARRAY['chest', 'triceps'], 'Lower chest to ground, push back up.', 'Start on knees if needed.', 0.6),
('Squats', 'https://www.youtube.com/embed/aclHkVaku9U', 'easy', ARRAY['legs', 'glutes'], 'Lower hips back and down, keep chest up.', 'Use a chair for reference.', 0.5)
on conflict (exercise_name) do nothing;
