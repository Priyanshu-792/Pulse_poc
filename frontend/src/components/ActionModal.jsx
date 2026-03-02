import { useState } from 'react';
import { Plus, Trash2, CheckCircle, X, Bell } from 'lucide-react';

export default function ActionModal({ onConfirm, onCancel, messages }) {
  const [actions,        setActions]        = useState([{ text: '', dueDate: '' }]);
  const [notifyManager,  setNotifyManager]  = useState(false);

  // Suggest actions from the last few messages
  const suggestions = extractActionSuggestions(messages);

  const addAction   = () => setActions([...actions, { text: '', dueDate: '' }]);
  const removeAction = (i) => setActions(actions.filter((_, idx) => idx !== i));
  const updateAction = (i, field, value) =>
    setActions(actions.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const useSuggestion = (text) => {
    const empty = actions.findIndex((a) => !a.text.trim());
    if (empty >= 0) updateAction(empty, 'text', text);
    else setActions([...actions, { text, dueDate: '' }]);
  };

  const handleConfirm = () => {
    const valid = actions.filter((a) => a.text.trim());
    onConfirm(
      valid.map((a) => ({ text: a.text.trim(), dueDate: a.dueDate || null })),
      notifyManager
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Your Action Commitments</h2>
            <p className="text-sm text-slate-500 mt-0.5">What will you commit to doing in the next 2 weeks?</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Suggestions from session */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Suggestions from your session:</p>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => useSuggestion(s)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg bg-pulse-50 text-pulse-700 hover:bg-pulse-100 transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action inputs */}
          <div className="space-y-3">
            {actions.map((action, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input
                    className="input text-sm"
                    placeholder={`Action ${i + 1} (e.g., Schedule a 1:1 with my manager)`}
                    value={action.text}
                    onChange={(e) => updateAction(i, 'text', e.target.value)}
                  />
                  <input
                    type="date"
                    className="input text-sm text-slate-500"
                    value={action.dueDate}
                    onChange={(e) => updateAction(i, 'dueDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {actions.length > 1 && (
                  <button onClick={() => removeAction(i)} className="mt-2 p-1.5 hover:bg-red-50 text-red-400 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {actions.length < 3 && (
            <button onClick={addAction} className="flex items-center gap-1.5 text-sm text-pulse-600 hover:text-pulse-700">
              <Plus size={14} /> Add another action
            </button>
          )}
        </div>

        {/* Manager notification consent */}
        <div className="px-6 pb-4">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none
              ${notifyManager
                ? 'border-pulse-400 bg-pulse-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            onClick={() => setNotifyManager(!notifyManager)}
          >
            {/* Custom checkbox */}
            <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors
              ${notifyManager ? 'bg-pulse-600 border-pulse-600' : 'border-slate-300 bg-white'}`}>
              {notifyManager && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Bell size={13} className={notifyManager ? 'text-pulse-600' : 'text-slate-400'} />
                <span className={`text-sm font-medium ${notifyManager ? 'text-pulse-700' : 'text-slate-700'}`}>
                  Notify my manager about this session
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                A summarized report (no verbatim transcript) will be sent to your manager.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <CheckCircle size={16} /> Complete Session
          </button>
        </div>
      </div>
    </div>
  );
}

function extractActionSuggestions(messages) {
  // Look for action-like phrases in the closing PULSE messages
  const closingMessages = messages
    .filter((m) => m.role === 'assistant')
    .slice(-5)
    .map((m) => m.content);

  const suggestions = new Set();
  const patterns = [
    /(?:could|might|consider|try|commit to|action.*?:?\s*)([\w\s,]+(?:with|to|on|for|by|at)[\w\s]+)/gi,
    /micro.?action[s]?:?\s*([^.!?\n]+)/gi,
    /(?:1[.\-)]|first action)[:\s]+([^.!?\n]+)/gi,
    /(?:2[.\-)]|second action)[:\s]+([^.!?\n]+)/gi,
  ];

  for (const text of closingMessages) {
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const suggestion = match[1]?.trim();
        if (suggestion && suggestion.length > 10 && suggestion.length < 120) {
          suggestions.add(capitalize(suggestion));
        }
      }
    }
  }

  return [...suggestions].slice(0, 3);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
