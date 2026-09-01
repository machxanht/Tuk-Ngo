export type ConfidenceLevel = 'CONFIRMED' | 'APPROXIMATE' | 'INFERRED' | 'UNKNOWN';

export type SourceCategory = 
  | 'A_TUMNUP2_2024' 
  | 'B_OTHER_NGO_BOATS' 
  | 'C_HISTORICAL_MUSEUM' 
  | 'D_RACE_ENVIRONMENT' 
  | 'E_CREW_ROWING';

export interface SourceReference {
  id: number;
  title: string;
  url: string;
  category: SourceCategory;
  categoryLabel: string;
  primarySubject: string;
  evidenceNotes: string;
  verifiedFeatures: string[];
}

export interface TechnicalSection {
  id: number;
  sectionNumber: number;
  title: string;
  vietnameseTitle: string;
  confidence: ConfidenceLevel;
  summary: string;
  specifications: {
    label: string;
    value: string;
    confidence: ConfidenceLevel;
    notes?: string;
  }[];
  geometryDetails?: {
    blenderDimensions?: string;
    meshTopology?: string;
    materialShader?: string;
    physicsSimulation?: string;
  };
  visualObservations: string[];
  comparativeDifferentiators: string[];
  riggingGameEngineNotes: string[];
  verifiedSources: number[];
}

export interface CrewMemberSpec {
  roleId: string;
  roleName: string;
  vietnameseName: string;
  count: number;
  positionRangeMeters: string;
  seatedOrStanding: 'Seated' | 'Standing' | 'Dynamic Crouch' | 'Braced Standing';
  paddleType: string;
  paddleLengthM: number;
  primaryAnimationLoop: string;
  keyResponsibilities: string[];
  confidence: ConfidenceLevel;
}

export interface ColorPaletteItem {
  name: string;
  vietnameseName?: string;
  hex: string;
  rgb: string;
  role: string;
  vietnameseRole?: string;
  applicationArea: string;
  confidence: ConfidenceLevel;
}

export interface StrokePhase {
  phaseIndex: number;
  phaseName: string;
  vietnameseName: string;
  timePercentage: string; // e.g. "0% - 15%"
  paddleAngleDeg: number;
  bladeDepthM: number;
  torsoAngleDeg: number;
  forceVector: string;
  description: string;
}
