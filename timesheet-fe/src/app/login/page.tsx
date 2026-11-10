import { getTranslations } from 'next-intl/server';
import LoginForm from './LoginForm';
export default async function LoginPage() {
  const t = await getTranslations('Login');
  return <main className="login-page"><section className="card narrow"><h1>{t('title')}</h1><LoginForm /></section></main>;
}
