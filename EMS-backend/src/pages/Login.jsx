import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NAVY = '#1E2370';
const RED = '#CC1B1B';

function TorresIcon({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill={RED} />
      <circle cx="50" cy="50" r="34" fill="white" />
      <rect x="22" y="30" width="56" height="16" rx="2" fill={RED} />
      <rect x="28" y="46" width="16" height="28" rx="2" fill={RED} />
      <rect x="56" y="46" width="16" height="28" rx="2" fill={RED} />
    </svg>
  );
}

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #eaeaf2 0%, #dcdcee 40%, #e5e5f0 100%)' }}
      />

      {/* Floating circles */}
      <div className="absolute rounded-full animate-blob"
        style={{ width: 180, height: 180, background: RED, top: '-5%', left: '5%', opacity: 0.1 }} />
      <div className="absolute rounded-full animate-blob animation-delay-2000"
        style={{ width: 120, height: 120, background: NAVY, bottom: '5%', left: '2%', opacity: 0.1 }} />
      <div className="absolute rounded-full animate-blob animation-delay-4000"
        style={{ width: 140, height: 140, background: RED, top: '10%', right: '2%', opacity: 0.1 }} />
      <div className="absolute rounded-full animate-blob"
        style={{ width: 100, height: 100, background: NAVY, bottom: '5%', right: '5%', opacity: 0.1, animationDelay: '1s' }} />

      {/* KPI bars decoration */}
      <div className="absolute bottom-5 left-5 flex items-end gap-1.5 opacity-15">
        {[30, 50, 40, 65, 45, 55].map((height, index) => (
          <div key={index} style={{ width: 10, height, background: NAVY, borderRadius: '3px 3px 0 0' }} />
        ))}
      </div>

      {/* Main grid */}
      <div className="relative z-10 grid w-full max-w-[860px] gap-6 lg:grid-cols-2">

        {/* Left info card */}
        <div
          className="flex flex-col justify-start rounded-[20px] p-8"
          style={{ background: 'rgba(255,255,255,0.90)', border: '0.5px solid rgba(30,35,112,0.12)', backdropFilter: 'blur(12px)' }}
        >
          {/* Logo row */}
          <div className="mb-5 flex items-center gap-3">
            <TorresIcon size={52} />
            <div>
              <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 20, color: NAVY, letterSpacing: '0.08em', lineHeight: 1.15 }}>
                TORRES
              </div>
              <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 20, color: NAVY, letterSpacing: '0.08em', lineHeight: 1.15 }}>
                TECH
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, letterSpacing: '0.02em' }}>
                Technology Center Corporation
              </div>
            </div>
          </div>

          {/* QMS KPI Portal badge */}
          <div
            className="mb-4 inline-flex w-fit items-center gap-2"
            style={{ border: '0.5px solid rgba(204,27,27,0.3)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 500, color: '#333', background: 'rgba(255,255,255,0.7)' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED, display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite' }} />
            QMS KPI Portal
          </div>

          {/* Red accent line */}
          <div style={{ width: 36, height: 3, background: RED, borderRadius: 2, marginBottom: 16 }} />

          <h1 className="mb-3 text-[22px] font-bold leading-snug" style={{ color: '#484fb1' }}>
            Local sign in for your KPI monitoring workspace.
          </h1>
          <p className="text-[13px] leading-relaxed" style={{ color: '#1E2370#555580' }}>
            Sign in using your credentials to access the KPI management dashboard.
          </p>
        </div>

        {/* Right login card */}
        <Card
          className="w-full rounded-[20px] shadow-none"
          style={{ background: 'rgba(255,255,255,0.95)', border: '0.5px solid rgba(30,35,112,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-[26px] font-normal" style={{ color: '#484fb1' }}>Log in</CardTitle>
            <CardDescription className="text-[13px]" style={{ color: '#1E2370' }}>
              Enter your local account credentials to open the dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  autoComplete="off"
                  className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100"
                  style={{ borderRadius: 10 }}
                />
              </div>

              {/* Password with show/hide toggle */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="off"
                    className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100 pr-11"
                    style={{ borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <Button
                type="submit"
                disabled={submitting}
                className="mt-1 h-11 w-full text-sm font-semibold transition-colors"
                style={{ background: submitting ? '#a81515' : RED, color: '#fff', borderRadius: 10, border: 'none' }}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm" style={{ color: '#555580' }}>
              No account yet?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: RED }}>
                Create one here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -50px) scale(1.1); }
          66%       { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}