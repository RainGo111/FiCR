import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components/shared';
import { BookOpen, Shield, Network, ArrowRight, Download, GitBranch, Database } from 'lucide-react';
import siteConfig from '../content/siteConfig.json';

export const Home: React.FC = () => {
  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Fire Safety Focus',
      description: 'Comprehensive semantic model for fire compliance and risk analysis in existing buildings'
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: 'Semantic Interoperability',
      description: 'Built on W3C standards (OWL, RDF) and aligned with BOT ontology for building topology'
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Rich Domain Model',
      description: 'Covers building elements, fire safety systems, zones, compliance assessment, and risk analysis'
    },
    {
      icon: <GitBranch className="w-6 h-6" />,
      title: 'Modular Architecture',
      description: 'Organized into logical modules for core elements, safety systems, zones, roles, and assessment'
    }
  ];



  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold text-primary-900 mb-6 tracking-tight">
            {siteConfig.ontology.fullTitle}
          </h1>
          <p className="text-2xl text-primary-700 max-w-4xl mx-auto leading-relaxed mb-10 font-light">
            The semantic backbone for intelligent fire safety and risk management in the built environment.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/documentation">
              <Button size="lg" variant="primary">
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Documentation
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline">
                Try Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-4xl font-bold text-primary-900 text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} hover>
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-gradient-primary-start to-gradient-primary-end text-white p-3 rounded-xl flex-shrink-0 shadow-soft">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-primary-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-primary-700 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-br from-white/90 via-accent-50/20 to-white/90 border border-white/30 shadow-glass-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary-900 mb-6">
              Purpose & Scope
            </h2>
            <p className="text-primary-800 leading-relaxed max-w-3xl mx-auto mb-8 text-lg">
              {siteConfig.ontology.purpose}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {siteConfig.ontology.targetAudience.map((audience, index) => (
                <span
                  key={index}
                  className="glass px-4 py-2 rounded-full text-sm font-medium text-primary-800 border border-white/20 shadow-soft"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
