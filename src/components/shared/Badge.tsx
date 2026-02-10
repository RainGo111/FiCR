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
    primary: 'bg-primary-100 text-primary-800 border-primary-300',
    secondary: 'bg-film-sand text-secondary-800 border-film-stone',
    neutral: 'bg-film-cream text-neutral-800 border-film-sand',
    success: 'bg-green-50 text-green-800 border-green-300',
    warning: 'bg-accent-100 text-accent-800 border-accent-300'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-sans font-medium border shadow-film-soft ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
