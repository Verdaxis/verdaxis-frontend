# Intelligence Map Layer Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace three ambiguous map overlay buttons with one accessible Layers menu containing independent display controls.

**Architecture:** Keep display state local to `BuyerMap`. A small local `LayerSwitch` component provides the repeated accessible switch treatment, while the existing MapLibre visibility helper remains authoritative for ECA geometry.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, MapLibre GL, Lucide React.

---

## Design

- A single `Layers` button reports the number of enabled display layers.
- The menu independently controls Market Watch, market activity widgets, and ECA/SECA geometry.
- ECA status colors are shown beside the ECA control.
- `Focus European ECAs` accurately describes the existing Europe viewport action.
- Clicking outside or pressing Escape closes the menu.
- The product filter uses a fuel icon so it is not confused with the Layers command.
- All new interface copy ships in the existing English and Simplified Chinese namespaces.

## Execution

1. Replace the parent `showOverlays` state with independent ticker and widget state.
2. Add the accessible Layers menu and reusable local switch row.
3. Remove the three old sibling controls and preserve ECA visibility behavior.
4. Update architecture documentation.
5. Run typecheck, frontend tests, production/staging builds, and browser dogfood at representative desktop heights.
