import React, { useState, useEffect } from 'react';
import { Card, CodeBlock } from '../components/shared';
import { FileCode, Building, Shield, AlertTriangle, Loader } from 'lucide-react';
import { loadOntology, ParsedOntology } from '../utils/ttlParser';

export const Examples: React.FC = () => {
  const [ontology, setOntology] = useState<ParsedOntology | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOntology()
      .then((data) => {
        setOntology(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const examples = [
    {
      title: 'Defining a Fire Door',
      description: 'Example of how to represent a fire-rated door using FiCR vocabulary',
      icon: <Shield className="w-6 h-6" />,
      code: `@prefix ficr: <https://w3id.org/bam/ficr#> .
@prefix bot: <https://w3id.org/bot#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

:FireDoor_01 a ficr:FireDoorset ;
    rdfs:label "Fire Door FD-101" ;
    ficr:hasFireResistance "EI 60"^^xsd:string ;
    ficr:hasFireRating 60 ;
    bot:adjacentElement :Room_Kitchen, :Room_Corridor ;
    ficr:hasSelfClosingDevice :ClosingDevice_01 ;
    ficr:hasFireSafetyRole ficr:FireSeparatingRole .`,
      language: 'turtle'
    },
    {
      title: 'Modeling a Fire Compartment',
      description: 'Representing a fire compartment with boundaries and protected elements',
      icon: <Building className="w-6 h-6" />,
      code: `@prefix ficr: <https://w3id.org/bam/ficr#> .
@prefix bot: <https://w3id.org/bot#> .

:Compartment_Floor2 a ficr:FireCompartment ;
    rdfs:label "Second Floor Compartment" ;
    bot:hasSpace :Room_201, :Room_202, :Room_203 ;
    ficr:hasBoundaryElement :Wall_FC_01, :Wall_FC_02 ;
    ficr:hasFireResistance "REI 90" ;
    ficr:hasArea "250.5"^^xsd:decimal ;
    ficr:requiresProtection true .

:Wall_FC_01 a ficr:Wall ;
    ficr:hasFireSafetyRole ficr:FireSeparatingRole ;
    ficr:hasFireRating 90 .`,
      language: 'turtle'
    },
    {
      title: 'Fire Safety Assessment',
      description: 'Recording a compliance assessment with evidence and findings',
      icon: <AlertTriangle className="w-6 h-6" />,
      code: `@prefix ficr: <https://w3id.org/bam/ficr#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

:Assessment_2024_01 a ficr:ComplianceAssessment ;
    rdfs:label "Annual Fire Safety Inspection 2024" ;
    dcterms:date "2024-01-15"^^xsd:date ;
    ficr:assessedBuilding :Building_MainOffice ;
    ficr:hasAssessor :Inspector_JohnDoe ;
    ficr:hasEvidence :Evidence_Photos_01, :Evidence_Report_01 ;
    ficr:hasFinding :Finding_01, :Finding_02 ;
    ficr:overallStatus "Pass with recommendations" .

:Finding_01 a ficr:AssessmentFinding ;
    rdfs:label "Fire door closer malfunction" ;
    ficr:severity "Medium" ;
    ficr:relatedElement :FireDoor_05 ;
    ficr:recommendation "Replace door closer mechanism" .`,
      language: 'turtle'
    },
    {
      title: 'Building with Fire Safety Systems',
      description: 'Complete example showing a building with integrated fire safety systems',
      icon: <FileCode className="w-6 h-6" />,
      code: `@prefix ficr: <https://w3id.org/bam/ficr#> .
@prefix bot: <https://w3id.org/bot#> .

:Building_A a bot:Building ;
    rdfs:label "Residential Building A" ;
    bot:hasStorey :Floor_Ground, :Floor_1, :Floor_2 ;
    ficr:hasFireAlarmSystem :FireAlarm_Central ;
    ficr:hasSprinklerSystem :Sprinkler_System_01 ;
    ficr:purposeGroup "Residential" .

:FireAlarm_Central a ficr:FireAlarmSystem ;
    rdfs:label "Central Fire Alarm Panel" ;
    ficr:hasDetector :Detector_01, :Detector_02 ;
    ficr:hasAlarmDevice :Bell_01, :Strobe_01 ;
    ficr:monitoredBy :MonitoringStation_01 .

:Sprinkler_System_01 a ficr:FireSprinklerSystem ;
    rdfs:label "Wet Pipe Sprinkler System" ;
    ficr:systemType "Wet Pipe" ;
    ficr:coverageArea "1200.0"^^xsd:decimal ;
    ficr:hasComponent :Sprinkler_Head_01 .`,
      language: 'turtle'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Usage Examples</h1>
        <p className="text-lg text-neutral-600 mb-6">
          Practical examples demonstrating how to use FiCR ontology to model fire safety
          information in buildings
        </p>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-600">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading ontology information...</span>
          </div>
        ) : ontology && (
          <Card className="bg-neutral-50 border border-neutral-200">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-neutral-800 mb-1">
                  {ontology.classes.length}
                </div>
                <div className="text-sm text-neutral-600">Classes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-neutral-800 mb-1">
                  {ontology.objectProperties.length}
                </div>
                <div className="text-sm text-neutral-600">Object Properties</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-neutral-800 mb-1">
                  {ontology.datatypeProperties.length}
                </div>
                <div className="text-sm text-neutral-600">Datatype Properties</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-8">
        {examples.map((example, index) => (
          <Card key={index}>
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-neutral-100 text-neutral-700 p-3 rounded-xl flex-shrink-0">
                {example.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{example.title}</h2>
                <p className="text-neutral-600">{example.description}</p>
              </div>
            </div>
            <CodeBlock
              code={example.code}
              language={example.language}
              showLineNumbers
              title={`${example.title}.ttl`}
            />
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Card className="bg-neutral-50 border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">More Examples</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            These examples demonstrate common patterns for using FiCR. For more complex scenarios
            and real-world datasets, please visit the Demo page or download the complete ontology
            file which includes comprehensive example data.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/#/demo"
              className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Explore Demo
            </a>
            <a
              href={`${import.meta.env.BASE_URL}ficr_tbox.ttl`}
              download
              className="inline-flex items-center px-4 py-2 bg-white text-neutral-900 border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Download Ontology
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
