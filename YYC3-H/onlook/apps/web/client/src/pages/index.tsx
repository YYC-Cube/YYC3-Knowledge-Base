import { useTranslation } from 'react-i18next';
import '../../i18n';

export default function Home() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => { void i18n.changeLanguage('en'); }}>{t('english')}</button>
      <button onClick={() => { void i18n.changeLanguage('zh'); }}>{t('chinese')}</button>
    </div>
  );
}