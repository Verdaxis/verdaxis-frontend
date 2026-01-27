# Verdaxis Intelligence Cockpit

Verdaxis is a next-generation maritime intelligence platform designed to bridge the gap between fuel procurement, regulatory compliance, and geospatial analytics. It provides a unified interface for Buyers (Shipping Lines) and Suppliers (Bunker Providers) to manage RFQs, track vessel compliance (CII, EU ETS), and verify sustainable fuel origins.

## Features

- **Interactive Geospatial Map**: Real-time visualization of ports, vessels, and trade routes using Leaflet.
- **Intelligent Marketplace**: Digital RFQ workflow with state machine logic (Draft -> Quoted -> Confirmed).
- **AI Copilot**: Integrated generative AI (Google Gemini) for market insights, risk analysis, and operational assistance.
- **Compliance Ledger**: Traceability for green fuels (Methanol, Biofuels) with document verification tracking.
- **Role-Based Views**: Distinct interfaces for Buyers and Suppliers.

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Modern CSS (Variables, Glassmorphism, HSL colors)
- **Maps**: Leaflet / React-Leaflet
- **AI**: Google Gemini SDK (`@google/genai`)
- **Icons**: Lucide React

## Getting Started

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file in the root directory:

    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Project Structure

- `src/components`: UI components (Map, Marketplace, Fleet, Compliance)
- `src/services`: Logic layer
  - `api.ts`: Mock backend service (simulates database & API responses)
  - `ai-engine/`: Gemini integration, tool definitions, and chat logic
- `src/types.ts`: Core TypeScript definitions (Port, Vessel, Quote, etc.)
- `src/data.ts`: Mock data for development

## Development Notes

- The project currently uses a **Mock API** (`services/api.ts`) for rapid frontend prototyping.
- Transitions to a real backend should replace calls in `src/services/api.ts` with transparent HTTP requests.
