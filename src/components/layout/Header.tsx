import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { t } = useTranslation('common');
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Dumbbell className="h-8 w-8 text-laranja-energia" />
          <span className="text-2xl font-montserrat font-black text-navy-confianca">
            TreinaÍ
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-texto-principal hover:text-laranja-energia transition-colors"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/comunidade"
            className="text-sm font-medium text-texto-principal hover:text-laranja-energia transition-colors"
          >
            Comunidade
          </Link>
          {user && (
            <>
              <Link
                to="/gerar-treino"
                className="text-sm font-medium text-texto-principal hover:text-laranja-energia transition-colors"
              >
                {t('nav.generate')}
              </Link>
              <Link
                to="/meus-treinos"
                className="text-sm font-medium text-texto-principal hover:text-laranja-energia transition-colors"
              >
                {t('nav.my_workouts')}
              </Link>
              <Link
                to="/progresso"
                className="text-sm font-medium text-texto-principal hover:text-laranja-energia transition-colors"
              >
                Progresso
              </Link>
            </>
          )}
          <Link
            to="/premium"
            className="text-sm font-medium text-laranja-energia hover:text-laranja-hover transition-colors"
          >
            ⭐ Premium
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <LanguageSwitcher />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-texto-secundario">
                {user.user_metadata?.name || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" size="sm">
                  {t('nav.signup')}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden rounded-md p-2 text-texto-principal"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white p-4">
          <div className="flex flex-col gap-4">
            <Link
              to="/"
              className="text-base font-medium text-texto-principal hover:text-laranja-energia"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.home')}
            </Link>
            {user && (
              <>
                <Link
                  to="/gerar-treino"
                  className="text-base font-medium text-texto-principal hover:text-laranja-energia"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.generate')}
                </Link>
                <Link
                  to="/meus-treinos"
                  className="text-base font-medium text-texto-principal hover:text-laranja-energia"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.my_workouts')}
                </Link>
              </>
            )}
            <div className="pt-4 border-t">
              <LanguageSwitcher />
            </div>
            <div className="flex flex-col gap-2">
              {user ? (
                <>
                  <span className="text-sm text-texto-secundario">
                    {user.user_metadata?.name || user.email}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      {t('nav.signup')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
