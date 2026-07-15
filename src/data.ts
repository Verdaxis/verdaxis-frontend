
import { Port, Supplier, Course, TraceEvent, MarketWatchItem, InventoryItem } from './types';

export const APPROVED_TRADING_PORTS = [
    'Dalian',
    'Busan',
    'Shanghai',
    'Singapore',
    'Rotterdam',
    'Houston',
    'Los Angeles',
    'Santos',
] as const;

export const PORTS: Port[] = [
    {
        id: 'sg-sin',
        name: 'Singapore',
        location: { lat: 1.29027, lng: 103.851959 },
        country: 'Singapore',
        methanolSupply: 'High',
        biofuelSupply: 'High',
        priceMethanol: 520,
        priceTrend: 2.1,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 12,
            activeBarges: 8,
            forecastSupply: 'Balanced',
            priceHistory: [510, 512, 515, 518, 520, 522, 520],
            plattsPrice: 518.50,
            ffaPrice: 525.00,
            swapPrice: 522.10,
            lastDone: '1,200MT @ $519',
            upcomingProjects: [
                { year: '2027 Q1', project: 'Jurong Green Methanol', capacity: '500kt' },
                { year: '2028 Q3', project: 'Tuas Synthetic Fuel Terminal', capacity: '1.2Mt' },
            ],
        },
    },
    {
        id: 'cn-sha',
        name: 'Shanghai',
        location: { lat: 31.2304, lng: 121.4737 },
        country: 'China',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 510,
        priceTrend: 3.5,
        details: {
            congestionLevel: 'High',
            avgWaitingTime: 24,
            activeBarges: 15,
            forecastSupply: 'Tight',
            priceHistory: [500, 505, 508, 510, 512, 515, 510],
            plattsPrice: 508.00,
            ffaPrice: 515.00,
            swapPrice: 512.00,
            lastDone: '1,000MT @ $511',
            upcomingProjects: [
                { year: '2027 Q4', project: 'Yangshan e-Methanol Pilot', capacity: '50kt' },
            ],
        },
    },
    {
        id: 'cn-dlc',
        name: 'Dalian',
        location: { lat: 38.914, lng: 121.6147 },
        country: 'China',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 498,
        priceTrend: 1.1,
        details: {
            congestionLevel: 'Low',
            avgWaitingTime: 7,
            activeBarges: 6,
            forecastSupply: 'Balanced',
            priceHistory: [492, 494, 495, 497, 499, 500, 498],
            plattsPrice: 496.00,
            ffaPrice: 501.00,
            swapPrice: 498.20,
            lastDone: '900MT @ $497',
        },
    },
    {
        id: 'kr-bus',
        name: 'Busan',
        location: { lat: 35.1796, lng: 129.0756 },
        country: 'South Korea',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 515,
        priceTrend: 1.8,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 10,
            activeBarges: 7,
            forecastSupply: 'Balanced',
            priceHistory: [505, 508, 510, 512, 514, 516, 515],
            plattsPrice: 513.00,
            ffaPrice: 518.00,
            swapPrice: 515.40,
            lastDone: '850MT @ $514',
        },
    },
    {
        id: 'nl-rtm',
        name: 'Rotterdam',
        location: { lat: 51.9225, lng: 4.47917 },
        country: 'Netherlands',
        methanolSupply: 'High',
        biofuelSupply: 'Medium',
        priceMethanol: 545,
        priceTrend: -0.5,
        details: {
            congestionLevel: 'Low',
            avgWaitingTime: 4,
            activeBarges: 5,
            forecastSupply: 'Surplus',
            priceHistory: [550, 548, 546, 545, 545, 544, 545],
            plattsPrice: 542.00,
            ffaPrice: 540.00,
            swapPrice: 541.50,
            lastDone: '800MT @ $544',
            upcomingProjects: [
                { year: '2026 Q2', project: 'Maasvlakte Bio-Methanol', capacity: '200kt' },
            ],
        },
    },
    {
        id: 'us-hou',
        name: 'Houston',
        location: { lat: 29.7604, lng: -95.3698 },
        country: 'United States',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 505,
        priceTrend: 0.7,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 9,
            activeBarges: 7,
            forecastSupply: 'Balanced',
            priceHistory: [498, 500, 502, 504, 505, 506, 505],
            plattsPrice: 503.50,
            ffaPrice: 507.00,
            swapPrice: 505.80,
            lastDone: '1,100MT @ $505',
        },
    },
    {
        id: 'us-lax',
        name: 'Los Angeles',
        location: { lat: 33.7405, lng: -118.2775 },
        country: 'United States',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 535,
        priceTrend: 1.3,
        details: {
            congestionLevel: 'High',
            avgWaitingTime: 18,
            activeBarges: 9,
            forecastSupply: 'Tight',
            priceHistory: [526, 528, 531, 533, 536, 537, 535],
            plattsPrice: 533.50,
            ffaPrice: 539.00,
            swapPrice: 535.90,
            lastDone: '650MT @ $536',
        },
    },
    {
        id: 'br-ssz',
        name: 'Santos',
        location: { lat: -23.9608, lng: -46.3336 },
        country: 'Brazil',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 488,
        priceTrend: 0.9,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 11,
            activeBarges: 6,
            forecastSupply: 'Balanced',
            priceHistory: [482, 484, 486, 487, 489, 490, 488],
            plattsPrice: 486.50,
            ffaPrice: 491.00,
            swapPrice: 488.60,
            lastDone: '900MT @ $489',
        },
    },
];

