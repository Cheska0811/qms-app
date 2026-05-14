import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/lib/AuthContext';

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="min-h-screen pl-16 md:pl-64">
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
