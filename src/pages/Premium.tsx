import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Check, Crown, Zap, Star, Sparkles, Users, BarChart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  highlighted: boolean;
  icon: any;
  color: string;
}

export function Premium() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  useEffect(() => {
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCurrentPlan(data.plan_type);
    }
  };

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'Grátis para sempre',
      icon: Sparkles,
      color: 'text-cinza-medio',
      highlighted: false,
      features: [
        'Geração básica de treinos',
        '3 treinos salvos',
        'Estatísticas básicas',
        'Acesso ao feed comunitário',
        'Desafios mensais',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 19.90,
      period: 'por mês',
      icon: Star,
      color: 'text-laranja-energia',
      highlighted: true,
      features: [
        'Geração ilimitada com IA avançada',
        'Treinos ilimitados salvos',
        'Estatísticas avançadas com gráficos',
        'Modo treino com timer personalizado',
        'Histórico completo',
        'Export de treinos em PDF',
        'Vídeos de todos os exercícios',
        'Notificações e lembretes',
        'Prioridade no suporte',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 39.90,
      period: 'por mês',
      icon: Crown,
      color: 'text-yellow-500',
      highlighted: false,
      features: [
        'Tudo do Premium +',
        'Plano de nutrição personalizado',
        'Consultas mensais com especialistas',
        'Treinos em vídeo completos',
        'Grupos exclusivos',
        'Desafios VIP com prêmios',
        'Badge PRO no perfil',
        'Acesso antecipado a novos recursos',
        'Sem anúncios',
      ],
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert('Faça login para assinar um plano');
      return;
    }

    // In production, integrate with Stripe or another payment provider
    // For now, just update the subscription
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_type: planId,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (!error) {
      alert('Plano ativado com sucesso! 🎉');
      setCurrentPlan(planId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-confianca via-navy-light to-navy-confianca py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-laranja-energia/20 text-laranja-energia rounded-full mb-6">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">Desbloqueie Todo o Potencial</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-montserrat font-black text-white mb-4">
            Escolha Seu Plano
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Leve seus treinos para o próximo nível com recursos premium
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            <div className="p-6 bg-white/10 backdrop-blur rounded-button border border-white/20">
              <div className="text-4xl font-bold text-verde-progresso mb-2">10k+</div>
              <div className="text-white/70">Usuários Ativos</div>
            </div>
            <div className="p-6 bg-white/10 backdrop-blur rounded-button border border-white/20">
              <div className="text-4xl font-bold text-laranja-energia mb-2">98%</div>
              <div className="text-white/70">Satisfação</div>
            </div>
            <div className="p-6 bg-white/10 backdrop-blur rounded-button border border-white/20">
              <div className="text-4xl font-bold text-yellow-400 mb-2">4.9⭐</div>
              <div className="text-white/70">Avaliação Média</div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.highlighted
                    ? 'border-4 border-laranja-energia shadow-2xl scale-105 bg-white'
                    : 'bg-white/95'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="px-4 py-1 bg-laranja-energia text-white text-sm font-bold rounded-full">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`h-16 w-16 rounded-full ${
                      plan.highlighted ? 'bg-laranja-energia' : 'bg-cinza-claro'
                    } flex items-center justify-center`}>
                      <IconComponent className={`h-8 w-8 ${plan.color}`} />
                    </div>
                  </div>

                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>

                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <div className="text-3xl font-bold text-navy-confianca">Grátis</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-sm text-texto-secundario">R$</span>
                          <span className="text-5xl font-bold text-navy-confianca">
                            {plan.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="text-sm text-texto-secundario">{plan.period}</div>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-verde-progresso shrink-0 mt-0.5" />
                        <span className="text-sm text-texto-principal">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="lg"
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? (
                      <>
                        <Check className="h-5 w-5" />
                        Plano Atual
                      </>
                    ) : (
                      <>
                        {plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                        {plan.highlighted && <Zap className="h-5 w-5" />}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Showcase */}
        <div className="mt-20 max-w-6xl mx-auto">
          <h2 className="text-3xl font-montserrat font-bold text-white text-center mb-12">
            Recursos Premium em Destaque
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-laranja-energia/20 flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-laranja-energia" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Estatísticas Avançadas</h3>
                <p className="text-white/70">
                  Visualize seu progresso com gráficos detalhados e insights personalizados
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-verde-progresso/20 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-verde-progresso" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Comunidade Exclusiva</h3>
                <p className="text-white/70">
                  Acesso a grupos VIP e eventos exclusivos com outros membros premium
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Suporte Prioritário</h3>
                <p className="text-white/70">
                  Tire suas dúvidas rapidamente com nossa equipe de especialistas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-montserrat font-bold text-white text-center mb-8">
            Perguntas Frequentes
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim! Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas adicionais.',
              },
              {
                q: 'Posso mudar de plano depois?',
                a: 'Claro! Você pode fazer upgrade ou downgrade do seu plano sempre que quiser.',
              },
              {
                q: 'Há garantia de devolução do dinheiro?',
                a: 'Oferecemos garantia de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro.',
              },
            ].map((faq, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="pt-6">
                  <h4 className="font-bold text-white mb-2">{faq.q}</h4>
                  <p className="text-white/70">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
