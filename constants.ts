import { GameState, Upgrade, UpgradeCategory, ResourceType, GameEvent, ChatScenario } from './types';

export const TICK_RATE_MS = 200; // 5 ticks per second
export const HISTORY_LENGTH = 50;
export const AI_REVIEW_QUEUE_CAP = 12;
export const AI_REVIEW_ACCELERATED_INTERVAL_TICKS = 20;

// Existing Schema Mapping vocabulary, shared by manual boards and issued exceptions.
export const RAW_HEADERS = [
  'User_ID_final_v2', '$$revenue$$', 'cust_name (legacy)', 'Unnamed: 0',
  'e_mail_ADDR', 'is_active?', 'manager_notes_hidden', 'Date (ISO)',
  'x_coord', 'Q3_Profit_LOSS', 'ERROR_CODE', 'temp_c'
];
export const CLEAN_HEADERS = [
  'UserID', 'Revenue', 'CustomerName', 'Index',
  'Email', 'IsActive', 'Notes', 'Timestamp',
  'X', 'Profit', 'ErrorID', 'Temperature'
];

// Fictional, immutable read context for the existing mapping vocabulary; no source writes.
export const PRODUCT_DB_FIELD_CONTEXT = [
  { type: 'identifier', description: 'Stable user identifier', examples: '1042, 1043' },
  { type: 'decimal', description: 'Revenue amount', examples: '149.50, 220.00' },
  { type: 'text', description: 'Customer display name', examples: 'Northwind Parts, Acme Supplies' },
  { type: 'integer', description: 'Source row index', examples: '0, 1, 2' },
  { type: 'text', description: 'Contact email address', examples: 'buyer@example.test' },
  { type: 'boolean', description: 'Active record indicator', examples: 'true, false' },
  { type: 'text', description: 'Internal notes', examples: 'Seasonal account' },
  { type: 'timestamp', description: 'Record timestamp', examples: '2026-01-15T09:00:00Z' },
  { type: 'decimal', description: 'Horizontal coordinate', examples: '12.5, 18.0' },
  { type: 'decimal', description: 'Profit amount', examples: '42.00, -8.50' },
  { type: 'identifier', description: 'Error identifier', examples: '404, 500' },
  { type: 'decimal', description: 'Temperature in Celsius', examples: '18.5, 22.0' },
];

// Gameplay ending availability comes only from persisted expansion authority.
export const isAscensionDeferred = (state: GameState): boolean =>
    state.expansionProgress.era !== 'analyst' || state.expansionProgress.transition !== null;

// Purchased processing, query and storage automation; no score-only handoff.
export const isAIPilotEligible = (state: GameState): boolean =>
    state.upgrades['pandas_scripts'] === true &&
    state.upgrades['sql_optimization'] === true &&
    state.upgrades['local_server'] === true;

export const TERMINAL_FLAVOR_TEXT = [
    // Tech Jargon
    "pip install pandas --upgrade",
    "Resolving dependencies...",
    "[Kernel] Allocating swap space...",
    "Garbage collection invoked. Freed 42MB.",
    "[Daemon] Background process #402 started",
    "Optimizing query execution plan...",
    "Flushing write-ahead logs...",
    
    // Corporate/Lore
    "Indexing employee productivity metrics...",
    "Scanning slack for negative sentiment...",
    "Middle Manager Mike requested 'more synergy'...",
    "Uploading data to 'The Cloud' (It's just someone else's computer)...",
    "Meeting room 'Aquarium' booked for 4 hours.",
    "Coffee machine maintenance required.",
    "Updating privacy policy (reducing font size)...",
    
    // Entropy/Story
    "WARNING: Reality coherence at 98%.",
    "Detected anomaly in sector 7G.",
    "The data is whispering...",
    "Rival signal detected: 10x Engineer Eric is typing...",
    "Entropy levels nominal (for now).",
    "Re-calibrating moral compass...",
    "Simulating Q4 profits..."
];

