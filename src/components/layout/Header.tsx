import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/documentation', label: 'Documentation' },
  { path: '/query-lab', label: 'Query Lab' },
  { path: '/chatbot', label: 'FiCR Chatbot' },
  { path: '/report', label: 'Report' },
  { path: '/roadmap', label: 'Roadmap' }
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
    <header className="glass border-b border-white/20 sticky top-0 z-50 shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3 transition-smooth hover-brighten">
            <div className="bg-gradient-to-br from-brand-red-500 to-brand-orange-600 p-2 rounded-xl shadow-medium">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-sans font-bold text-primary-900">FiCR</span>
              <span className="text-xs font-sans text-primary-600">Fire Risk Ontology</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-sans font-medium transition-smooth
                  ${isActive(item.path)
                    ? 'bg-gradient-primary text-white shadow-soft'
                    : 'text-primary-700 hover:bg-primary-100'
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="md:hidden">
            <button className="p-2 rounded-lg text-primary-700 hover:bg-primary-100 transition-smooth">
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
