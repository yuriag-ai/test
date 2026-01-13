import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

const languages = [
  { code: 'pt-BR', label: '🇧🇷 PT', fullLabel: 'Português' },
  { code: 'en', label: '🇺🇸 EN', fullLabel: 'English' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2 rounded-button bg-cinza-claro p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`px-3 py-1.5 rounded-button text-sm font-medium transition-all duration-200 ${
            i18n.language === lang.code
              ? 'bg-white text-laranja-energia shadow-sm'
              : 'text-texto-secundario hover:text-texto-principal'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
