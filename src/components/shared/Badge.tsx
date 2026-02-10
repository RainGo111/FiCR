import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-gradient-primary-start to-gradient-primary-end text-white',
    secondary: 'bg-gradient-to-r from-gradient-secondary-start to-gradient-secondary-end text-white',
    neutral: 'glass border border-white/20 text-primary-700',
    success: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
    warning: 'bg-gradient-to-r from-gradient-warm-start to-gradient-warm-mid text-white'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-sans font-medium shadow-soft ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
