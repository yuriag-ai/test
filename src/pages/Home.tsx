import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
  Heart,
  Dumbbell,
  Clock,
  MessageCircle,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export function Home() {
  const { t } = useTranslation('home');

  const iconMap: Record<string, any> = {
    Heart,
    Dumbbell,
    Clock,
    MessageCircle,
    TrendingUp,
    Shield,
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-bg-section via-white to-bg-section py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm mb-8">
              <Sparkles className="h-4 w-4 text-laranja-energia" />
              <span className="text-sm font-medium text-texto-principal">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-montserrat font-black text-navy-confianca mb-6 max-w-4xl mx-auto leading-tight">
              {t('hero.title')}
            </h1>

            <p className="text-lg md:text-xl text-texto-secundario mb-10 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/auth">
                <Button size="lg" variant="primary">
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  {t('hero.cta_secondary')}
                </Button>
              </a>
            </div>

            <p className="text-sm text-texto-secundario flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-verde-progresso" />
              {t('hero.social_proof')}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-montserrat font-bold text-navy-confianca mb-4">
              {t('how_it_works.section_title')}
            </h2>
            <p className="text-xl text-texto-secundario max-w-2xl mx-auto">
              {t('how_it_works.section_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t('how_it_works.steps', { returnObjects: true }).map((step: any, index: number) => (
              <Card key={index} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 text-8xl font-montserrat font-black text-bg-section opacity-50">
                  {step.number}
                </div>
                <CardContent className="relative z-10 pt-6">
                  <div className="text-6xl font-montserrat font-black text-laranja-energia mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-montserrat font-bold text-navy-confianca mb-3">
                    {step.title}
                  </h3>
                  <p className="text-texto-secundario leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Beginners Section */}
      <section className="py-20 lg:py-32 bg-bg-section">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-montserrat font-bold text-navy-confianca mb-4">
              {t('for_beginners.section_title')}
            </h2>
            <p className="text-xl text-texto-secundario max-w-3xl mx-auto">
              {t('for_beginners.section_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t('for_beginners.features', { returnObjects: true }).map((feature: any, index: number) => {
              const IconComponent = iconMap[feature.icon];
              return (
                <Card key={index} className="hover:scale-105 transition-transform duration-200">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-full bg-laranja-energia/10 flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-laranja-energia" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-navy-confianca mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-texto-secundario leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-montserrat font-bold text-navy-confianca mb-12 text-center">
            {t('testimonials.section_title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t('testimonials.items', { returnObjects: true }).map((testimonial: any, index: number) => (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-200">
                <CardContent className="pt-6">
                  <p className="text-texto-principal italic mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-verde-progresso flex items-center justify-center">
                      <span className="text-white font-bold">
                        {testimonial.avatar_initials}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-navy-confianca">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-texto-secundario">
                        {testimonial.detail}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-navy-confianca to-navy-light text-white">
        <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-montserrat font-bold mb-6">
            {t('final_cta.title')}
          </h2>
          <p className="text-xl text-cinza-claro mb-8 leading-relaxed">
            {t('final_cta.subtitle')}
          </p>
          <Link to="/auth">
            <Button size="lg" variant="primary" className="mb-4">
              {t('final_cta.button')}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-cinza-medio">
            {t('final_cta.note')}
          </p>
        </div>
      </section>
    </div>
  );
}
