import { useAuth } from '@/lib/AuthContext';
import AdminAnalytics from '@/pages/AdminAnalytics';
import DepartmentAnalytics from '@/pages/DepartmentAnalytics';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminAnalytics />;
  }

  return <DepartmentAnalytics />;
}
