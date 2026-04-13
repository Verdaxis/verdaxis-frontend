import React, { useEffect, useState } from "react";
import { Activity, MapPin, Boxes } from "lucide-react";
import { api } from "../services/api";
import { MARKET_PRODUCTS, type MarketProduct } from "../types";
import { formatMarketProduct } from "../utils/marketProduct";
import { OrderBook } from "./OrderBook";
import { VerdaxisSelect } from "./ui/VerdaxisSelect";

const ALL_PRODUCTS = "ALL_PRODUCTS";
const ALL_REGIONS = "All regions";

export const OrderBookPage: React.FC = () => {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>(ALL_REGIONS);
  const [selectedMarketProduct, setSelectedMarketProduct] = useState<string>(ALL_PRODUCTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextRegions = await api.orderbook.regions().catch(() => [] as string[]);
        if (cancelled) return;
        setRegions(nextRegions);
      } catch {
        if (!cancelled) setRegions([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto md:overflow-hidden px-4 lg:px-10 pt-4 lg:pt-8 pb-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
            <Activity size={14} />
            Live market
          </div>
          <h1 className="text-2xl lg:text-3xl v-heading">Orderbook</h1>
          <p className="text-slate-500 text-sm">Live executable bids and asks across the canonical product slices. Filter by product and region, then act on the book from Marketplace or Terminal.</p>
        </div>

        <div className="v-glass p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="v-label flex items-center gap-2"><Boxes size={14} /> Market product</label>
            <VerdaxisSelect
              value={selectedMarketProduct}
              onChange={setSelectedMarketProduct}
              options={[
                { value: ALL_PRODUCTS, label: 'All products' },
                ...MARKET_PRODUCTS.map((value) => ({ value, label: formatMarketProduct(value) })),
              ]}
              placeholder="All products"
            />
          </div>
          <div>
            <label className="v-label flex items-center gap-2"><MapPin size={14} /> Region</label>
            <VerdaxisSelect
              value={selectedRegion}
              onChange={setSelectedRegion}
              options={[ALL_REGIONS, ...regions].map((value) => ({ value, label: value }))}
              placeholder={ALL_REGIONS}
            />
          </div>
        </div>

        <div className="min-h-[520px]">
          <OrderBook
            marketProduct={selectedMarketProduct === ALL_PRODUCTS ? undefined : selectedMarketProduct as MarketProduct}
            region={selectedRegion === ALL_REGIONS ? undefined : selectedRegion}
          />
        </div>
      </div>
    </div>
  );
};
