import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-700 border border-primary-200',
    secondary: 'bg-accent-100 text-accent-700 border border-accent-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-status-success-light text-status-success border border-green-200',
    warning: 'bg-status-warning-light text-status-warning border border-amber-200',
    danger: 'bg-status-danger-light text-status-danger border border-red-200',
    info: 'bg-status-info-light text-status-info border border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