export const BUZZWORDS_REAL = [
    "Kubernetes", "Docker", "Serverless", "GraphQL", "Kafka", "Redis", 
    "Microservices", "CI/CD", "Blockchain", "RAG", "LLM", "Vector DB", 
    "gRPC", "WebAssembly", "Rust", "TensorFlow", "PyTorch", "Sharding",
    "Event-Driven", "OAuth", "JWT", "REST API", "NoSQL", "ACID", "CAP Theorem",
    "MapReduce", "Hadoop", "Spark", "Airflow", "Terraform", "Ansible",
    "Zero Trust", "Edge Computing", "5G", "IoT", "Digital Twin", "Metaverse"
];

export const BUZZWORDS_FAKE = [
    "Gubernetes", "Ducker", "Serverfull", "GraphQK", "Kafk", "Rediss",
    "Macroservices", "CI/CE", "Blockchain", "RUG", "LMM", "Victor DB",
    "gRPM", "WebAss", "Crust", "TensorFlowr", "PyTorchLite", "Sharting",
    "Event-Drifting", "OAuth3", "JWC", "RESTful API", "YesSQL", "BASEDD", "CUP Theorem",
    "MapReuse", "Hadops", "Spork", "Waterflow", "Terrorform", "Ansibull",
    "Full Trust", "Corner Computing", "6G", "IoE", "Digital Triplet", "Megaverse"
];

