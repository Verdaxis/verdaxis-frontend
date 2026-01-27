# Verdaxis Intelligence Cockpit - Developer Handbook

> **Current Version:** v0.9 (High-Fidelity Demo)  
> **Tech Stack:** React 18, TypeScript, Tailwind CSS, Leaflet, Google Gemini AI  
> **Status:** Client-Side Simulated Backend

---

## 1. Project Overview

Verdaxis is a financial-grade maritime intelligence platform designed to handle the procurement of alternative green fuels (Methanol, Ammonia, Biofuel) and manage complex EU regulatory compliance (EU ETS, FuelEU Maritime).

**Core Value Propositions:**
1.  **Intelligence Map:** Geospatial visualization of fuel supply, price arbitrage, and port congestion.
2.  **Marketplace:** End-to-end RFQ (Request for Quote) management with credit risk integration.
3.  **Compliance Engine:** Automated tracking of carbon allowances and document verification.
4.  **AI Copilot:** Natural language interface for complex querying and market narratives.

---

## 2. Current Architecture (The Demo Stack)

This project is currently architected as a **Standalone Frontend** that simulates a backend environment. This allows for rapid prototyping and zero-setup demos while maintaining a code structure that is ready for production migration.

### A. The "Simulated Backend" (`services/api.ts`)
Instead of making `fetch()` calls to a real server, the app imports `services/api.ts`.
*   **What it does:** It maintains an in-memory database state (`db_quotes`, `db_inventory`) initialized from `data.ts`.
*   **Latency:** It artificially injects 300ms - 800ms delays to mimic real-world network conditions.
*   **Usage:**
    ```typescript
    // Current (Demo)
    const data = await api.quotes.list(); 
    
    // Future (Production)
    // This will be easily refactored to:
    // const { data } = await axios.get('/api/v1/quotes');
    ```

### B. Data Model (`types.ts` & `data.ts`)
*   **Strict Typing:** All entities (Vessels, Ports, Quotes) are strictly typed interfaces.
*   **Seed Data:** `data.ts` contains the static "Golden Path" data used to impress investors/users during the demo.

### C. AI Integration (`services/ai.ts`)
*   **Provider:** Google Gemini API (via `@google/genai`).
*   **Features:**
    *   **Copilot:** Renders Markdown responses.
    *   **Market Narrative:** Generates "financial news" style summaries for ports.
    *   **Risk Radar:** Evaluates counterparty credit risk.
*   **Note:** The API Key is currently consumed from `process.env` in the frontend. **In production, this must move to a backend proxy** to prevent key leakage.

---

## 3. Migration Roadmap (Demo -> Production)

To turn this into a real platform, follow this execution plan:

### Phase 1: The Backend Foundation
1.  **Database:** Spin up a **PostgreSQL** instance with **PostGIS** enabled.
    *   *Action:* Run the schema provided in `database/schema.txt`.
2.  **API Layer:** Build a REST or GraphQL API (Node.js/NestJS or Python/FastAPI recommended).
3.  **Authentication:** Implement JWT Auth (Auth0 or Supabase).
    *   *Refactor:* Replace the hardcoded `viewMode` state in `App.tsx` with a real `useAuth()` context.

### Phase 2: Wiring the Frontend
1.  **Replace `api.ts`:** Rewrite the methods in `services/api.ts` to call your new backend endpoints using `fetch` or `axios`.
2.  **SWR/React Query:** Implement a data fetching library to handle caching and revalidation, replacing the basic `useEffect` patterns currently used.

### Phase 3: Real Data Integration
1.  **Map Data:** Replace static lat/lng in `data.ts` with live vessel telemetry (e.g., Spire, MarineTraffic API).
2.  **Pricing:** Connect to an index provider (e.g., Platts, Argus) for the Market Watch ticker.

---

## 4. Key Feature Implementation Guide

### A. The Intelligence Map (`BuyerMap.tsx`)
*   **Current:** Uses Leaflet with OpenStreetMap tiles.
*   **Prod Upgrade:** Consider Mapbox GL JS for better performance with 10,000+ vessel markers and custom vector styling that matches the Verdaxis brand.

### B. Document Intelligence (`ComplianceDataInput.tsx`)
*   **Current:** Simulates an upload process with timeouts.
*   **Prod Upgrade:**
    1.  Upload file to AWS S3 / Google Cloud Storage.
    2.  Trigger a Lambda function to run **Google Cloud Document AI** or **AWS Textract**.
    3.  Parse the BDN (Bunker Delivery Note) JSON output.
    4.  Match extracted fields (Fuel Type, Quantity) against the Order record in Postgres.

### C. AI Copilot (`Copilot.tsx`)
*   **Current:** Direct call to Gemini 2.5 Flash.
*   **Prod Upgrade:** Implement **RAG (Retrieval-Augmented Generation)**.
    *   The AI needs access to *your* database to answer "Where is *my* vessel?".
    *   *Stack:* LangChain + Vector DB (pgvector) + Gemini.

---

## 5. Environment Variables

Create a `.env` file in the root:

```env
# Required for AI Features
API_KEY=your_google_gemini_api_key_here

# Future Production Keys
# VITE_API_URL=https://api.verdaxis.com
# VITE_MAPBOX_TOKEN=pk.eyJ...
```

---

## 6. Developer Notes

*   **Styling:** We use Tailwind CSS. The theme colors are defined in `index.html` script config (Verdaxis Blue: `#5DADE2`).
*   **Icons:** Lucide-React is used throughout.
*   **Formatting:** The AI Copilot uses a custom Markdown renderer to handle bolding and newlines.

*Verdaxis Engineering Team*