export const SUPPLIERS: Supplier[] = [
    { 
        id: 's1', 
        name: 'Global Green Fuels Ltd', 
        rating: 4.9, 
        isVerdaxisCertified: true, 
        ports: ['sg-sin', 'cn-sha', 'kr-bus'], 
        availableStock: 5000,
        energyDensity: 19.9, // Methanol
        lastDonePrice: 518,
        riskProfile: {
            creditScore: 94,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    {
        id: 's2',
        name: 'EuroChem Marine',
        rating: 4.7,
        isVerdaxisCertified: true,
        ports: ['nl-rtm', 'us-hou'],
        availableStock: 1200,
        energyDensity: 37.0, // Biofuel Blend
        lastDonePrice: 550,
        riskProfile: {
            creditScore: 88,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 45'
        }
    },
    { 
        id: 's3', 
        name: 'Houston Energy Partners', 
        rating: 4.2, 
        isVerdaxisCertified: false, 
        ports: ['us-hou', 'pa-bal'], 
        availableStock: 8000,
        energyDensity: 19.8,
        lastDonePrice: 475,
        riskProfile: {
            creditScore: 72,
            kybStatus: 'Pending',
            sanctionsClear: true,
            paymentTerms: 'Prepayment'
        }
    },
    { 
        id: 's4', 
        name: 'Gibraltar Strait Bunkers', 
        rating: 4.5, 
        isVerdaxisCertified: true, 
        ports: ['gi-gib'], 
        availableStock: 2500,
        energyDensity: 36.5,
        lastDonePrice: 565,
        riskProfile: {
            creditScore: 85,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    { 
        id: 's5', 
        name: 'Panama Canal Fuels', 
        rating: 4.0, 
        isVerdaxisCertified: false, 
        ports: ['pa-bal'], 
        availableStock: 4000,
        energyDensity: 37.2,
        lastDonePrice: 510,
        riskProfile: {
            creditScore: 68,
            kybStatus: 'Unverified',
            sanctionsClear: true,
            paymentTerms: 'Prepayment'
        }
    },
    { 
        id: 's6', 
        name: 'Asia Pacific Bunkers', 
        rating: 4.8, 
        isVerdaxisCertified: true, 
        ports: ['jp-tok', 'cn-sha'], 
        availableStock: 6000,
        energyDensity: 19.9,
        lastDonePrice: 525,
        riskProfile: {
            creditScore: 91,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    { 
        id: 's7', 
        name: 'California Clean Fuels', 
        rating: 4.3, 
        isVerdaxisCertified: false, 
        ports: ['us-lax', 'us-hou'], 
        availableStock: 3000,
        energyDensity: 37.1, // Biofuel
        lastDonePrice: 490,
        riskProfile: {
            creditScore: 78,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 15'
        }
    },
    { 
        id: 's8', 
        name: 'Mediterranean Marine Fuel', 
        rating: 4.6, 
        isVerdaxisCertified: true, 
        ports: ['es-alg', 'gi-gib'], 
        availableStock: 2000,
        energyDensity: 19.8,
        lastDonePrice: 550,
        riskProfile: {
            creditScore: 87,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    { 
        id: 's9', 
        name: 'Oceanic Traders Group', 
        rating: 3.9, 
        isVerdaxisCertified: false, 
        ports: ['sg-sin', 'lk-cmb'], 
        availableStock: 7500,
        energyDensity: 19.7,
        lastDonePrice: 560,
        riskProfile: {
            creditScore: 62,
            kybStatus: 'Pending',
            sanctionsClear: true,
            paymentTerms: 'Prepayment'
        }
    },
    {
        id: 's10',
        name: 'Hanseatic Bunkering GmbH',
        rating: 4.8,
        isVerdaxisCertified: true,
        ports: ['de-ham', 'nl-rtm'],
        availableStock: 3200,
        energyDensity: 19.9,
        lastDonePrice: 558,
        riskProfile: {
            creditScore: 92,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 45'
        }
    },
    {
        id: 's11',
        name: 'Fujairah Oil & Green Fuels',
        rating: 4.1,
        isVerdaxisCertified: false,
        ports: ['ae-fjr', 'ae-jeb'],
        availableStock: 15000,
        energyDensity: 40.2,
        lastDonePrice: 605,
        riskProfile: {
            creditScore: 80,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    {
        id: 's12',
        name: 'Pearl River Energy',
        rating: 4.4,
        isVerdaxisCertified: true,
        ports: ['cn-hkg', 'cn-sha'],
        availableStock: 4500,
        energyDensity: 19.8,
        lastDonePrice: 528,
        riskProfile: {
            creditScore: 86,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    },
    {
        id: 's13',
        name: 'Amazonas Bio-Marine',
        rating: 4.9,
        isVerdaxisCertified: true,
        ports: ['br-ssz'],
        availableStock: 9000,
        energyDensity: 38.5,
        lastDonePrice: 580,
        riskProfile: {
            creditScore: 75,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 15'
        }
    },
    {
        id: 's14',
        name: 'Liberty Marine Energy',
        rating: 4.3,
        isVerdaxisCertified: false,
        ports: ['us-nyc', 'us-hou'],
        availableStock: 2800,
        energyDensity: 37.0,
        lastDonePrice: 508,
        riskProfile: {
            creditScore: 89,
            kybStatus: 'Verified',
            sanctionsClear: true,
            paymentTerms: 'Net 30'
        }
    }
];

export const COURSES: Course[] = [
    { 
        id: 'c1', 
        title: 'Methanol Bunkering Safety L2', 
        description: 'Essential safety and handling procedures for crews working with methanol fuel.',
        duration: '4 Hours', 
        category: 'Safety', 
        requiredForFuel: ['Methanol'],
        level: 'Intermediate',
        syllabus: [
            "Introduction to Methanol as a Marine Fuel",
            "Material Safety Data Sheet (MSDS) Review",
            "PPE Requirements & Handling",
            "Emergency Response for Spills",
            "Final Assessment"
        ]
    },
    { 
        id: 'c2', 
        title: 'EU ETS Reporting Standards', 
        description: 'Master the monitoring, reporting, and verification requirements for EU ETS.',
        duration: '2 Hours', 
        category: 'Compliance', 
        requiredForFuel: [],
        level: 'Advanced',
        syllabus: [
            "EU ETS Scope & Application",
            "Calculating Allowances (EUA)",
            "MRV Documentation Protocols",
            "Risk Management Strategies"
        ]
    },
    { 
        id: 'c3', 
        title: 'Biofuel Handling & Stability', 
        description: 'Best practices for storage, stability management, and usage of B24/B100 biofuels.',
        duration: '3 Hours', 
        category: 'Technical', 
        requiredForFuel: ['Biofuel'],
        level: 'Beginner',
        syllabus: [
            "Biofuel Properties & Oxidation Stability",
            "Storage Tank Preparation",
            "Filter Management & Maintenance",
            "Compatibility Testing"
        ]
    },
];

export const TRACE_EVENTS: TraceEvent[] = [
    {
        id: 'tr-1',
        stage: 'Origin',
        location: 'Dumai, Indonesia',
        timestamp: '2023-09-15 08:30',
        description: 'UCO Biomass Collection',
        verificationType: 'Document',
        verificationId: 'ISCC-EU-100-29933',
        status: 'Verified'
    },
    {
        id: 'tr-2',
        stage: 'Production',
        location: 'Jurong Island, Singapore',
        timestamp: '2023-10-02 14:15',
        description: 'Refinement to B100 Biofuel',
        verificationType: 'Digital Twin',
        verificationId: 'Batch #8821-B',
        status: 'Verified'
    },
    {
        id: 'tr-3',
        stage: 'Bunkering',
        location: 'Singapore Anchorage',
        timestamp: '2023-11-10 09:45',
        description: 'Transfer to Verdaxis Pioneer',
        verificationType: 'Physical Tracer',
        verificationId: 'Nanolumi Tag #992-AX',
        status: 'Verified'
    },
];

export const MARKET_WATCH_ITEMS: MarketWatchItem[] = [
    { pair: 'VLSFO-Methanol Spread', val: '$120.50', change: '-2.1%', up: false },
    { pair: 'EUA Carbon', val: '€85.20', change: '+0.5%', up: true },
    { pair: 'Brent Crude', val: '$82.40', change: '+1.1%', up: true },
    { pair: 'LNG (RTM)', val: '$680.00', change: '-0.4%', up: false },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
    { id: 'inv-1', productName: 'Green Methanol', portId: 'nl-rtm', portName: 'Rotterdam', currentStock: 1200, incomingStock: 500, pricePerMt: 545, status: 'Available' },
    { id: 'inv-2', productName: 'Biofuel B24', portId: 'nl-rtm', portName: 'Rotterdam', currentStock: 450, incomingStock: 1000, pricePerMt: 780, status: 'Low Stock' },
    { id: 'inv-3', productName: 'Biomethane', portId: 'nl-rtm', portName: 'Rotterdam', currentStock: 2800, incomingStock: 600, pricePerMt: 850, status: 'Available' },
    { id: 'inv-4', productName: 'Green Methanol', portId: 'jp-tok', portName: 'Tokyo', currentStock: 800, incomingStock: 200, pricePerMt: 530, status: 'Available' },
    { id: 'inv-5', productName: 'Biofuel B100', portId: 'us-lax', portName: 'Los Angeles', currentStock: 600, incomingStock: 1500, pricePerMt: 820, status: 'Low Stock' },
];
