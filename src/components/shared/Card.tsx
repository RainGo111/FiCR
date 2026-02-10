import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hover = false
}) => {
  const hoverClass = hover
    ? 'hover:shadow-glass-lg hover:-translate-y-1 transition-smooth hover-brighten'
    : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`glass rounded-2xl shadow-glass p-6 border border-white/20 ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
