import { Parser, Store, Quad } from 'n3';

export interface DemoBuilding {
  uri: string;
  purposeGroup?: string;
  sprinklerStatus?: string;
  overallHeight_m?: number;
  hazardClass?: string;
  [key: string]: string | number | undefined;
}

export interface DemoCompartment {
  uri: string;
  name?: string;
  location?: string;
  actualFloorArea_m2?: number;
  [key: string]: string | number | undefined;
}

export interface DemoElement {
  uri: string;
  type?: string;
  adjacentToZone?: string;
  actual_REI_Wall?: number;
  actual_REI_Floor?: number;
  [key: string]: string | number | undefined;
}

export interface ParsedDemo {
  buildings: DemoBuilding[];
  compartments: DemoCompartment[];
  elements: DemoElement[];
}

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function extractValue(quad: Quad | undefined): string | number | undefined {
  if (!quad) return undefined;
  const value = quad.object.value;
  if (quad.object.termType === 'Literal') {
    const num = parseFloat(value);
    if (!isNaN(num) && value === num.toString()) {
      return num;
    }
  }
  return value;
}

function extractInstances(store: Store, classURI: string, propertyMap: { [key: string]: string }): any[] {
  const instances: any[] = [];
  const instanceQuads = store.getQuads(null, RDF_TYPE, classURI, null);

  instanceQuads.forEach((quad: Quad) => {
    const uri = quad.subject.value;
    const instance: any = { uri };

    Object.entries(propertyMap).forEach(([key, propertyURI]) => {
      const valueQuads = store.getQuads(quad.subject, propertyURI, null, null);
      if (valueQuads.length > 0) {
        instance[key] = extractValue(valueQuads[0]);
      }
    });

    instances.push(instance);
  });

  return instances;
}

export async function parseDemoTTL(ttlContent: string): Promise<ParsedDemo> {
  const parser = new Parser();
  const store = new Store();

  return new Promise((resolve, reject) => {
    parser.parse(ttlContent, (error, quad, prefixes) => {
      if (error) {
        reject(error);
        return;
      }

      if (quad) {
        store.addQuad(quad);
      } else {
        const buildings = extractInstances(store, 'http://example.org/ficr#Building', {
          purposeGroup: 'http://example.org/ficr#purposeGroup',
          sprinklerStatus: 'http://example.org/ficr#sprinklerStatus',
          overallHeight_m: 'http://example.org/ficr#overallHeight_m',
          hazardClass: 'http://example.org/ficr#hazardClass',
        });

        const compartments = extractInstances(store, 'http://example.org/ficr#FireCompartment', {
          name: 'http://example.org/ficr#name',
          location: 'http://example.org/ficr#location',
          actualFloorArea_m2: 'http://example.org/ficr#actualFloorArea_m2',
        });

        const elements = extractInstances(store, 'http://example.org/ficr#FireRelevantElement', {
          type: 'http://example.org/ficr#elementType',
          adjacentToZone: 'http://example.org/ficr#adjacentToZone',
          actual_REI_Wall: 'http://example.org/ficr#actual_REI_Wall',
          actual_REI_Floor: 'http://example.org/ficr#actual_REI_Floor',
        });

        resolve({
          buildings,
          compartments,
          elements,
        });
      }
    });
  });
}

export async function loadDemo(): Promise<ParsedDemo> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}ficr_demo.ttl`);
    if (!response.ok) {
      throw new Error(`Failed to load demo data: ${response.statusText}`);
    }
    const ttlContent = await response.text();
    return await parseDemoTTL(ttlContent);
  } catch (error) {
    console.error('Error loading demo:', error);
    throw error;
  }
}
