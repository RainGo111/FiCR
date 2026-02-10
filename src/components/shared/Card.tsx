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
    ? 'hover:shadow-film-medium hover:-translate-y-0.5 transition-film hover-film-brighten'
    : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`bg-film-paper bg-film-grain-medium rounded-2xl shadow-film-soft p-6 ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
