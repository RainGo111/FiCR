import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  borderColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  borderColor = 'border-indigo-500',
}) => (
  <div className={`border-l-4 ${borderColor} pl-4`}>
    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
  </div>
);
