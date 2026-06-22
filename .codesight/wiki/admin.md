# Admin

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Admin subsystem handles **3 routes**.

## Routes

- `GET` `/api/rfq/admin/commissions` → out: CommissionResponse[] [rfq]
  `openapi.json`
- `GET` `/api/rfq/admin/commissions/summary` → out: CommissionSummary [rfq]
  `openapi.json`
- `PUT` `/api/rfq/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [rfq]
  `openapi.json`

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_