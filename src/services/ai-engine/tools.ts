import { api } from "../api";
import { fetchLiveMarketData, performWebSearch } from "./generators";

// Tool executors — called by backend when tool-use is needed.
// The tool declarations are now defined server-side only.

export const toolExecutors: Record<string, (args: any) => Promise<any>> = {
    "get_current_time": async () => {
        return { currentTime: new Date().toLocaleString() };
    },
    "list_ports": async () => {
        const data = await api.ports.list();
        return data.map(p => ({
            name: p.name,
            country: p.country,
            methanolPrice: p.priceMethanol,
            status: p.details?.congestionLevel,
        }));
    },
    "search_vessels": async () => {
        return await api.vessels.list();
    },
    "search_suppliers": async ({ query }: { query?: string }) => {
        return await api.suppliers.list(query);
    },
    "get_bid_orders": async ({ search }: { search?: string }) => {
        const orders = await api.orderbook.listBids();
        if (search) {
            const lower = search.toLowerCase();
            return orders.filter((o: any) =>
                o.id.toLowerCase().includes(lower) ||
                (o.fuel_type && o.fuel_type.toLowerCase().includes(lower))
            );
        }
        return orders;
    },
    "get_inventory": async () => {
        return await api.inventory.list();
    },
    "get_market_prices": async () => {
        const result = await fetchLiveMarketData();
        if (!result) return { error: "Market data currently unavailable." };
        return result.items;
    },
    "get_notifications": async () => {
        return await api.notifications.list();
    },
    "list_training_courses": async () => {
        return await api.training.list();
    },
    "search_web": async ({ query }: { query: string }) => {
        return { result: await performWebSearch(query) };
    },
};
