

export enum ResourceType {
  RawData = 'RawData',
  CleanData = 'CleanData',
  Metrics = 'Metrics',
  Dashboards = 'Dashboards',
  Models = 'Models',
}

export enum UpgradeCategory {
  Tooling = 'Tooling',
  Granularity = 'Granularity',
  Governance = 'Governance',
  Scientific = 'Scientific',
  HR = 'HR', // New category for hiring
  Infrastructure = 'Infrastructure', // New category for storage
  Endgame = 'Endgame', // New category for winning
  Neural = 'Neural', // New category for Prestige/NG+
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  cost: {
    resource: ResourceType | 'PU' | 'TU';
    amount: number;
  };
  effect: (state: GameState) => Partial<GameState>;
  triggerText?: string;
  purchased: boolean;
  visible: boolean; // unlocked to see
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'neutral' | 'good' | 'bad';
  condition: (state: GameState) => boolean;
  effect: (state: GameState) => Partial<GameState>;
  triggered: boolean;
}

export interface LogMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'system';
  timestamp: number;
}

export interface ChatResponse {
  label: string;
  description?: string; // flavor text like "Lie" or "Argue"
  type: 'corporate' | 'truth' | 'neutral';
  effect: (state: GameState) => Partial<GameState>;
  taskDuration?: number; // New: Seconds to complete the task (blocking)
}

export interface ChatScenario {
  id: string;
  sender: string;
  message: string;
  responses: ChatResponse[];
}

export interface ChatMessage {
  id: string;
  scenarioId: string; // Ref to the static scenario
  sender: string;
  message: string;
  responses: ChatResponse[]; // Stored here to preserve context
  timestamp: number;
  isUrgent: boolean; // If ignored for too long
}

export interface WorldStats {
  economy: number;
  socialTrust: number;
  environment: number;
  entropy: number;
}

export interface BoardMeeting {
  active: boolean;
  target: number;
  progress: number;
  timeRemaining: number; // in seconds
  penaltyEndTime: number; // Game tick when penalty ends
}

export interface MarketState {
  unlocked: boolean;
  stockPrice: number;
  ownedShares: number;
  history: { tick: number; price: number; trueValue: number }[];
  lastPriceDelta: number;
}

// New Marketing Types
export type CampaignType = 'email' | 'social' | 'influencer' | 'tv';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  duration: number; // Total ticks
  timeLeft: number; // Remaining ticks
  cost: number; // PU cost
  effectiveness: number; // Multiplier 1.0 standard
  generatedRaw: number; // Total generated
  generatedPU: number; // Total generated
}

export interface BlockingTask {
    name: string;
    startTick: number;
    durationTicks: number;
    chatId: string;
    responseIndex: number;
}

export interface PrestigeState {
    level: number;
    currency: number; // "Insight"
    multiplier: number; // Global production multiplier
    timestamp: number;
}

export interface RivalState {
    active: boolean;
    name: string;
    cleanData: number;
    metrics: number;
    lastMockTick: number;
}

export interface CoffeeBreakState {
    active: boolean;
    character: string;
    mood: 'happy' | 'neutral' | 'angry';
    dialogue: string;
    effectDescription: string;
}

export const EXPANSION_ERAS = [
  'analyst',
  'automation',
  'ai_pilot',
  'acceleration',
  'connected_enterprise',
  'good_enough',
  'lightspeed',
  'governance_crisis',
] as const;

export type ExpansionEra = typeof EXPANSION_ERAS[number];

export interface ExpansionProgress {
  era: ExpansionEra;
  transition: null | {
    targetEra: ExpansionEra;
    step: string;
  };
}

export interface GameState {
  // Persisted progression authority; no active expansion gameplay yet.
  expansionProgress: ExpansionProgress;

  // Resources
  rawData: number;
  maxStorage: number; // New: storage cap
  cleanData: number;
  metrics: number;
  dashboards: number;
  models: number;
  