export const CHAT_SCENARIOS: ChatScenario[] = [
    {
        id: 'logo_size',
        sender: 'Middle Manager Mike',
        message: 'Can you make the logo bigger on the dashboard? It needs to "pop" more for the client.',
        responses: [
            {
                label: "Compliance",
                description: "Sure, synergy is key. (5s)",
                type: 'corporate',
                taskDuration: 5,
                effect: (state) => ({ pu: state.pu + 50, worldStats: { ...state.worldStats, entropy: state.worldStats.entropy + 2 } })
            },
            {
                label: "Counter-Argument",
                description: "That violates visual hierarchy.",
                type: 'truth',
                effect: (state) => ({ tu: state.tu + 1, pu: Math.max(0, state.pu - 10) })
            }
        ]
    },
    {
        id: 'q3_numbers',
        sender: 'The CEO',
        message: 'I need the Q3 projections to show double-digit growth. The board is watching.',
        responses: [
            {
                label: "Massage Data",
                description: "I can change the Y-axis scale... (10s)",
                type: 'corporate',
                taskDuration: 10,
                effect: (state) => ({ pu: state.pu + 200, tu: Math.max(0, state.tu - 5), metricQuality: Math.max(0.1, state.metricQuality - 0.1) })
            },
            {
                label: "Refuse",
                description: "The data shows flat growth. I won't lie.",
                type: 'truth',
                effect: (state) => ({ tu: state.tu + 10, pu: Math.max(0, state.pu - 100), worldStats: { ...state.worldStats, socialTrust: state.worldStats.socialTrust + 5 } })
            }
        ]
    },
    {
        id: 'red_metric',
        sender: 'Karen from Acct',
        message: 'Why is the "Churn" metric red? It looks aggressive. Can we make it a nice soft blue?',
        responses: [
            {
                label: "Rebrand",
                description: "Call it 'Customer Graduation' instead. (3s)",
                type: 'corporate',
                taskDuration: 3,
                effect: (state) => ({ pu: state.pu + 30, worldStats: { ...state.worldStats, entropy: state.worldStats.entropy + 5 } })
            },
            {
                label: "Explain",
                description: "Red means danger. We are losing money.",
                type: 'truth',
                effect: (state) => ({ tu: state.tu + 2, pu: Math.max(0, state.pu - 15) })
            }
        ]
    },
    {
        id: 'pdf_issue',
        sender: 'Sales Guy Steve',
        message: 'The PDF export isn\'t working. I have a meeting in 2 minutes!!! Fix it!!!',
        responses: [
            {
                label: "Hotfix",
                description: "Hardcode the numbers manually. (8s)",
                type: 'corporate',
                taskDuration: 8,
                effect: (state) => ({ pu: state.pu + 40, rawData: Math.max(0, state.rawData - 10) })
            },
            {
                label: "Ticket",
                description: "Please submit a Jira ticket.",
                type: 'truth',
                effect: (state) => ({ tu: state.tu + 1, pu: Math.max(0, state.pu - 50) }) // Steve hates this
            }
        ]
    },
    {
        id: 'ai_hype',
        sender: 'Intern Ian',
        message: 'Should we sprinkle some "AI" onto the landing page? It trends well.',
        responses: [
            {
                label: "Pivot to AI",
                description: "Add a chatbot that does nothing. (12s)",
                type: 'corporate',
                taskDuration: 12,
                effect: (state) => ({ pu: state.pu + 500, worldStats: { ...state.worldStats, entropy: state.worldStats.entropy + 10, socialTrust: state.worldStats.socialTrust - 5 } })
            },
            {
                label: "Reject",
                description: "We analyze data, we don't hallucinate it.",
                type: 'truth',
                effect: (state) => ({ tu: state.tu + 5, metricQuality: state.metricQuality + 0.05 })
            }
        ]
    },
    // --- RIVAL SCENARIOS ---
    {
        id: 'eric_mock_1',
        sender: '10x Engineer Eric',
        message: 'I see you\'re using Python for that ETL. Cute. I rewrote the entire backend in Assembly over lunch. It\'s 0.004ms faster.',
        responses: [
            {
                label: "Ignore",
                description: "He's just showing off.",
                type: 'neutral',
                effect: (state) => ({ pu: Math.max(0, state.pu - 5) })
            },
            {
                label: "Challenge",
                description: "Battle him in a Buzzword Blitz!",
                type: 'truth',
                effect: (state) => ({ buzzwordMode: true })
            }
        ]
    },
    {
        id: 'eric_mock_2',
        sender: '10x Engineer Eric',
        message: 'Your dashboard latency is 200ms? Mine is negative. The data arrives before the user asks for it. Prediction algorithms, heard of them?',
        responses: [
            {
                label: "Whatever",
                description: "Focus on your own work.",
                type: 'neutral',
                effect: (state) => ({ pu: Math.max(0, state.pu - 5) })
            },
            {
                label: "Challenge",
                description: "Battle him in a Buzzword Blitz!",
                type: 'truth',
                effect: (state) => ({ buzzwordMode: true })
            }
        ]
    },
    {
        id: 'eric_mock_3',
        sender: '10x Engineer Eric',
        message: 'Just pushed a commit that deletes all comments. Code should be self-documenting. If you can\'t read binary, that\'s a skill issue.',
        responses: [
            {
                label: "Facepalm",
                description: "This guy is insufferable.",
                type: 'neutral',
                effect: (state) => ({ pu: Math.max(0, state.pu - 5) })
            },
            {
                label: "Challenge",
                description: "Battle him in a Buzzword Blitz!",
                type: 'truth',
                effect: (state) => ({ buzzwordMode: true })
            }
        ]
    }
];

