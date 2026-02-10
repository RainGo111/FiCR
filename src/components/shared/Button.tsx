import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
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
  const baseClasses = 'font-sans font-medium rounded-xl transition-film focus:outline-none focus:ring-2 focus:ring-offset-2 relative';

  const variantClasses = {
    primary: 'bg-primary-600 bg-film-grain-dark text-film-paper shadow-film-soft hover:shadow-film-medium hover-film-darken focus:ring-primary-500 disabled:bg-primary-300 disabled:opacity-60',
    secondary: 'bg-accent-500 bg-film-grain-dark text-film-paper shadow-film-soft hover:shadow-film-medium hover-film-darken focus:ring-accent-400 disabled:bg-accent-300 disabled:opacity-60',
    outline: 'bg-film-paper border-2 border-primary-600 text-primary-700 hover:border-primary-700 hover:shadow-film-soft focus:ring-primary-500 disabled:border-neutral-400 disabled:text-neutral-400 disabled:opacity-60'
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};
