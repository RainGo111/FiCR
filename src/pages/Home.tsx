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
    <div className="bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-neutral-900 mb-4">
            {siteConfig.ontology.fullTitle}
          </h1>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-8">
            {siteConfig.ontology.description}
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



        <div className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} hover>
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 text-primary-600 p-3 rounded-xl flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-100">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Purpose & Scope
            </h2>
            <p className="text-neutral-700 leading-relaxed max-w-3xl mx-auto mb-6">
              {siteConfig.ontology.purpose}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {siteConfig.ontology.targetAudience.map((audience, index) => (
                <span
                  key={index}
                  className="bg-white px-4 py-2 rounded-full text-sm text-neutral-700 border border-neutral-200"
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