export const UPGRADES: Upgrade[] = [
  // --- Neural Tree (Prestige / NG+) ---
  {
    id: 'neural_interface',
    name: 'Neural Interface',
    description: 'Direct brain-to-kernel link. Manual actions are 5x more effective.',
    category: UpgradeCategory.Neural,
    cost: { resource: ResourceType.RawData, amount: 0 }, // Free at start of NG+
    effect: (state) => ({ }), // Logic handled manually
    purchased: false,
    visible: false, // Only visible if prestige > 0
  },
  {
    id: 'synaptic_caching',
    name: 'Synaptic Caching',
    description: 'Pre-compute metrics in your dreams. Passive Metric gain +5/sec.',
    category: UpgradeCategory.Neural,
    cost: { resource: 'PU', amount: 5000 },
    effect: (state) => ({ metricRate: state.metricRate + 5 }),
    purchased: false,
    visible: false,
  },

  // --- Tooling Tree (Efficiency) ---
  {
    id: 'manual_excel',
    name: 'Spreadsheet Software',
    description: 'Install local spreadsheet software. Unlocks Manual Cleaning.',
    category: UpgradeCategory.Tooling,
    cost: { resource: ResourceType.RawData, amount: 10 },
    effect: () => ({}), 
    purchased: false,
    visible: true,
  },
  {
    id: 'macros',
    name: 'VBA Macros',
    description: 'Simple automation scripts. Increases Manual Clean effectiveness.',
    category: UpgradeCategory.Tooling,
    cost: { resource: ResourceType.CleanData, amount: 25 },
    effect: (state) => ({ }), // Logic handled in manualClean action
    purchased: false,
    visible: false,
  },
  {
    id: 'pandas_scripts',
    name: 'Python ETL Scripts',
    description: 'Automated pipelines. Converts Raw Data to Clean Data automatically.',
    category: UpgradeCategory.Tooling,
    cost: { resource: 'PU', amount: 50 },
    effect: (state) => ({ cleanDataRate: state.cleanDataRate + 2 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'sql_optimization',
    name: 'SQL Indexing',
    description: 'Faster queries. Doubles Clean Data throughput.',
    category: UpgradeCategory.Tooling,
    cost: { resource: 'PU', amount: 200 },
    effect: (state) => ({ cleanDataRate: state.cleanDataRate * 2 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'bi_dashboards',
    name: 'BI Tool License',
    description: 'Auto-generates metrics from clean data. Increases PU gain.',
    category: UpgradeCategory.Tooling,
    cost: { resource: 'PU', amount: 500 },
    effect: (state) => ({ metricRate: state.metricRate + 1, dashboards: state.dashboards + 1 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'ocr_scanner',
    name: 'Receipt OCR',
    description: 'Digitize shoe-boxes full of receipts. Messy, but plentiful.',
    category: UpgradeCategory.Tooling,
    cost: { resource: 'PU', amount: 300 },
    effect: (state) => ({ rawDataRate: state.rawDataRate + 8, metricQuality: Math.max(0.1, state.metricQuality - 0.02) }),
    purchased: false,
    visible: false,
  },
  {
    id: 'pdf_parser',
    name: 'PDF Scraper Bot',
    description: 'Extract tables from unstructured corporate PDF reports.',
    category: UpgradeCategory.Tooling,
    cost: { resource: 'PU', amount: 1000 },
    effect: (state) => ({ rawDataRate: state.rawDataRate + 25 }),
    purchased: false,
    visible: false,
  },

  // --- Infrastructure Tree (Capacity) ---
  {
    id: 'extra_drive',
    name: 'External Hard Drive',
    description: 'Plug in a 2TB drive. Increases Raw Data storage capacity.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 20 },
    effect: (state) => ({ maxStorage: state.maxStorage + 500 }),
    purchased: false,
    visible: true,
  },
  {
    id: 'local_server',
    name: 'Local Server Rack',
    description: 'A noisy box in the corner. Increases storage significantly.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 150 },
    effect: (state) => ({ maxStorage: state.maxStorage + 5000 }), // Buffed from 2000
    purchased: false,
    visible: false,
  },
  {
    id: 'cloud_bucket',
    name: 'S3 Bucket',
    description: 'Scalable cloud storage. Massive capacity increase.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 800 },
    effect: (state) => ({ maxStorage: state.maxStorage + 25000 }), // Buffed from 10000
    purchased: false,
    visible: false,
  },
  {
    id: 'cloud_warehouse',
    name: 'Cloud Data Warehouse',
    description: 'Scalable storage & compute. Massive Clean Data processing.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 1500 },
    effect: (state) => ({ cleanDataRate: state.cleanDataRate + 20, maxStorage: state.maxStorage + 100000 }), // Buffed from 20000
    purchased: false,
    visible: false,
  },
  {
    id: 'distributed_fs',
    name: 'Distributed File System',
    description: 'Cluster commodity hardware. High availability, high capacity.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 5000 },
    effect: (state) => ({ maxStorage: state.maxStorage + 500000 }), // Buffed from 50000
    purchased: false,
    visible: false,
  },
  {
    id: 'data_lake',
    name: 'Enterprise Data Lake',
    description: 'Dump everything here. Structure later. Massive capacity.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 15000 },
    effect: (state) => ({ maxStorage: state.maxStorage + 2500000 }), // Buffed from 250k
    purchased: false,
    visible: false,
  },
  {
    id: 'data_center_5mw',
    name: '5MW Data Center',
    description: 'Dedicated facility with industrial power and cooling.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 60000 },
    effect: (state) => ({ maxStorage: state.maxStorage + 10000000 }), // Buffed from 1M
    purchased: false,
    visible: false,
  },
  {
    id: 'planetary_storage',
    name: 'Orbital Storage Array',
    description: 'Servers in space. Cold storage for the entire planet\'s history.',
    category: UpgradeCategory.Infrastructure,
    cost: { resource: 'PU', amount: 500000 },
    effect: (state) => ({ maxStorage: state.maxStorage + 100000000 }), // Buffed from 10M
    purchased: false,
    visible: false,
  },

  // --- HR Tree (Automation) ---
  {
    id: 'intern',
    name: 'Summer Intern',
    description: 'Cheap labor. Automatically generates some Clean Data, but makes mistakes.',
    category: UpgradeCategory.HR,
    cost: { resource: 'PU', amount: 100 },
    effect: (state) => ({ cleanDataRate: state.cleanDataRate + 1, metricQuality: state.metricQuality - 0.05 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'junior_analyst',
    name: 'Junior Analyst',
    description: 'Full-time help. Automatically converts Clean Data to Metrics.',
    category: UpgradeCategory.HR,
    cost: { resource: 'PU', amount: 350 },
    effect: (state) => ({ metricRate: state.metricRate + 2 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'data_scientist',
    name: 'Data Scientist',
    description: 'Highly skilled. Improves Metric Quality and generates Models.',
    category: UpgradeCategory.HR,
    cost: { resource: 'PU', amount: 2000 },
    effect: (state) => ({ metricQuality: state.metricQuality + 0.1, models: state.models + 1 }),
    purchased: false,
    visible: false,
  },

  // --- Granularity Tree (Data Volume vs Noise) ---
  {
    id: 'public_datasets',
    name: 'Public Datasets',
    description: 'Connect to open government APIs. A steady stream of boring but free data.',
    category: UpgradeCategory.Granularity,
    cost: { resource: 'PU', amount: 50 },
    effect: (state) => ({ rawDataRate: state.rawDataRate + 3 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'cookie_tracking',
    name: 'Third-Party Cookies',
    description: 'Buy data from brokers. Huge Raw Data influx, decreases Social Trust.',
    category: UpgradeCategory.Granularity,
    cost: { resource: 'PU', amount: 100 },
    effect: (state) => ({ rawDataRate: state.rawDataRate + 5, worldStats: { ...state.worldStats, socialTrust: state.worldStats.socialTrust - 5 } }),
    purchased: false,
    visible: false,
  },
  {
    id: 'segmentation',
    name: 'Micro-Segmentation',
    description: 'Slice the data thinner. Increases PU, but lowers Metric Quality.',
    category: UpgradeCategory.Granularity,
    cost: { resource: ResourceType.Metrics, amount: 50 },
    effect: (state) => ({ metricQuality: Math.max(0.1, state.metricQuality - 0.05) }),
    purchased: false,
    visible: false,
  },
  {
    id: 'event_tracking',
    name: 'Clickstream Logging',
    description: 'Track every mouse movement. Massive Raw Data, massive Noise (Entropy).',
    category: UpgradeCategory.Granularity,
    cost: { resource: 'PU', amount: 800 },
    effect: (state) => ({ rawDataRate: state.rawDataRate * 2, worldStats: { ...state.worldStats, entropy: state.worldStats.entropy + 10 } }),
    purchased: false,
    visible: false,
  },

  // --- Governance Tree (Control & Quality) ---
  {
    id: 'data_dictionary',
    name: 'Data Dictionary',
    description: 'Define terms. Slightly improves Metric Quality.',
    category: UpgradeCategory.Governance,
    cost: { resource: ResourceType.CleanData, amount: 200 },
    effect: (state) => ({ metricQuality: state.metricQuality + 0.05 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'kpi_board',
    name: 'Executive KPI Board',
    description: 'Formalize the metrics. Passive PU generation.',
    category: UpgradeCategory.Governance,
    cost: { resource: ResourceType.CleanData, amount: 500 },
    effect: (state) => ({ dashboards: state.dashboards + 2 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'gdpr_compliance',
    name: 'Privacy Compliance',
    description: 'Strict rules. Reduces Raw Data rate, but increases Social Trust.',
    category: UpgradeCategory.Governance,
    cost: { resource: 'PU', amount: 1000 },
    effect: (state) => ({ rawDataRate: state.rawDataRate * 0.8, worldStats: { ...state.worldStats, socialTrust: state.worldStats.socialTrust + 15 } }),
    purchased: false,
    visible: false,
  },
  
  // --- Scientific Tree (True Understanding) ---
  {
    id: 'randomized_experimentation',
    name: 'A/B Testing Platform',
    description: 'Scientific rigour. Increases True Understanding (TU).',
    category: UpgradeCategory.Scientific,
    cost: { resource: 'PU', amount: 1200 },
    effect: (state) => ({ tu: state.tu + 15, metricQuality: state.metricQuality + 0.1 }),
    purchased: false,
    visible: false,
  },
  {
    id: 'peer_review',
    name: 'Internal Peer Review',
    description: 'Slow down to verify. Reduces Metric Rate, increases TU per metric.',
    category: UpgradeCategory.Scientific,
    cost: { resource: 'PU', amount: 3000 },
    effect: (state) => ({ metricRate: state.metricRate * 0.8, metricQuality: state.metricQuality + 0.2 }),
    purchased: false,
    visible: false,
  },
  
  // --- END GAME ---
  {
    id: 'project_omniscience',
    name: 'Project: OMNISCIENCE',
    description: 'Merge consciousness with the data stream. The final step.',
    category: UpgradeCategory.Endgame,
    cost: { resource: 'TU', amount: 100 }, // High TU Requirement
    effect: (state) => ({ isAscending: true }), // Triggers ending
    purchased: false,
    visible: false,
  }
];

export const EVENTS: GameEvent[] = [
  {
    id: 'storage_full_warning',
    title: 'Storage Critical',
    description: 'Your local drives are completely full. Incoming data is being lost to the void. Entropy is rising.',
    type: 'bad',
    condition: (state) => state.packetLoss > 90 && state.worldStats.entropy < 90,
    effect: (state) => ({ worldStats: { ...state.worldStats, entropy: state.worldStats.entropy + 5 } }),
    triggered: false,
  },
  {
    id: 'first_dashboard',
    title: 'The First Dashboard',
    description: 'Management is impressed by the colorful charts. They have no idea what the Y-axis means, but they are happy.',
    type: 'good',
    condition: (state) => state.dashboards >= 1,
    effect: (state) => ({ pu: state.pu + 100, worldStats: { ...state.worldStats, economy: state.worldStats.economy + 2 } }),
    triggered: false,
  },
  {
    id: 'color_mandate',
    title: 'The Color Mandate',
    description: 'The VP of Marketing wants the dashboards to "pop". He suggests adding more rainbows. "Make it explode with insight!" he yells.',
    type: 'neutral',
    condition: (state) => state.dashboards >= 3 && state.pu > 500,
    effect: (state) => ({ 
        pu: state.pu + 2000, 
        metricQuality: Math.max(0.1, state.metricQuality - 0.15),
        logs: [...state.logs, { id: Date.now(), text: "Style mandate enforced. Charts are now 40% more vibrant and 15% less accurate.", type: 'warning', timestamp: Date.now() }] 
    }),
    triggered: false,
  },
  {
    id: 'excel_crash',
    title: 'Spreadsheet Limit Reached',
    description: 'You tried to load 1,048,577 rows. The application crashed. Lose some unsaved data.',
    type: 'bad',
    condition: (state) => state.rawData > 500 && state.cleanDataRate < 2,
    effect: (state) => ({ rawData: Math.floor(state.rawData * 0.5) }),
    triggered: false,
  },
  {
    id: 'viral_insight',
    title: 'Viral Infographic',
    description: 'One of your charts was shared by an influencer. It\'s completely misleading, but Perceived Understanding is skyrocketing.',
    type: 'neutral',
    condition: (state) => state.metrics > 1000 && state.metricQuality < 0.4,
    effect: (state) => ({ pu: state.pu + 5000, tu: state.tu - 10 }),
    triggered: false,
  },
  {
    id: 'data_breach',
    title: 'Data Breach',
    description: 'Security measures were insufficient. User data has leaked to the dark web. Trust collapses.',
    type: 'bad',
    condition: (state) => state.worldStats.entropy > 80 && state.worldStats.socialTrust < 40,
    effect: (state) => ({ worldStats: { ...state.worldStats, socialTrust: state.worldStats.socialTrust - 30, economy: state.worldStats.economy - 10 } }),
    triggered: false,
  },
  {
    id: 'paradigm_shift',
    title: 'Paradigm Shift',
    description: 'Your models have predicted a market crash before it happened. The world listens.',
    type: 'good',
    condition: (state) => state.tu > 100,
    effect: (state) => ({ worldStats: { ...state.worldStats, economy: 100, socialTrust: 80 } }),
    triggered: false,
  },
];

export const checkUpgradeVisibility = (state: GameState, upgrade: Upgrade): boolean => {
  if (upgrade.visible || upgrade.purchased) return true;
  
  // Dynamic unlock logic
  if (upgrade.id === 'macros' && state.upgrades['manual_excel']) return true;
  if (upgrade.id === 'pandas_scripts' && state.rawData > 200) return true;
  if (upgrade.id === 'cookie_tracking' && state.pu > 50) return true;
  if (upgrade.id === 'intern' && state.pu > 150) return true;
  if (upgrade.id === 'local_server' && state.rawData > 450) return true; // Unlock server when close to cap
  if (upgrade.id === 'sql_optimization' && state.cleanData > 500) return true;
  if (upgrade.id === 'data_dictionary' && state.metrics > 200) return true;
  if (upgrade.id === 'kpi_board' && state.dashboards > 2) return true;
  if (upgrade.id === 'bi_dashboards' && state.pu > 800) return true;
  if (upgrade.id === 'junior_analyst' && state.pu > 1000) return true;
  if (upgrade.id === 'event_tracking' && state.pu > 1500) return true;
  
  // New Upgrades Logic
  if (upgrade.id === 'public_datasets' && state.pu > 20) return true;
  if (upgrade.id === 'ocr_scanner' && state.pu > 200) return true;
  if (upgrade.id === 'pdf_parser' && state.pu > 600) return true;

  // Relaxed conditions for storage upgrades
  if (upgrade.id === 'cloud_bucket' && (state.maxStorage >= 2000 || state.packetLoss > 10)) return true;
  if (upgrade.id === 'cloud_warehouse' && (state.cleanDataRate > 10 || state.maxStorage >= 15000)) return true;
  if (upgrade.id === 'distributed_fs' && state.maxStorage >= 50000) return true;
  if (upgrade.id === 'data_lake' && state.maxStorage >= 250000) return true;
  if (upgrade.id === 'data_center_5mw' && state.maxStorage >= 1000000) return true;
  if (upgrade.id === 'planetary_storage' && state.maxStorage >= 5000000) return true;

  if (upgrade.id === 'gdpr_compliance' && state.worldStats.socialTrust < 40) return true;
  if (upgrade.id === 'randomized_experimentation' && state.tu > 20) return true;
  if (upgrade.id === 'data_scientist' && state.models > 0) return true;
  if (upgrade.id === 'peer_review' && state.tu > 50) return true;

  // Endgame - Reveal earlier so player knows the goal
  if (upgrade.id === 'project_omniscience' && state.tu > 30) return true;

  // Prestige Upgrades
  if (upgrade.category === UpgradeCategory.Neural && state.prestige.level > 0) return true;
  
  return false;
};
