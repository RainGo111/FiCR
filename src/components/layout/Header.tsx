import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/documentation', label: 'Documentation' },
  { path: '/query-lab', label: 'Query Lab' },
  { path: '/demo', label: 'Demo' }
];

export const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-film-cream/95 backdrop-blur-md border-b border-film-sand sticky top-0 z-50 shadow-film-soft bg-film-grain-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3 transition-film hover-film-darken">
            <div className="bg-gradient-to-br from-accent-500 to-accent-600 p-2 rounded-xl shadow-film-soft bg-film-grain-dark">
              <Flame className="w-6 h-6 text-film-paper" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-serif font-bold text-film-ink">FiCR</span>
              <span className="text-xs font-sans text-film-slate">Fire Compliance & Risk</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-sans font-medium transition-film
                  ${
                    isActive(item.path)
                      ? 'bg-film-sand text-primary-700 shadow-film-inner'
                      : 'text-film-slate hover:bg-film-sand/50 hover:text-film-ink'
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="md:hidden">
            <button className="p-2 rounded-lg text-film-slate hover:bg-film-sand/50 transition-film">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
