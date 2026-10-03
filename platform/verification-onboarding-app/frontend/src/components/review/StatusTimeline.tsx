import React from 'react';

interface StatusTimelineProps {
  steps: {
    title: string;
    description?: string;
    timestamp?: string;
    completed: boolean;
    current?: boolean;
    failed?: boolean;
  }[];
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        return (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.failed
                    ? 'bg-rose-500 text-white'
                    : step.completed
                    ? 'bg-emerald-500 text-white'
                    : step.current
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step.failed ? '✕' : step.completed ? '✓' : idx + 1}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-10 ${
                    step.completed ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 pb-4">
              <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
              {step.description && (
                <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
              )}
              {step.timestamp && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
