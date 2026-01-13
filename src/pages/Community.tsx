import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Heart, MessageCircle, Trophy, Flame, Target, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url?: string;
  };
  user_stats: {
    current_streak: number;
    total_workouts: number;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_points: number;
  end_date: string;
}

export function Community() {
  const { t } = useTranslation('workout');
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load posts
    const { data: postsData } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles!inner(name, avatar_url),
        user_stats!inner(current_streak, total_workouts)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Load active challenges
    const { data: challengesData } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('reward_points', { ascending: false });

    setPosts(postsData || []);
    setChallenges(challengesData || []);
    setLoading(false);
  };

  const createPost = async () => {
    if (!user || !newPost.trim()) return;

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      content: newPost,
    });

    if (!error) {
      setNewPost('');
      loadData();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    // Check if already liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
    } else {
      // Like
      await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: user.id,
      });
    }

    loadData();
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;

    const { error } = await supabase.from('user_challenge_progress').insert({
      user_id: user.id,
      challenge_id: challengeId,
      current_value: 0,
    });

    if (!error) {
      alert('Desafio aceito! Boa sorte! 💪');
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'streak': return <Flame className="h-5 w-5" />;
      case 'total_workouts': return <Trophy className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-laranja-energia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-texto-secundario">Carregando comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinza-claro py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-montserrat font-black text-navy-confianca mb-2">
            Comunidade TreinaÍ 👥
          </h1>
          <p className="text-xl text-texto-secundario">
            Compartilhe sua jornada e inspire outras pessoas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-laranja-energia text-white flex items-center justify-center font-bold">
                    {user?.user_metadata?.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Compartilhe sua conquista ou motivação..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && createPost()}
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={createPost}
                    disabled={!newPost.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-verde-progresso text-white flex items-center justify-center font-bold">
                        {post.profiles.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-navy-confianca">
                          {post.profiles.name}
                        </div>
                        <div className="text-sm text-texto-secundario flex items-center gap-2">
                          <span>{format(new Date(post.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}</span>
                          {post.user_stats?.current_streak > 0 && (
                            <span className="flex items-center gap-1 text-orange-500">
                              🔥 {post.user_stats.current_streak} dias
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 bg-laranja-energia/10 text-laranja-energia rounded-full">
                      {post.user_stats?.total_workouts || 0} treinos
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-texto-principal mb-4 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-3 border-t">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-2 text-texto-secundario hover:text-laranja-energia transition-colors"
                    >
                      <Heart className="h-5 w-5" />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>
                    <button className="flex items-center gap-2 text-texto-secundario hover:text-laranja-energia transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {posts.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-cinza-medio" />
                  <h3 className="text-xl font-bold text-navy-confianca mb-2">
                    Nenhuma postagem ainda
                  </h3>
                  <p className="text-texto-secundario mb-4">
                    Seja o primeiro a compartilhar algo inspirador!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Challenges */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-navy-confianca mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-laranja-energia" />
                  Desafios Ativos
                </h3>

                <div className="space-y-3">
                  {challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="p-4 bg-gradient-to-br from-laranja-energia/10 to-transparent rounded-button border-2 border-laranja-energia/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="h-8 w-8 rounded-full bg-laranja-energia text-white flex items-center justify-center">
                          {getChallengeIcon(challenge.challenge_type)}
                        </div>
                        <span className="text-xs font-bold text-verde-progresso">
                          +{challenge.reward_points} pts
                        </span>
                      </div>

                      <h4 className="font-bold text-navy-confianca mb-1">
                        {challenge.title}
                      </h4>
                      <p className="text-sm text-texto-secundario mb-3">
                        {challenge.description}
                      </p>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => joinChallenge(challenge.id)}
                        className="w-full"
                      >
                        Aceitar Desafio
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-navy-confianca mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Top da Semana
                </h3>

                <div className="space-y-2">
                  {[
                    { name: 'Maria Silva', workouts: 12, avatar: 'MS', rank: 1 },
                    { name: 'João Santos', workouts: 10, avatar: 'JS', rank: 2 },
                    { name: 'Ana Costa', workouts: 9, avatar: 'AC', rank: 3 },
                  ].map((leader) => (
                    <div
                      key={leader.rank}
                      className="flex items-center gap-3 p-3 bg-bg-section rounded-button"
                    >
                      <div className="text-xl font-bold text-laranja-energia w-6">
                        {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-navy-confianca text-white flex items-center justify-center font-bold text-sm">
                        {leader.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-navy-confianca">
                          {leader.name}
                        </div>
                        <div className="text-xs text-texto-secundario">
                          {leader.workouts} treinos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
