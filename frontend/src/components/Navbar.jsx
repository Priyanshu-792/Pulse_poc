import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Clock, BarChart2, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../lib/supabase';
import clsx from 'clsx';

export default function Navbar() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        location.pathname === to
          ? 'bg-pulse-50 text-pulse-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-pulse-600 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-lg tracking-tight">PULSE</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLink('/', 'Dashboard', LayoutDashboard)}
            {navLink('/history', 'My Sessions', Clock)}
            {profile?.role === 'ADMIN' && navLink('/admin', 'Insights', BarChart2)}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-pulse-100 rounded-full flex items-center justify-center text-pulse-700 font-semibold text-sm">
                {profile?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800 leading-none">{profile?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{profile?.role === 'ADMIN' ? 'Admin' : profile?.department || 'Employee'}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-800">{profile?.name}</p>
                  <p className="text-xs text-slate-500">{profile?.job_title}</p>
                </div>
                {profile?.role === 'ADMIN' && (
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 md:hidden" onClick={() => setMenuOpen(false)}>
                    <BarChart2 size={14} /> Insights
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
