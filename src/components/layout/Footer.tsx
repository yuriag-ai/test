import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Dumbbell, Github, Twitter, Instagram } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-navy-confianca text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Logo and tagline */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-8 w-8 text-laranja-energia" />
              <span className="text-2xl font-montserrat font-black">TreinaÍ</span>
            </Link>
            <p className="text-cinza-medio mb-4">{t('footer.tagline')}</p>
            <LanguageSwitcher />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-montserrat font-bold mb-4">Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-cinza-medio hover:text-white transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/gerar-treino" className="text-cinza-medio hover:text-white transition-colors">
                  {t('nav.generate')}
                </Link>
              </li>
              <li>
                <Link to="/meus-treinos" className="text-cinza-medio hover:text-white transition-colors">
                  {t('nav.my_workouts')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-montserrat font-bold mb-4">Social</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-cinza-medio hover:text-laranja-energia transition-colors"
                aria-label="Github"
              >
                <Github className="h-6 w-6" />
              </a>
              <a
                href="#"
                className="text-cinza-medio hover:text-laranja-energia transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href="#"
                className="text-cinza-medio hover:text-laranja-energia transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-navy-light pt-8">
          <p className="text-center text-sm text-cinza-medio">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
