import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getProfile } from '../lib/supabase';

const AuthContext = createContext(null);

// ─── TEMP DEV BYPASS — flip DEV_BYPASS to false when Supabase is back up ─────
const DEV_BYPASS = true;

// Auto-detects role from URL — no code change needed to switch views:
//   localhost:5174/        →  Priyanshu  (employee coaching dashboard)
//   localhost:5174/admin   →  Vinay      (manager / org insights dashboard)
const DEV_ROLE = window.location.pathname.startsWith('/admin') ? 'admin' : 'employee';

const MOCK_USERS = {
  employee: { id: 'dev-user-001', email: 'priyanshu@pulse.com' },
  admin:    { id: 'dev-user-002', email: 'vinay@pulse.com' },
};

const MOCK_PROFILES = {
  employee: { id: 'dev-user-001', name: 'Priyanshu', role: 'EMPLOYEE', department: 'Engineering', job_title: 'Software Engineer' },
  admin:    { id: 'dev-user-002', name: 'Vinay',      role: 'ADMIN',   department: 'Leadership',  job_title: 'Engineering Manager' },
};

const MOCK_USER    = MOCK_USERS[DEV_ROLE]    ?? MOCK_USERS.employee;
const MOCK_PROFILE = MOCK_PROFILES[DEV_ROLE] ?? MOCK_PROFILES.employee;
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(DEV_BYPASS ? MOCK_USER    : null);
  const [profile, setProfile] = useState(DEV_BYPASS ? MOCK_PROFILE : null);
  const [loading, setLoading] = useState(DEV_BYPASS ? false        : true);

  const loadProfile = async (userId) => {
    const { data } = await getProfile(userId);
    setProfile(data);
  };

  useEffect(() => {
    if (DEV_BYPASS) return; // Skip all Supabase calls during dev bypass

    // Safety timeout — if Supabase hangs for any reason, stop loading after 5s
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Initial session check
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
        else setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('Supabase getSession error:', err);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = () => user && loadProfile(user.id);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
