import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components/shared';
import { BookOpen, Shield, Network, GitBranch, Database, Terminal, FileText } from 'lucide-react';
import siteConfig from '../content/siteConfig.json';

export const Home: React.FC = () => {
  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Fire Safety Focus',
      description: 'Comprehensive semantic model for fire compliance and risk analysis in existing buildings',
      color: 'bg-accent-600',
    },
    {
      icon: <Network className="w-5 h-5" />,
      title: 'Semantic Interoperability',
      description: 'Built on W3C standards (OWL, RDF) and aligned with BOT ontology for building topology',
      color: 'bg-primary-600',
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: 'Rich Domain Model',
      description: 'Covers building elements, fire safety systems, zones, compliance assessment, and risk analysis',
      color: 'bg-primary-600',
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: 'Modular Architecture',
      description: 'Organized into logical modules for core elements, safety systems, zones, roles, and assessment',
      color: 'bg-accent-600',
    }
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {siteConfig.ontology.fullTitle}
          </h1>
          <div className="w-16 h-1 bg-accent-600 mx-auto mb-6 rounded-full" />
          <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            The semantic backbone for intelligent fire safety and risk management in the built environment.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((feature, index) => (
              <Card key={index} hover>
                <div className="flex items-start gap-4">
                  <div className={`${feature.color} text-white p-2.5 rounded-lg flex-shrink-0 shadow-sm`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Purpose & Scope */}
        <Card className="mb-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Purpose & Scope
            </h2>
            <p className="text-slate-600 leading-relaxed max-w-3xl mx-auto mb-6">
              {siteConfig.ontology.purpose}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {siteConfig.ontology.targetAudience.map((audience, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 py-6">
          <Link to="/documentation">
            <Button variant="primary" size="lg">
              <BookOpen className="w-4 h-4 mr-2" />
              Explore Documentation
            </Button>
          </Link>
          <Link to="/query-lab">
            <Button variant="outline" size="lg">
              <Terminal className="w-4 h-4 mr-2" />
              Try Query Lab
            </Button>
          </Link>
          <Link to="/report">
            <Button variant="outline" size="lg">
              View Report
              <FileText className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
