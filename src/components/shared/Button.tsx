import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const baseClasses = 'font-sans font-medium rounded-xl transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 relative';

  const variantClasses = {
    primary: 'bg-gradient-primary text-white shadow-soft hover:shadow-medium gradient-hover focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-gradient-secondary text-white shadow-soft hover:shadow-medium gradient-hover focus:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'glass border-2 border-gradient-primary-start text-primary-700 hover:border-accent-600 hover:shadow-soft focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:ring-slate-400 disabled:opacity-50'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};
