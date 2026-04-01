import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface TOCSection {
  id: string;
  number: string;
  title: string;
  subsections?: TOCSection[];
}

interface TableOfContentsProps {
  sections: TOCSection[];
  activeSection?: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ sections, activeSection }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [currentSection, setCurrentSection] = useState<string>(activeSection || '');

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.flatMap(s => [
        { id: s.id, element: document.getElementById(s.id) },
        ...(s.subsections || []).map(sub => ({
          id: sub.id,
          element: document.getElementById(sub.id),
        })),
      ]);

      const scrollPosition = window.scrollY + 100;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const { id, element } = sectionElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const renderSection = (section: TOCSection, level: number = 0) => {
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const isExpanded = expandedSections.has(section.id);
    const isActive = currentSection === section.id;

    return (
      <div key={section.id} style={{ marginLeft: `${level * 12}px` }}>
        <div
          className={`flex items-center py-1.5 px-2 rounded cursor-pointer group transition-colors ${
            isActive
              ? 'bg-primary-100 text-primary-900 font-medium'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          onClick={() => scrollToSection(section.id)}
        >
          {hasSubsections && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(section.id);
              }}
              className="mr-1 p-0.5 hover:bg-neutral-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          <span className="text-sm leading-relaxed">
            <span className="font-semibold mr-2">{section.number}</span>
            {section.title}
          </span>
        </div>
        {hasSubsections && isExpanded && (
          <div className="mt-0.5">
            {section.subsections!.map((sub) => renderSection(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sticky top-20 bg-white border border-neutral-200 rounded-lg p-4 shadow-sm max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h2 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wide">
        Table of Contents
      </h2>
      <nav className="space-y-0.5">
        {sections.map((section) => renderSection(section))}
      </nav>
    </div>
  );
};
