import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import serverApi from '@/api/serverClient';
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

export default function Register() {
  // ✅ Use register() from AuthContext — it calls registerServerUser()
  // which saves to backend AND auto-sets the user session in one step.
  // No need to call login() separately after.
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    department_name: '',
    department_head: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // --- Client-side validation ---
    if (
      !form.department_name.trim() ||
      !form.department_head.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Find or create the department in the backend
      let department = null;

      try {
        const existing = await serverApi.entities.Department.list();
        const normalized = form.department_name.trim().toLowerCase();
        department = existing.find((d) => d.name.trim().toLowerCase() === normalized) ?? null;
      } catch {
        // No departments yet — will create below
      }

      if (!department) {
        const code =
          form.department_name
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('')
            .slice(0, 6) || 'DEPT';

        department = await serverApi.entities.Department.create({
          name: form.department_name.trim(),
          code,
          description: `${form.department_name.trim()} department`,
          head: form.department_head.trim(),
          status: 'active',
          headcount: 1,
        });
      }

      // Step 2: Call AuthContext register() — this calls registerServerUser()
      // on the backend (/api/auth/register), saves the user to SQLite,
      // then sets user + isAuthenticated = true in context automatically.
      await register({
        department_name: department.name,
        department_head: form.department_head.trim(),
        department_id: department.id,
        email: form.email.trim(),
        password: form.password,
      });

      // Step 3: Navigate to dashboard — user is already logged in
      navigate('/', { replace: true });

    } catch (err) {
      // Backend errors (e.g. "Email already registered") surface here
      setError(err.message || 'Registration failed. Please try again.');
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
          <div
            key={index}
            style={{ width: 10, height, background: NAVY, borderRadius: '3px 3px 0 0' }}
          />
        ))}
      </div>

      {/* Main two-column grid */}
      <div className="relative z-10 grid w-full max-w-[860px] gap-6 lg:grid-cols-2">

        {/* Left info card */}
        <div
          className="flex flex-col justify-start rounded-[20px] p-8"
          style={{
            background: 'rgba(255,255,255,0.90)',
            border: '0.5px solid rgba(30,35,112,0.12)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Logo */}
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
            style={{
              border: '0.5px solid rgba(204,27,27,0.3)',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 500,
              color: '#333',
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: RED, display: 'inline-block',
              animation: 'dotPulse 2s ease-in-out infinite',
            }} />
            QMS KPI Portal
          </div>

          {/* Red accent line */}
          <div style={{ width: 36, height: 3, background: RED, borderRadius: 2, marginBottom: 16 }} />

          <h1 className="mb-3 text-[22px] font-bold leading-snug" style={{ color: '#0e1140' }}>
            Create your department account.
          </h1>
          <p className="text-[13px] leading-relaxed" style={{ color: '#555580' }}>
            Register your department to start monitoring and managing KPI metrics on the dashboard.
          </p>

          {/* Steps */}
          <div className="mt-6 space-y-3">
            {[
              'Enter your department name and head.',
              'Set your email and password.',
              'Click Register — you\'ll be logged in automatically.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: RED }}
                >
                  {i + 1}
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: '#555580', marginTop: 3 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right registration card */}
        <Card
          className="w-full rounded-[20px] shadow-none"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '0.5px solid rgba(30,35,112,0.12)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-[26px] font-normal" style={{ color: '#0e1140' }}>
              Create Account
            </CardTitle>
            <CardDescription className="text-[13px]" style={{ color: '#555580' }}>
              Register your department to access the KPI dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Department Name */}
              <div className="space-y-1.5">
                <Label htmlFor="department_name" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Department
                </Label>
                <Input
                  id="department_name"
                  value={form.department_name}
                  onChange={handleChange('department_name')}
                  placeholder="e.g. IT Department"
                  autoComplete="off"
                  className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100"
                  style={{ borderRadius: 10 }}
                />
              </div>

              {/* Department Head */}
              <div className="space-y-1.5">
                <Label htmlFor="department_head" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Name of Department Head
                </Label>
                <Input
                  id="department_head"
                  value={form.department_head}
                  onChange={handleChange('department_head')}
                  placeholder="Enter department head name"
                  autoComplete="off"
                  className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100"
                  style={{ borderRadius: 10 }}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="department@example.com"
                  autoComplete="off"
                  className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100"
                  style={{ borderRadius: 10 }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange('password')}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100 pr-11"
                    style={{ borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold" style={{ color: '#0e1140' }}>
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="h-11 border-slate-200 focus:border-red-600 focus:ring-red-100 pr-11"
                    style={{ borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="mt-1 h-11 w-full text-sm font-semibold transition-colors"
                style={{
                  background: submitting ? '#a81515' : RED,
                  color: '#fff',
                  borderRadius: 10,
                  border: 'none',
                }}
              >
                {submitting ? 'Creating account...' : 'Register'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm" style={{ color: '#555580' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: RED }}>
                Back to login
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