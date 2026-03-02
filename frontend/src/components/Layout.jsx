import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        PULSE © {new Date().getFullYear()} · All sessions are private and confidential
      </footer>
    </div>
  );
}
