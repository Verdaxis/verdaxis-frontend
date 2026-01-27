
import { Port, Vessel, Supplier, Course, QuoteRequest, TraceEvent, Notification, MarketWatchItem, InventoryItem } from './types';

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
            lastDone: "1,200MT @ $519"
        }
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
            lastDone: "800MT @ $544"
        }
    },
    {
        id: 'be-ant',
        name: 'Antwerp',
        location: { lat: 51.2194, lng: 4.4025 },
        country: 'Belgium',
        methanolSupply: 'High',
        biofuelSupply: 'High',
        priceMethanol: 548,
        priceTrend: -0.2,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 8,
            activeBarges: 6,
            forecastSupply: 'Balanced',
            priceHistory: [552, 550, 548, 548, 549, 548, 548],
            plattsPrice: 546.50,
            ffaPrice: 545.00,
            swapPrice: 547.00,
            lastDone: "500MT @ $547"
        }
    },
    {
        id: 'de-ham',
        name: 'Hamburg',
        location: { lat: 53.5488, lng: 9.9872 },
        country: 'Germany',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 555,
        priceTrend: -0.8,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 6,
            activeBarges: 4,
            forecastSupply: 'Balanced',
            priceHistory: [560, 558, 555, 554, 555, 556, 555],
            plattsPrice: 552.00,
            ffaPrice: 550.00,
            swapPrice: 551.00,
            lastDone: "2,000MT @ $553"
        }
    },
    {
        id: 'us-hou',
        name: 'Houston',
        location: { lat: 29.7604, lng: -95.3698 },
        country: 'USA',
        methanolSupply: 'High',
        biofuelSupply: 'Low',
        priceMethanol: 480,
        priceTrend: 1.2,
        details: {
            congestionLevel: 'Low',
            avgWaitingTime: 3,
            activeBarges: 10,
            forecastSupply: 'Surplus',
            priceHistory: [475, 478, 480, 480, 482, 481, 480],
            plattsPrice: 478.00,
            ffaPrice: 485.00,
            swapPrice: 482.00,
            lastDone: "3,500MT @ $479"
        }
    },
    {
        id: 'us-nyc',
        name: 'New York',
        location: { lat: 40.7128, lng: -74.0060 },
        country: 'USA',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 505,
        priceTrend: 0.3
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
            lastDone: "1,000MT @ $511"
        }
    },
    {
        id: 'cn-hkg',
        name: 'Hong Kong',
        location: { lat: 22.3193, lng: 114.1694 },
        country: 'China',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 525,
        priceTrend: 1.5
    },
    {
        id: 'kr-bus',
        name: 'Busan',
        location: { lat: 35.1028, lng: 129.0403 },
        country: 'South Korea',
        methanolSupply: 'Low',
        biofuelSupply: 'Medium',
        priceMethanol: 535,
        priceTrend: 1.8
    },
    {
        id: 'my-ptp',
        name: 'Tanjung Pelepas',
        location: { lat: 1.3635, lng: 103.5442 },
        country: 'Malaysia',
        methanolSupply: 'Low',
        biofuelSupply: 'High',
        priceMethanol: 535,
        priceTrend: 1.2
    },
    {
        id: 'gi-gib',
        name: 'Gibraltar',
        location: { lat: 36.1408, lng: -5.3536 },
        country: 'Gibraltar',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 560,
        priceTrend: 0.5
    },
    {
        id: 'ae-jeb',
        name: 'Jebel Ali',
        location: { lat: 24.9857, lng: 55.0273 },
        country: 'UAE',
        methanolSupply: 'Low',
        biofuelSupply: 'Medium',
        priceMethanol: 590,
        priceTrend: 0.0
    },
    {
        id: 'ae-fjr',
        name: 'Fujairah',
        location: { lat: 25.1288, lng: 56.3265 },
        country: 'UAE',
        methanolSupply: 'Low',
        biofuelSupply: 'Low',
        priceMethanol: 610,
        priceTrend: 0.5,
        details: {
            congestionLevel: 'High',
            avgWaitingTime: 24,
            activeBarges: 12,
            forecastSupply: 'Tight',
            priceHistory: [600, 605, 608, 610, 610, 612, 610],
            plattsPrice: 608.00,
            ffaPrice: 615.00,
            swapPrice: 610.00,
            lastDone: "500MT @ $612"
        }
    },
    {
        id: 'pa-bal',
        name: 'Balboa',
        location: { lat: 8.9593, lng: -79.5732 },
        country: 'Panama',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 515,
        priceTrend: -1.5
    },
    {
        id: 'jp-tok',
        name: 'Tokyo',
        location: { lat: 35.6895, lng: 139.6917 },
        country: 'Japan',
        methanolSupply: 'High',
        biofuelSupply: 'Medium',
        priceMethanol: 530,
        priceTrend: 1.0,
        details: {
            congestionLevel: 'Moderate',
            avgWaitingTime: 10,
            activeBarges: 7,
            forecastSupply: 'Balanced',
            priceHistory: [525, 528, 530, 532, 530, 529, 530],
            plattsPrice: 528.00,
            ffaPrice: 535.00,
            swapPrice: 530.00,
            lastDone: "1,500MT @ $529"
        }
    },
    {
        id: 'us-lax',
        name: 'Los Angeles',
        location: { lat: 33.7547, lng: -118.2713 },
        country: 'USA',
        methanolSupply: 'Medium',
        biofuelSupply: 'High',
        priceMethanol: 495,
        priceTrend: 0.8,
        details: {
            congestionLevel: 'High',
            avgWaitingTime: 18,
            activeBarges: 6,
            forecastSupply: 'Tight',
            priceHistory: [490, 492, 495, 494, 495, 497, 495],
            plattsPrice: 492.00,
            ffaPrice: 500.00,
            swapPrice: 496.00,
            lastDone: "2,000MT @ $498"
        }
    },
    {
        id: 'es-alg',
        name: 'Algeciras',
        location: { lat: 36.1368, lng: -5.4377 },
        country: 'Spain',
        methanolSupply: 'Medium',
        biofuelSupply: 'Medium',
        priceMethanol: 555,
        priceTrend: 0.2
    },
    {
        id: 'lk-cmb',
        name: 'Colombo',
        location: { lat: 6.9319, lng: 79.8478 },
        country: 'Sri Lanka',
        methanolSupply: 'Low',
        biofuelSupply: 'Low',
        priceMethanol: 570,
        priceTrend: -0.1
    },
    {
        id: 'br-ssz',
        name: 'Santos',
        location: { lat: -23.9618, lng: -46.3322 },
        country: 'Brazil',
        methanolSupply: 'Low',
        biofuelSupply: 'High',
        priceMethanol: 580,
        priceTrend: -1.2,
        details: {
            congestionLevel: 'High',
            avgWaitingTime: 36,
            activeBarges: 5,
            forecastSupply: 'Surplus',
            priceHistory: [590, 588, 585, 582, 580, 578, 580],
            plattsPrice: 575.00,
            ffaPrice: 585.00,
            swapPrice: 582.00,
            lastDone: "300MT @ $578"
        }
    },
    {
        id: 'za-dur',
        name: 'Durban',
        location: { lat: -29.8587, lng: 31.0218 },
        country: 'South Africa',
        methanolSupply: 'Low',
        biofuelSupply: 'Low',
        priceMethanol: 650,
        priceTrend: 0.0
    },
    {
        id: 'in-mun',
        name: 'Mundra',
        location: { lat: 22.8390, lng: 69.7130 },
        country: 'India',
        methanolSupply: 'Low',
        biofuelSupply: 'Medium',
        priceMethanol: 595,
        priceTrend: 2.5
    }
];

