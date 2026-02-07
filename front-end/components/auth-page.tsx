'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, MessageCircle, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength += 25;
    if (pwd.length >= 10) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10;
    return Math.min(strength, 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 4);
      if (digits.length === 4) {
        setOtp(digits.split(''));
        setSuccess('OTP pasted successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError('Invalid OTP format. Please paste a 4-digit code.');
        setTimeout(() => setError(''), 2000);
      }
    } catch (err) {
      setError('Failed to paste. Please enter manually.');
      setTimeout(() => setError(''), 2000);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const token = otp.join('');
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColor = passwordStrength < 40 ? 'bg-red-500' : passwordStrength < 70 ? 'bg-yellow-500' : 'bg-green-500';
  const strengthText = passwordStrength < 40 ? 'Weak' : passwordStrength < 70 ? 'Medium' : 'Strong';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: fullName },
            emailRedirectTo: `${window.location.origin}`,
          },
        });
        if (signUpError) throw signUpError;
        setSuccess('Check your email for the 4-digit verification code!');
        setMode('verify');
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setSuccess('Password reset email sent!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-2xl mb-6 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Shakira Messaging</h1>
          <p className="text-gray-600 text-lg">Connect with anyone, anywhere</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
          {mode !== 'verify' && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-slide-up">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm animate-slide-up">
              {success}
            </div>
          )}

          {mode === 'verify' ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Verify Your Email</h3>
                <p className="text-sm text-[var(--text-secondary)]">Enter the 4-digit code sent to {email}</p>
              </div>

              <div className="flex gap-2 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={handlePaste}
                className="w-full py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border)]"
              >
                📋 Paste Code
              </button>

              <button
                onClick={verifyOtp}
                disabled={loading || otp.some(d => !d)}
                className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button
                onClick={() => setMode('signup')}
                className="w-full text-sm text-[var(--accent)] hover:underline"
              >
                Back to signup
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all outline-none"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {mode === 'signup' && password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--text-secondary)]">Password Strength</span>
                      <span className={`text-xs font-medium ${passwordStrength < 40 ? 'text-red-500' : passwordStrength < 70 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {strengthText} ({passwordStrength}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strengthColor} transition-all duration-300`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Sign In' : 'Send Reset Link'}
            </button>
          </form>
          )}

          {mode === 'login' && (
            <button
              onClick={() => setMode('reset')}
              className="w-full mt-4 text-sm text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </button>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => setMode('login')}
              className="w-full mt-4 text-sm text-[var(--accent)] hover:underline"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
