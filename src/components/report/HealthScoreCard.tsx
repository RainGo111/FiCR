import React from 'react';
import { Card } from '../shared';

interface HealthScoreCardProps {
  category: string;
  compliant: number;
  nonCompliant: number;
  icon?: React.ReactNode;
  accentColor?: string;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  category,
  compliant,
  nonCompliant,
  icon,
  accentColor = 'rose',
}) => {
  const total = compliant + nonCompliant;
  const rate = total > 0 ? parseFloat(((nonCompliant * 100) / total).toFixed(1)) : 0;
  const barColor = rate === 0 ? 'bg-emerald-500' : rate > 30 ? 'bg-rose-500' : `bg-${accentColor}-500`;
  const textColor = rate === 0 ? 'text-emerald-600' : rate > 30 ? 'text-rose-600' : `text-${accentColor}-600`;

  return (
    <Card className="border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{category}</span>
      </div>
      <div className={`text-xl font-bold font-mono ${textColor}`}>{rate}%</div>
      <div className="text-[11px] text-slate-500 mt-1">
        {nonCompliant} / {total} non-compliant
      </div>
      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </Card>
  );
};
