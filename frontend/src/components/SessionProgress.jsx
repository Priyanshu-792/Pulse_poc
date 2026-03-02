import clsx from 'clsx';

const PHASES = [
  { key: 'CHECKIN',            label: 'Check-In',    minutes: 3 },
  { key: 'WORK_WORKLOAD',      label: 'Work',         minutes: 5 },
  { key: 'TEAM_CULTURE',       label: 'Team',         minutes: 4 },
  { key: 'GROWTH_ASPIRATIONS', label: 'Growth',       minutes: 4 },
  { key: 'CLOSING_ACTION',     label: 'Actions',      minutes: 4 },
];

export default function SessionProgress({ currentPhase }) {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-0">
        {PHASES.map((phase, idx) => {
          const isDone    = idx < currentIdx;
          const isActive  = idx === currentIdx;
          const isFuture  = idx > currentIdx;

          return (
            <div key={phase.key} className="flex items-center flex-1 min-w-0">
              {/* Step */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  isDone   && 'bg-pulse-600 text-white',
                  isActive && 'bg-pulse-600 text-white ring-4 ring-pulse-100',
                  isFuture && 'bg-slate-100 text-slate-400'
                )}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <p className={clsx(
                  'text-xs mt-1.5 font-medium hidden sm:block',
                  isActive ? 'text-pulse-600' : isDone ? 'text-pulse-500' : 'text-slate-400'
                )}>
                  {phase.label}
                </p>
                <p className={clsx('text-xs hidden sm:block', isActive ? 'text-slate-500' : 'text-slate-300')}>
                  {phase.minutes} min
                </p>
              </div>

              {/* Connector */}
              {idx < PHASES.length - 1 && (
                <div className={clsx(
                  'flex-1 h-0.5 mx-1 transition-colors',
                  idx < currentIdx ? 'bg-pulse-600' : 'bg-slate-200'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
