'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Ear, HandMetal, UserPlus, LogIn, Lock, ShieldCheck } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import useStore from '@/store/useStore';

const FIREBASE_AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1';

function getFirebaseApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
}

function mapFirebaseAuthError(message: string): string {
  const code = message.toUpperCase();
  if (code.includes('EMAIL_EXISTS')) return 'This email is already registered. Try signing in.';
  if (code.includes('INVALID_EMAIL')) return 'Please enter a valid email address.';
  if (code.includes('WEAK_PASSWORD')) return 'Password is too weak. Use at least 8 characters.';
  if (code.includes('OPERATION_NOT_ALLOWED') || code.includes('EMAIL_PASSWORD_LOGIN_DISABLED')) {
    return 'Email/password sign-in is not enabled in Firebase. Please enable it in Firebase Authentication.';
  }
  return 'Could not create account. Please try again.';
}

async function firebaseRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) throw new Error('MISSING_API_KEY');

  const response = await fetch(`${FIREBASE_AUTH_BASE}/${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const errorCode = payload?.error?.message || 'UNKNOWN_ERROR';
    throw new Error(errorCode);
  }
  return payload as T;
}

export default function SplashPage() {
  const router = useRouter();
  const { loadFromStorage } = useStore();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isCreateAccount, setIsCreateAccount] = useState(true); // true = Create account, false = Sign in
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load stored profile on mount (no redirect — user must choose an option)
  React.useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Intentionally do not auto-redirect from splash.
  // Users should always land on sign in/sign up first.

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const safeName = name.trim() || normalizedEmail.split('@')[0];
    if (!normalizedEmail || !password) return;

    if (isCreateAccount) {
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }

      setSubmitting(true);
      try {
        const signUp = await firebaseRequest<{
          idToken: string;
        }>('accounts:signUp', {
          email: normalizedEmail,
          password,
          returnSecureToken: true,
        });

        if (safeName) {
          await firebaseRequest('accounts:update', {
            idToken: signUp.idToken,
            displayName: safeName,
            returnSecureToken: true,
          });
        }
        await firebaseRequest('accounts:sendOobCode', {
          requestType: 'VERIFY_EMAIL',
          idToken: signUp.idToken,
        });

        setAuthMessage('Verification email sent. Verify your email, then sign in.');
        setIsCreateAccount(false);
        setPassword('');
        setConfirmPassword('');
      } catch (error) {
        const message = (error as Error)?.message || 'UNKNOWN_ERROR';
        if (message === 'MISSING_API_KEY') {
          setAuthError('Firebase API key is missing. Check app environment variables.');
        } else {
          setAuthError(mapFirebaseAuthError(message));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email: normalizedEmail,
        password,
        name: safeName,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/onboarding');
        return;
      }

      setAuthError('Sign-in failed. Check your email/password and verify your email first.');
    } catch {
      setAuthError('Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = (createAccount: boolean) => {
    setAuthError('');
    setAuthMessage('');
    signIn('google', { callbackUrl: '/onboarding' });
  };

  return (
    <MobileFrame>
      <div className="flex flex-col items-center justify-center min-h-full px-8 py-12 bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
          <div className="absolute top-8 left-1/3 w-44 h-44 bg-white/25 rounded-full blur-3xl" />
          <div className="absolute bottom-12 right-1/4 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
        </div>

        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-sky-200/80 shadow-sm">
              <HandMetal size={32} className="text-sky-800" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 drop-shadow-sm">
            NearSign
          </h1>
          <p className="text-slate-800/90 text-base font-medium leading-relaxed max-w-xs drop-shadow-sm">
            Meet people who communicate like you.
          </p>
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 flex items-center justify-center gap-4 mb-10"
        >
          <div className="flex -space-x-3">
            {['from-sky-200/80 to-sky-100/50', 'from-sky-300/70 to-blue-100/50', 'from-cyan-200/60 to-sky-100/50'].map((bg, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${bg} ring-2 ring-white/80 flex items-center justify-center shadow-sm`}
              >
                {i === 0 && <span className="text-lg">🤟</span>}
                {i === 1 && <Ear size={18} className="text-sky-900" />}
                {i === 2 && <span className="text-lg">💬</span>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Auth Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 w-full space-y-3"
        >
          {!showEmailForm ? (
            <>
              <div className="flex rounded-2xl bg-white/50 border border-sky-200/60 p-1 gap-1 mb-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateAccount(true);
                    setAuthError('');
                    setAuthMessage('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isCreateAccount ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateAccount(false);
                    setAuthError('');
                    setAuthMessage('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isCreateAccount ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Sign in
                </button>
              </div>
              <button
                onClick={() => handleGoogleLogin(isCreateAccount)}
                className="w-full py-4 px-6 bg-white rounded-2xl font-semibold text-gray-800 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isCreateAccount ? 'Continue with Google' : 'Sign in with Google'}
              </button>

              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-4 px-6 bg-white/60 backdrop-blur-sm border border-sky-200/80 rounded-2xl font-semibold text-slate-800 flex items-center justify-center gap-3 hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                <Mail size={20} />
                {isCreateAccount ? 'Create account with Email' : 'Sign in with Email'}
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              {authMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                  <span>{authMessage}</span>
                </div>
              )}
              {authError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {authError}
                </div>
              )}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full py-3.5 px-5 bg-white/90 backdrop-blur-sm border border-sky-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full py-3.5 px-5 bg-white/90 backdrop-blur-sm border border-sky-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
              />
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={8}
                  className="w-full py-3.5 pl-10 pr-5 bg-white/90 backdrop-blur-sm border border-sky-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                />
              </div>
              {isCreateAccount && (
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    minLength={8}
                    className="w-full py-3.5 pl-10 pr-5 bg-white/90 backdrop-blur-sm border border-sky-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 bg-brand-gradient-accent rounded-2xl font-semibold text-white border border-white/25 shadow-md hover:brightness-[1.08] transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                {submitting
                  ? 'Please wait...'
                  : isCreateAccount
                    ? (
                      <>
                        <UserPlus size={20} className="inline mr-2" />
                        Create account
                      </>
                    )
                    : (
                      <>
                        <LogIn size={20} className="inline mr-2" />
                        Sign in
                      </>
                    )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setAuthError('');
                  setAuthMessage('');
                }}
                className="w-full py-2 text-slate-500 text-sm hover:text-sky-800 transition-colors"
              >
                Back to options
              </button>
            </form>
          )}
        </motion.div>

        {/* Accessibility note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 text-slate-500 text-xs text-center mt-8 max-w-xs leading-relaxed"
        >
          Designed with accessibility first. High-contrast mode, large tap targets, and no audio-only cues.
        </motion.p>
      </div>
    </MobileFrame>
  );
}
