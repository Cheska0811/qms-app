import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/lib/query-client'
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const DataEntry = lazy(() => import('./pages/DataEntry'));
const DepartmentAnalytics = lazy(() => import('./pages/DepartmentAnalytics'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const Departments = lazy(() => import('./pages/Departments'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const KPIOverview = lazy(() => import('./pages/KPIOverview'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

function RouteFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
    </div>
  );
}

const ProtectedRoutes = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/department-analytics" element={<DepartmentAnalytics />} />
          <Route path="/admin-analytics" element={<AdminAnalytics />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/manage-users" element={<ManageUsers />} />
          <Route path="/kpi-overview" element={<KPIOverview />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

const PublicRoutes = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Suspense>
  );
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <ProtectedRoutes /> : <PublicRoutes />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
