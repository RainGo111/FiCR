import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, CodeBlock } from '../components/shared';
import { Building2, AlertCircle, Loader2, Flame, Box, Layers, Database, Info, Printer, FileText } from 'lucide-react';

interface DemoData {
  building: {
    id: string;
    purposeGroup: string;
    sprinklerStatus: string;
    overallHeight_m: number;
    hazardClass: string;
  };
  compartments: Array<{
    id: string;
    name: string;
    location: string;
    actualFloorArea_m2: number;
  }>;
  elements: Array<{
    id: string;
    type: string;
    adjacentToZone: string;
    actual_REI_Wall?: number;
    actual_REI_Floor?: number;
  }>;
}

type QueryType = 'building' | 'compartments' | 'elements' | null;

const SPARQL_QUERIES = {
  building: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?building ?purposeGroup ?sprinklerStatus ?height ?hazardClass
WHERE {
  ?building rdf:type ficr:Building ;
            ficr:purposeGroup ?purposeGroup ;
            ficr:sprinklerStatus ?sprinklerStatus ;
            ficr:overallHeight_m ?height ;
            ficr:hazardClass ?hazardClass .
}`,
  compartments: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?compartment ?name ?location ?floorArea
WHERE {
  ?compartment rdf:type ficr:FireCompartment ;
               ficr:name ?name ;
               ficr:location ?location ;
               ficr:actualFloorArea_m2 ?floorArea .
}
ORDER BY ?location`,
  elements: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?element ?type ?adjacentZone ?reiValue
WHERE {
  ?element rdf:type ficr:FireRelevantElement ;
           ficr:elementType ?type ;
           ficr:adjacentToZone ?adjacentZone .

  OPTIONAL {
    ?element ficr:actual_REI_Wall ?reiValue .
  }
  OPTIONAL {
    ?element ficr:actual_REI_Floor ?reiValue .
  }
}
ORDER BY ?type ?element`
};

export const Demo: React.FC = () => {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryType>(null);

  useEffect(() => {
    const loadDemoData = async () => {
      try {
        setLoading(true);
        setError(null);
        const basePath = import.meta.env.BASE_URL || '/';
        const dataPath = `${basePath}demo_ex.json`.replace('//', '/');
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load demo data: ${response.statusText}`);
        }
        const data = await response.json();
        setDemoData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demo data');
        console.error('Error loading demo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  const renderQueryResult = () => {
    if (!demoData || !selectedQuery) return null;

    switch (selectedQuery) {
      case 'building':
        return (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Derived Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Building ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Purpose Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Sprinkler Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Height (m)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Hazard Class</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-neutral-900">{demoData.building.id}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.purposeGroup}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.sprinklerStatus}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.overallHeight_m}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.hazardClass}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        );

      case 'compartments':
        return (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              Derived Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Compartment ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Floor Area (m²)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.compartments.map((compartment, index) => (
                    <tr key={index} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{compartment.id}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.location}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.actualFloorArea_m2}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        );

      case 'elements':
        return (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-600" />
              Derived Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Element ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Adjacent to Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">REI Value (min)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.elements.map((element, index) => (
                    <tr key={index} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.id}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{element.type}</td>
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.adjacentToZone}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {element.type === 'Wall'
                          ? element.actual_REI_Wall
                          : element.actual_REI_Floor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
          <Flame className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">
          Fire Risk Demo
        </h1>
        <p className="text-xl text-neutral-600">
          Interactive demonstration of FiCR ontology with real building data
        </p>
      </div>

      {loading && (
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-center gap-3 text-blue-700">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-lg font-medium">Loading demo data...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="mb-8 bg-red-50 border-red-200">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Error loading demo data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {demoData && (
        <>
          <Card className="mb-8 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3 text-amber-800">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Demo Mode</p>
                <p className="text-sm">
                  This page demonstrates FiCR ontology queries using example data from demo_ex.json.
                  Results are derived from static sample data for demonstration purposes.
                </p>
              </div>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500 text-white p-2.5 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Building Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Building ID</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.id}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Purpose Group</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.purposeGroup}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Sprinkler Status</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.sprinklerStatus}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Overall Height</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.overallHeight_m} m</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Hazard Class</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{demoData.building.hazardClass}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500 text-white p-2.5 rounded-xl">
                <Box className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Fire Compartments</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Floor Area (m²)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.compartments.map((compartment, index) => (
                    <tr key={index} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{compartment.id}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.location}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.actualFloorArea_m2}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-500 text-white p-2.5 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Fire-Relevant Elements</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Adjacent to Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Actual REI (min)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.elements.map((element, index) => (
                    <tr key={index} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.id}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{element.type}</td>
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.adjacentToZone}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {element.type === 'Wall'
                          ? element.actual_REI_Wall
                          : element.actual_REI_Floor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-500 text-white p-2.5 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Query Showcase</h2>
            </div>

            <p className="text-neutral-600 mb-6">
              Explore how FiCR ontology data can be queried using SPARQL. Select a query below to view
              the SPARQL syntax and see the derived results from the demo dataset.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                variant={selectedQuery === 'building' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'building' ? null : 'building')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Building-level Risk Summary
              </Button>
              <Button
                variant={selectedQuery === 'compartments' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'compartments' ? null : 'compartments')}
              >
                <Box className="w-4 h-4 mr-2" />
                Compartment Area & Location Overview
              </Button>
              <Button
                variant={selectedQuery === 'elements' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'elements' ? null : 'elements')}
              >
                <Layers className="w-4 h-4 mr-2" />
                Elements with Fire Resistance Performance
              </Button>
            </div>

            {selectedQuery && (
              <div className="border-t border-neutral-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-neutral-900">SPARQL Query</h3>
                  <Badge variant="neutral">Read-only</Badge>
                </div>
                <CodeBlock
                  code={SPARQL_QUERIES[selectedQuery]}
                  language="sparql"
                />
                {renderQueryResult()}
              </div>
            )}
          </Card>

          <Card className="mb-8 print-card">
            <div className="flex items-center justify-between mb-6 print-header">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 text-white p-2.5 rounded-xl print-hide">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900">Fire Risk Assessment – Demo Report</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="print-hide"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Save as PDF
              </Button>
            </div>

            <div className="print-metadata">
              <div className="text-sm text-neutral-600 mb-6 pb-6 border-b border-neutral-200">
                <p className="mb-2"><span className="font-semibold">Report Generated:</span> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="mb-2"><span className="font-semibold">Assessment Type:</span> FiCR Ontology Demo Analysis</p>
                <p><span className="font-semibold">Building ID:</span> {demoData.building.id}</p>
              </div>
            </div>

            <div className="space-y-8">
              <section className="print-section">
                <h3 className="text-xl font-bold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                  1. Building Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Building ID:</span>
                      <span className="text-neutral-900">{demoData.building.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Purpose Group:</span>
                      <span className="text-neutral-900">{demoData.building.purposeGroup}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Sprinkler Status:</span>
                      <span className="text-neutral-900">{demoData.building.sprinklerStatus}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Overall Height:</span>
                      <span className="text-neutral-900">{demoData.building.overallHeight_m} meters</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Hazard Class:</span>
                      <span className="text-neutral-900">{demoData.building.hazardClass}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-200">
                      <span className="font-semibold text-neutral-700">Total Compartments:</span>
                      <span className="text-neutral-900">{demoData.compartments.length}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg print-bg-gray">
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    <span className="font-semibold">Assessment Summary:</span> This building is classified as {demoData.building.purposeGroup}
                    with a hazard class of {demoData.building.hazardClass}. The building stands at {demoData.building.overallHeight_m} meters
                    in height and is equipped with {demoData.building.sprinklerStatus.toLowerCase()} sprinkler system. The structure contains
                    {demoData.compartments.length} fire compartments with various fire-resistance requirements.
                  </p>
                </div>
              </section>

              <section className="print-section">
                <h3 className="text-xl font-bold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                  2. Compartment Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-neutral-300">
                    <thead className="bg-neutral-100 print-bg-gray">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Compartment ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Floor Area (m²)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {demoData.compartments.map((compartment, index) => (
                        <tr key={index} className="print-row">
                          <td className="px-4 py-3 text-sm font-mono text-neutral-900 border-b border-neutral-200">
                            {compartment.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 border-b border-neutral-200">
                            {compartment.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 border-b border-neutral-200">
                            {compartment.location}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 border-b border-neutral-200">
                            {compartment.actualFloorArea_m2}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg print-bg-gray">
                  <p className="text-sm text-neutral-700">
                    <span className="font-semibold">Total Floor Area:</span> {demoData.compartments.reduce((sum, c) => sum + c.actualFloorArea_m2, 0)} m²
                  </p>
                </div>
              </section>

              <section className="print-section">
                <h3 className="text-xl font-bold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                  3. Element Performance Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-neutral-300">
                    <thead className="bg-neutral-100 print-bg-gray">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Element ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Adjacent to Zone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-300">
                          Actual REI (min)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {demoData.elements.map((element, index) => (
                        <tr key={index} className="print-row">
                          <td className="px-4 py-3 text-sm font-mono text-neutral-900 border-b border-neutral-200">
                            {element.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 border-b border-neutral-200">
                            {element.type}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-neutral-900 border-b border-neutral-200">
                            {element.adjacentToZone}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 border-b border-neutral-200">
                            {element.type === 'Wall' ? element.actual_REI_Wall : element.actual_REI_Floor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg print-bg-gray">
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    <span className="font-semibold">Performance Analysis:</span> All fire-relevant elements have been assessed
                    for their fire resistance (REI) ratings. The elements include {demoData.elements.filter(e => e.type === 'Wall').length} walls
                    and {demoData.elements.filter(e => e.type === 'Floor').length} floors with resistance values ranging
                    from {Math.min(...demoData.elements.map(e => e.type === 'Wall' ? (e.actual_REI_Wall || 0) : (e.actual_REI_Floor || 0)))}
                    to {Math.max(...demoData.elements.map(e => e.type === 'Wall' ? (e.actual_REI_Wall || 0) : (e.actual_REI_Floor || 0)))} minutes.
                  </p>
                </div>
              </section>

              <section className="mt-8 pt-6 border-t border-neutral-300 text-sm text-neutral-600 print-footer">
                <p className="mb-2">
                  <span className="font-semibold">Disclaimer:</span> This report is generated from demonstration data for illustrative purposes only.
                  The information presented should not be used for actual fire safety compliance or building certification.
                </p>
                <p>
                  <span className="font-semibold">Generated by:</span> FiCR Ontology Demo System |
                  <span className="ml-2"><span className="font-semibold">Date:</span> {new Date().toLocaleString()}</span>
                </p>
              </section>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
