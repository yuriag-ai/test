import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell } from 'lucide-react';

export function Auth() {
  const { t } = useTranslation('auth');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        navigate('/meus-treinos');
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('As senhas não coincidem');
          setLoading(false);
          return;
        }
        await signUp(formData.email, formData.password, formData.name);
        navigate('/gerar-treino');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-section via-white to-bg-section">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Illustration/Motivation */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-8">
              <Dumbbell className="h-12 w-12 text-laranja-energia" />
              <span className="text-4xl font-montserrat font-black text-navy-confianca">
                TreinaÍ
              </span>
            </div>
            <h1 className="text-5xl font-montserrat font-black text-navy-confianca mb-6">
              Sua transformação começa aqui
            </h1>
            <p className="text-xl text-texto-secundario leading-relaxed mb-8">
              Junte-se a milhares de pessoas que estão mudando suas vidas através do exercício.
              Com a TreinaÍ, você tem um treinador pessoal de IA sempre ao seu lado.
            </p>
            <div className="space-y-4">
              {['Treinos 100% personalizados', 'Sem julgamentos, sem pressão', 'Resultados reais, comprovados'].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-verde-progresso flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-texto-principal font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <div className="flex justify-center gap-4 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`pb-2 px-4 font-semibold transition-all ${
                    isLogin
                      ? 'text-laranja-energia border-b-2 border-laranja-energia'
                      : 'text-texto-secundario hover:text-texto-principal'
                  }`}
                >
                  {t('login.title').split('!')[0]}
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`pb-2 px-4 font-semibold transition-all ${
                    !isLogin
                      ? 'text-laranja-energia border-b-2 border-laranja-energia'
                      : 'text-texto-secundario hover:text-texto-principal'
                  }`}
                >
                  {t('signup.title')}
                </button>
              </div>
              <CardTitle className="text-center">
                {isLogin ? t('login.title') : t('signup.title')}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin ? t('login.subtitle') : t('signup.subtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <Input
                    name="name"
                    label={t('signup.fields.name')}
                    placeholder={t('signup.fields.name_placeholder')}
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                )}

                <Input
                  name="email"
                  type="email"
                  label={isLogin ? t('login.fields.email') : t('signup.fields.email')}
                  placeholder={isLogin ? t('login.fields.email_placeholder') : t('signup.fields.email_placeholder')}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <Input
                  name="password"
                  type="password"
                  label={isLogin ? t('login.fields.password') : t('signup.fields.password')}
                  placeholder={isLogin ? t('login.fields.password_placeholder') : t('signup.fields.password_placeholder')}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                {!isLogin && (
                  <Input
                    name="confirmPassword"
                    type="password"
                    label={t('signup.fields.confirm_password')}
                    placeholder={t('signup.fields.confirm_placeholder')}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                )}

                {error && (
                  <div className="p-3 rounded-button bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-texto-secundario">{t('login.remember_me')}</span>
                    </label>
                    <a href="#" className="text-laranja-energia hover:text-laranja-hover">
                      {t('login.forgot_password')}
                    </a>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Carregando...' : (isLogin ? t('login.button') : t('signup.button'))}
                </Button>

                <div className="text-center text-sm text-texto-secundario">
                  {isLogin ? t('login.no_account') : t('signup.has_account')}{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-laranja-energia hover:text-laranja-hover font-semibold"
                  >
                    {isLogin ? t('login.signup_link') : t('signup.login_link')}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