export const VESSELS: Vessel[] = [
    { 
        id: 'v1', 
        name: 'Verdaxis Pioneer', 
        imo: '9812345', 
        vesselType: 'Container Ship',
        status: 'At Sea', 
        complianceEUETS: 'Compliant', 
        complianceFuelEU: 'Compliant',
        ciiGrade: 'B',
        nextVoyage: 'Singapore -> Rotterdam',
        nextDryDock: '2025-Q3'
    },
    { 
        id: 'v2', 
        name: 'Ocean Guardian', 
        imo: '9823456', 
        vesselType: 'Bulk Carrier',
        status: 'In Port', 
        complianceEUETS: 'Warning', 
        complianceFuelEU: 'Compliant',
        ciiGrade: 'C',
        nextVoyage: 'Houston -> Hamburg',
        nextDryDock: '2024-Q4'
    },
    { 
        id: 'v3', 
        name: 'Green Horizon', 
        imo: '9834567', 
        vesselType: 'LNG Tanker',
        status: 'At Sea', 
        complianceEUETS: 'Compliant', 
        complianceFuelEU: 'Warning',
        ciiGrade: 'D',
        nextVoyage: 'Rotterdam -> Shanghai',
        nextDryDock: '2025-Q1'
    },
    { 
        id: 'v4', 
        name: 'Nordic Star', 
        imo: '9123456', 
        vesselType: 'Ro-Ro',
        status: 'At Sea', 
        complianceEUETS: 'Compliant', 
        complianceFuelEU: 'Compliant',
        ciiGrade: 'A',
        nextVoyage: 'Long Beach -> Tokyo',
        nextDryDock: '2026-Q2'
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
        ports: ['nl-rtm', 'be-ant'], 
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

// Enriched mock requests for Supplier view
export const MOCK_REQUESTS: QuoteRequest[] = [
    { 
        id: 'qr-101', portId: 'sg-sin', fuelType: 'Methanol', quantity: 500, deliveryDate: '2023-11-15', vesselId: 'v1', status: 'Pending', buyerName: 'Global Shipping Co.',
        buyerRiskProfile: { creditScore: 90, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'AA', avgPaymentDays: 28 }
    },
    { 
        id: 'qr-102', portId: 'nl-rtm', fuelType: 'Biofuel', quantity: 200, deliveryDate: '2023-11-18', vesselId: 'v2', status: 'Quoted', supplierId: 's2', price: 110000, buyerName: 'Oceanic Freight',
        buyerRiskProfile: { creditScore: 82, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'A', avgPaymentDays: 35 }
    },
    { id: 'qr-103', portId: 'nl-rtm', fuelType: 'LNG', quantity: 1500, deliveryDate: '2023-11-20', vesselId: 'v3', status: 'Pending', buyerName: 'Blue Horizon Logistics',
        buyerRiskProfile: { creditScore: 75, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 15', solvencyGrade: 'B', avgPaymentDays: 42 }
    },
    { id: 'qr-104', portId: 'sg-sin', fuelType: 'Biofuel', quantity: 800, deliveryDate: '2023-11-22', vesselId: 'v4', status: 'Confirmed', supplierId: 's1', price: 624000, buyerName: 'Global Shipping Co.',
        buyerRiskProfile: { creditScore: 90, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'AA', avgPaymentDays: 28 }
    },
    { id: 'qr-105', portId: 'us-hou', fuelType: 'Methanol', quantity: 1200, deliveryDate: '2023-12-01', vesselId: 'v1', status: 'Quoted', supplierId: 's3', price: 576000, buyerName: 'Global Shipping Co.',
        buyerRiskProfile: { creditScore: 90, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'AA', avgPaymentDays: 28 }
    },
    { id: 'qr-106', portId: 'cn-sha', fuelType: 'Methanol', quantity: 450, deliveryDate: '2023-12-05', vesselId: 'v2', status: 'Pending', buyerName: 'East Sea Trans',
        buyerRiskProfile: { creditScore: 65, kybStatus: 'Pending', sanctionsClear: true, paymentTerms: 'Prepayment', solvencyGrade: 'C', avgPaymentDays: 55 }
    },
    { id: 'qr-107', portId: 'sg-sin', fuelType: 'Biofuel', quantity: 300, deliveryDate: '2023-12-08', vesselId: 'v4', status: 'Confirmed', supplierId: 's1', price: 234000, buyerName: 'Nordic Lines',
        buyerRiskProfile: { creditScore: 88, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 45', solvencyGrade: 'A', avgPaymentDays: 30 }
    },
    { id: 'qr-108', portId: 'gi-gib', fuelType: 'Biofuel', quantity: 600, deliveryDate: '2023-12-10', vesselId: 'v1', status: 'Pending', buyerName: 'Med Logistica',
        buyerRiskProfile: { creditScore: 78, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'B', avgPaymentDays: 38 }
    },
    { id: 'qr-109', portId: 'be-ant', fuelType: 'Methanol', quantity: 1000, deliveryDate: '2023-12-12', vesselId: 'v3', status: 'Pending', buyerName: 'Atlantic Carriers',
        buyerRiskProfile: { creditScore: 92, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 60', solvencyGrade: 'AAA', avgPaymentDays: 25 }
    },
    { id: 'qr-110', portId: 'kr-bus', fuelType: 'Ammonia (Green)', quantity: 2500, deliveryDate: '2023-12-15', vesselId: 'v2', status: 'Quoted', supplierId: 's1', price: 1450000, buyerName: 'Pacific Rim Shipping',
        buyerRiskProfile: { creditScore: 85, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'A', avgPaymentDays: 32 }
    },
    { id: 'qr-111', portId: 'pa-bal', fuelType: 'Biofuel', quantity: 400, deliveryDate: '2023-12-18', vesselId: 'v4', status: 'Pending', buyerName: 'Americas Freight',
        buyerRiskProfile: { creditScore: 70, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'B', avgPaymentDays: 45 }
    },
    { id: 'qr-112', portId: 'nl-rtm', fuelType: 'Methanol', quantity: 850, deliveryDate: '2023-12-20', vesselId: 'v1', status: 'Confirmed', supplierId: 's2', price: 463250, buyerName: 'Global Shipping Co.',
        buyerRiskProfile: { creditScore: 90, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'AA', avgPaymentDays: 28 }
    },
    { id: 'qr-113', portId: 'ae-jeb', fuelType: 'Biofuel', quantity: 1500, deliveryDate: '2023-12-22', vesselId: 'v3', status: 'Pending', buyerName: 'Gulf Stream Tankers',
        buyerRiskProfile: { creditScore: 81, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 45', solvencyGrade: 'A', avgPaymentDays: 40 }
    },
    { id: 'qr-114', portId: 'be-ant', fuelType: 'LNG', quantity: 3000, deliveryDate: '2023-12-24', vesselId: 'v2', status: 'Quoted', supplierId: 's2', price: 1950000, buyerName: 'North Sea Logistics',
        buyerRiskProfile: { creditScore: 89, kybStatus: 'Verified', sanctionsClear: true, paymentTerms: 'Net 30', solvencyGrade: 'A', avgPaymentDays: 29 }
    },
    { id: 'qr-115', portId: 'sg-sin', fuelType: 'Ammonia (Green)', quantity: 500, deliveryDate: '2023-12-28', vesselId: 'v4', status: 'Pending', buyerName: 'Future Energy Maritime',
        buyerRiskProfile: { creditScore: 60, kybStatus: 'Pending', sanctionsClear: true, paymentTerms: 'Prepayment', solvencyGrade: 'C', avgPaymentDays: 60 }
    }
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

export const NOTIFICATIONS: Notification[] = [
    { id: 1, title: 'New RFQ Received', desc: 'Global Shipping Co. requested 500MT Methanol', time: '10m ago', type: 'info' },
    { id: 2, title: 'Compliance Alert', desc: 'Vessel Ocean Guardian approaching CII limit', time: '2h ago', type: 'warning' },
    { id: 3, title: 'Order Confirmed', desc: 'Bunkering schedule confirmed for Nov 15', time: '1d ago', type: 'success' },
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
    { id: 'inv-3', productName: 'LSMGO', portId: 'nl-rtm', portName: 'Rotterdam', currentStock: 3500, incomingStock: 0, pricePerMt: 620, status: 'Available' },
    { id: 'inv-4', productName: 'Green Methanol', portId: 'jp-tok', portName: 'Tokyo', currentStock: 800, incomingStock: 200, pricePerMt: 530, status: 'Available' },
    { id: 'inv-5', productName: 'Biofuel B100', portId: 'us-lax', portName: 'Los Angeles', currentStock: 600, incomingStock: 1500, pricePerMt: 820, status: 'Low Stock' },
];
