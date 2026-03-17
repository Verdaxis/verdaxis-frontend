import { useParams } from 'react-router-dom';

export function useLocalePath() {
  const { lang } = useParams<{ lang: string }>();
  return (path: string) => `/${lang || 'en'}${path.startsWith('/') ? path : `/${path}`}`;
}
