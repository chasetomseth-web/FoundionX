'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  // Track refresh attempts to prevent infinite loops
  const refreshAttempts = useRef(0);
  const MAX_REFRESH_ATTEMPTS = 3;

  // Proactive token refresh: refresh 60s before expiry
  const scheduleTokenRefresh = useCallback((currentSession: any) => {
    if (!currentSession?.expires_at) return;
    const expiresAt = currentSession.expires_at * 1000; // convert to ms
    const now = Date.now();
    const refreshIn = expiresAt - now - 60_000; // 60s before expiry

    if (refreshIn <= 0) {
      // Already expired or about to expire — refresh immediately
      supabase.auth.refreshSession().catch(() => {});
      return;
    }

    const timer = setTimeout(async () => {
      if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) return;
      refreshAttempts.current += 1;
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        refreshAttempts.current = 0;
      }
    }, refreshIn);

    return () => clearTimeout(timer);
  }, [supabase]);

  useEffect(() => {
    let refreshCleanup: (() => void) | undefined;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Session retrieval failed — clear state and redirect to login
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) {
        refreshCleanup = scheduleTokenRefresh(session);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (refreshCleanup) refreshCleanup();

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshAttempts.current = 0;
        if (session) {
          refreshCleanup = scheduleTokenRefresh(session);
        }
      }

      if (event === 'SIGNED_OUT') {
        refreshAttempts.current = 0;
        // Only redirect if currently on a protected page
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const isPublic = path.startsWith('/sign-up-login-screen') || path.startsWith('/auth/');
          if (!isPublic) {
            router.push('/sign-up-login-screen');
          }
        }
      }

      // Handle expired session — attempt recovery
      if (event === 'TOKEN_REFRESHED' && !session) {
        if (refreshAttempts.current < MAX_REFRESH_ATTEMPTS) {
          refreshAttempts.current += 1;
          supabase.auth.refreshSession().catch(() => {});
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshCleanup) refreshCleanup();
    };
  }, [scheduleTokenRefresh]);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || ''
        },
        emailRedirectTo: `${SITE_URL}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Google OAuth Sign In — always uses production SITE_URL for redirect
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  };

  // Sign Out — clears session and redirects
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push('/sign-up-login-screen');
  };

  // Get Current User (server-verified)
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  // Force session refresh (for expired session recovery)
  const refreshSession = async () => {
    if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
      await signOut();
      return null;
    }
    refreshAttempts.current += 1;
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      await signOut();
      return null;
    }
    refreshAttempts.current = 0;
    return data.session;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
