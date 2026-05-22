import React, { useState } from 'react';
import { authService } from '../services/api';
import { LogIn, UserPlus, Shield, Eye, EyeOff, AlertCircle, CheckCircle, Wind } from 'lucide-react';

const LoginRegister = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setError('');
    setSuccess('');
  };

  const handleTabChange = (loginTab) => {
    setIsLogin(loginTab);
    clearForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await authService.login(email, password);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 1000);
      } else {
        await authService.register(name, email, password, role);
        setSuccess('Registration successful! You can now log in.');
        setTimeout(() => {
          setIsLogin(true);
          setPassword('');
          setError('');
          setSuccess('');
        }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden px-4 py-16"
      style={{ background: 'var(--onyx, #080809)' }}
    >
      {/* ── Organic blob decorations ── */}
      <div
        className="cy-blob"
        style={{
          position: 'absolute',
          top: '-80px',
          left: '-80px',
          width: '420px',
          height: '420px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        className="cy-blob"
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-60px',
          width: '320px',
          height: '320px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Enormous Display Headline ── */}
      <div className="relative z-10 text-center mb-10 select-none">
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            color: '#F5E642',
            textShadow: '0 0 60px rgba(245,230,66,0.3)',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          AIR QUALITY
        </h1>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            color: '#F5E642',
            textShadow: '0 0 60px rgba(245,230,66,0.3)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          INTELLIGENCE
        </h1>
        <p
          className="mt-4 text-xs uppercase tracking-[0.2em]"
          style={{ color: 'rgba(232,232,236,0.4)', fontFamily: "'Inter', sans-serif" }}
        >
          HSE Construction Safety Platform
        </p>
      </div>

      {/* ── Glassmorphic Card ── */}
      <div
        className="cy-glass relative z-10 w-full"
        style={{
          maxWidth: '420px',
          padding: '48px',
          borderRadius: '24px',
          border: '1px solid rgba(245,230,66,0.12)',
        }}
      >
        {/* Wind icon logo */}
        <div className="flex justify-center mb-8">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(245,230,66,0.1)',
              border: '1px solid rgba(245,230,66,0.2)',
              boxShadow: '0 0 20px rgba(245,230,66,0.12)',
            }}
          >
            <Wind size={26} style={{ color: '#F5E642' }} />
          </div>
        </div>

        {/* ── Pill Tab Toggle ── */}
        <div
          className="flex mb-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '9999px',
            padding: '4px',
            border: '1px solid rgba(245,230,66,0.08)',
          }}
        >
          <button
            onClick={() => handleTabChange(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all duration-300"
            style={{
              borderRadius: '9999px',
              background: isLogin ? '#F5E642' : 'transparent',
              color: isLogin ? '#080809' : 'rgba(232,232,236,0.45)',
              boxShadow: isLogin ? '0 0 18px rgba(245,230,66,0.35)' : 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <LogIn size={15} />
            Login
          </button>
          <button
            onClick={() => handleTabChange(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all duration-300"
            style={{
              borderRadius: '9999px',
              background: !isLogin ? '#F5E642' : 'transparent',
              color: !isLogin ? '#080809' : 'rgba(232,232,236,0.45)',
              boxShadow: !isLogin ? '0 0 18px rgba(245,230,66,0.35)' : 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
            Register
          </button>
        </div>

        {/* Card sub-heading */}
        <div className="text-center mb-7">
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '1.35rem',
              color: 'rgba(232,232,236,0.95)',
              margin: 0,
            }}
          >
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p
            className="mt-1.5 text-xs"
            style={{ color: 'rgba(232,232,236,0.38)', fontFamily: "'Inter', sans-serif" }}
          >
            {isLogin
              ? 'Enter your credentials to access the HSE dashboard'
              : 'Sign up to monitor, predict and download reports'}
          </p>
        </div>

        {/* ── Status Notifications ── */}
        {error && (
          <div
            className="mb-5 flex items-start gap-3 text-sm"
            style={{
              background: 'rgba(127,0,0,0.28)',
              border: '1px solid rgba(220,50,50,0.25)',
              color: '#fca5a5',
              borderRadius: '9999px',
              padding: '12px 18px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            className="mb-5 flex items-start gap-3 text-sm"
            style={{
              background: 'rgba(0,80,40,0.30)',
              border: '1px solid rgba(52,211,153,0.22)',
              color: '#6ee7b7',
              borderRadius: '9999px',
              padding: '12px 18px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <CheckCircle size={16} style={{ color: '#34d399', flexShrink: 0, marginTop: '1px' }} />
            <span>{success}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <label
                className="block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(232,232,236,0.5)', fontFamily: "'Inter', sans-serif" }}
              >
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="cy-input py-3 px-5 w-full text-sm rounded-full"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label
              className="block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(232,232,236,0.5)', fontFamily: "'Inter', sans-serif" }}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="engineer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cy-input py-3 px-5 w-full text-sm rounded-full"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(232,232,236,0.5)', fontFamily: "'Inter', sans-serif" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cy-input py-3 px-5 w-full text-sm rounded-full pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(232,232,236,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(232,232,236,0.5)', fontFamily: "'Inter', sans-serif" }}
              >
                <Shield size={12} style={{ color: '#F5E642' }} />
                Access Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className="py-2.5 text-sm font-semibold transition-all duration-200 rounded-full"
                  style={{
                    border: role === 'user' ? '1.5px solid #F5E642' : '1.5px solid rgba(245,230,66,0.15)',
                    background: role === 'user' ? 'rgba(245,230,66,0.1)' : 'rgba(255,255,255,0.03)',
                    color: role === 'user' ? '#F5E642' : 'rgba(232,232,236,0.4)',
                    boxShadow: role === 'user' ? '0 0 12px rgba(245,230,66,0.2)' : 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Civil Engineer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className="py-2.5 text-sm font-semibold transition-all duration-200 rounded-full"
                  style={{
                    border: role === 'admin' ? '1.5px solid #F5E642' : '1.5px solid rgba(245,230,66,0.15)',
                    background: role === 'admin' ? 'rgba(245,230,66,0.1)' : 'rgba(255,255,255,0.03)',
                    color: role === 'admin' ? '#F5E642' : 'rgba(232,232,236,0.4)',
                    boxShadow: role === 'admin' ? '0 0 12px rgba(245,230,66,0.2)' : 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  HSE Director
                </button>
              </div>
            </div>
          )}

          {/* ── Submit Button ── */}
          <button
            type="submit"
            disabled={loading}
            className="cy-btn-primary w-full py-3.5 text-base rounded-full flex items-center justify-center gap-2 mt-2 transition-all duration-300"
            style={{
              background: loading ? 'rgba(245,230,66,0.5)' : '#F5E642',
              color: '#080809',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 28px rgba(245,230,66,0.4)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(8,8,9,0.3)', borderTopColor: '#080809' }}
              />
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginRegister;