  // Currencies/Scores
  pu: number; // Perceived Understanding
  tu: number; // True Understanding
  metricQuality: number; // 0.0 to 1.0
  
  // System Health
  complexity: number; 
  observability: number; 
  packetLoss: number; // Percentage of data lost recently (0-100)
  
  // Mini-Game States
  spaghettiMode: boolean; 
  pandasMode: boolean; 
  sqlMode: boolean; 
  modelMode: boolean; 
  miningMode: boolean; // New: Process Analysis (Cursor Trail)
  flowMode: boolean;   // New: Data Flow (Falling Water)
  buzzwordMode: boolean; // New: Word Battle
  pdfMode: boolean;      // New: PDF Extraction

  // Rates (calculated per second)
  rawDataRate: number;
  cleanDataRate: number; // Base processing
  metricRate: number;
  
  // World
  worldStats: WorldStats;
  market: MarketState; // Stock Market
  
  // Meta
  tick: number;
  startTime: number;
  logs: LogMessage[];
  activeChats: ChatMessage[]; // New: Active team messages
  boardMeeting: BoardMeeting; // New: Boss fight state
  blockingTask: BlockingTask | null; // New: Player busy doing something
  upgrades: Record<string, boolean>; // id -> purchased
  activeEvents: GameEvent[]; // Events currently showing (usually just 1 at a time)
  eventHistory: string[]; // IDs of triggered events
  
  // Marketing
  activeCampaigns: Campaign[]; // New

  // Endgame
  prestige: PrestigeState;
  isAscending: boolean; // Visual state for ending

  // Rival
  rival: RivalState;

  // Social
  relationships: Record<string, number>; // senderName -> score (-100 to 100)
  lastCoffeeTick: number;
  coffeeBreak: CoffeeBreakState;

  // Visual History for Charts
  history: { tick: number; pu: number; tu: number; revenue: number }[];
}

export const INITIAL_STATE: GameState = {
  expansionProgress: { era: 'analyst', transition: null },
  rawData: 100, 
  maxStorage: 500, // Initial cap
  cleanData: 0,
  metrics: 0,
  dashboards: 0,
  models: 0,
  pu: 0,
  tu: 10,
  metricQuality: 0.5,
  complexity: 10,
  observability: 100,
  packetLoss: 0,
  spaghettiMode: false,
  pandasMode: false,
  sqlMode: false,
  modelMode: false,
  miningMode: false,
  flowMode: false,
  buzzwordMode: false,
  pdfMode: false,
  rawDataRate: 2, 
  cleanDataRate: 0,
  metricRate: 0,
  worldStats: {
    economy: 50,
    socialTrust: 50,
    environment: 50,
    entropy: 0,
  },
  market: {
    unlocked: false,
    stockPrice: 10,
    ownedShares: 0,
    history: [],
    lastPriceDelta: 0,
  },
  tick: 0,
  startTime: Date.now(),
  logs: [{ id: 0, text: "System initialized. Kernel loaded. Storage mounted: /mnt/data", type: 'system', timestamp: Date.now() }],
  activeChats: [],
  boardMeeting: {
      active: false,
      target: 0,
      progress: 0,
      timeRemaining: 0,
      penaltyEndTime: 0
  },
  blockingTask: null,
  upgrades: {},
  activeEvents: [],
  eventHistory: [],
  history: [],
  activeCampaigns: [],
  prestige: {
      level: 0,
      currency: 0,
      multiplier: 1.0,
      timestamp: 0
  },
  isAscending: false,
  rival: {
      active: false,
      name: "10x Engineer Eric",
      cleanData: 0,
      metrics: 0,
      lastMockTick: 0
  },
  relationships: {},
  lastCoffeeTick: -9999, // Allow immediate first coffee
  coffeeBreak: {
      active: false,
      character: '',
      mood: 'neutral',
      dialogue: '',
      effectDescription: ''
  }
};
