
import { FunctionDeclaration, Tool, Type } from "@google/genai";
import { api } from "../api";
import { fetchLiveMarketData, performWebSearch } from "./generators";

// --- TOOL DEFINITIONS ---

export const get_current_time: FunctionDeclaration = {
    name: "get_current_time",
    description: "Get the current server date and time.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const list_ports: FunctionDeclaration = {
    name: "list_ports",
    description: "List all available ports including fuel prices and congestion levels.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const search_vessels: FunctionDeclaration = {
    name: "search_vessels",
    description: "Get a list of vessels in the fleet, including their location, IMO, and compliance status.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const search_suppliers: FunctionDeclaration = {
    name: "search_suppliers",
    description: "Search for fuel suppliers. Can filter by port name or general query.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "Port name (e.g., 'Rotterdam') or Supplier name." }
        }
    }
};

export const get_direct_orders: FunctionDeclaration = {
    name: "get_direct_orders",
    description: "Get active direct orders (formerly RFQs).",
    parameters: {
        type: Type.OBJECT,
        properties: {
            search: { type: Type.STRING, description: "Optional filter for ID or details." }
        }
    }
};

export const get_inventory: FunctionDeclaration = {
    name: "get_inventory",
    description: "Check current fuel inventory levels.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const get_market_prices: FunctionDeclaration = {
    name: "get_market_prices",
    description: "Get current live market prices for commodities like EUAs (Carbon Permits), Brent Crude, Methanol Spreads, and LNG.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const get_notifications: FunctionDeclaration = {
    name: "get_notifications",
    description: "Get the latest system notifications and alerts for the user.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const list_training_courses: FunctionDeclaration = {
    name: "list_training_courses",
    description: "List available training courses for crew certification and compliance.",
    parameters: { type: Type.OBJECT, properties: {} }
};

export const search_web: FunctionDeclaration = {
    name: "search_web",
    description: "Search the internet for real-time news, weather, or general knowledge.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "The search query." }
        },
        required: ["query"]
    }
};

export const tools: Tool[] = [
    {
        functionDeclarations: [
            get_current_time,
            list_ports,
            search_vessels,
            search_suppliers,
            get_direct_orders,
            get_inventory,
            get_market_prices,
            get_notifications,
            list_training_courses,
            search_web
        ]
    }
];

// --- TOOL EXECUTORS ---

export const toolExecutors: Record<string, (args: any) => Promise<any>> = {
    "get_current_time": async () => {
        return { currentTime: new Date().toLocaleString() };
    },
    "list_ports": async () => {
        const data = await api.ports.list();
        // Simplify output to save tokens
        return data.map(p => ({ 
            name: p.name, 
            country: p.country, 
            methanolPrice: p.priceMethanol,
            status: p.details?.congestionLevel 
        }));
    },
    "search_vessels": async () => {
        return await api.vessels.list();
    },
    "search_suppliers": async ({ query }) => {
        return await api.suppliers.list(query);
    },
    "get_direct_orders": async ({ search }) => {
        const orders = await api.directOrders.list();
        if (search) {
             const lower = search.toLowerCase();
             return orders.filter(o => 
                 o.id.toLowerCase().includes(lower) || 
                 (o.fuelType && o.fuelType.toLowerCase().includes(lower))
             );
        }
        return orders;
    },
    "get_inventory": async () => {
        return await api.inventory.list();
    },
    "get_market_prices": async () => {
        const data = await fetchLiveMarketData();
        if (!data) return { error: "Market data currently unavailable. The external feed may be down." };
        return data;
    },
    "get_notifications": async () => {
        return await api.notifications.list();
    },
    "list_training_courses": async () => {
        return await api.training.list();
    },
    "search_web": async ({ query }) => {
        return { result: await performWebSearch(query) };
    }
};
