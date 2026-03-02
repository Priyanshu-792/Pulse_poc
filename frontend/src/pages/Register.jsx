import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { signUp } from '../lib/supabase';

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'People & Culture', 'Finance', 'Operations', 'Legal', 'Other'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: '', jobTitle: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.name, form.department, form.jobTitle);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={['name', 'email', 'password'].includes(key)}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pulse-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-pulse-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pulse-200 mb-3">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Join PULSE</h1>
          <p className="text-slate-500 text-sm mt-1">Set up your private coaching account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('name', 'Full name', 'text', 'Alex Johnson')}
            {field('email', 'Work email', 'email', 'alex@company.com')}
            {field('password', 'Password (min 8 chars)', 'password', '••••••••')}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <select
                className="input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {field('jobTitle', 'Job title (optional)', 'text', 'Senior Engineer')}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-pulse-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4 px-4">
          By creating an account, you agree that your sessions are private and confidential.
          Aggregated anonymized data may inform organizational insights.
        </p>
      </div>
    </div>
  );
}
