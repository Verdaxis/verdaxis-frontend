# Admin

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Admin subsystem handles **11 routes**.

## Routes

- `GET` `/api/orders/admin/commissions` → out: CommissionResponse[] [orders]
  `openapi.json`
- `GET` `/api/orders/admin/commissions/summary` → out: CommissionSummary [orders]
  `openapi.json`
- `PUT` `/api/orders/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [orders]
  `openapi.json`
- `GET` `/api/admin/audit-logs` → out: AuditLogResponse[]
  `openapi.json`
- `GET` `/api/admin/analytics/overview` → out: OverviewResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/daily` → out: DailyStat[] [admin-analytics]
  `openapi.json`
- `PUT` `/api/kyc/admin/:user_id/approve` params(user_id) [kyc]
  `openapi.json`
- `PUT` `/api/kyc/admin/:user_id/reject` params(user_id) → in: AdminRejectBody [kyc]
  `openapi.json`
- `GET` `/api/admin/subscriptions` → out: SubscriptionResponse[] [subscriptions]
  `openapi.json`
- `GET` `/api/admin/subscriptions/:org_id` params(org_id) → out: SubscriptionResponse [subscriptions]
  `openapi.json`
- `PUT` `/api/admin/subscriptions/:org_id` params(org_id) → in: SubscriptionUpdate, out: SubscriptionResponse [subscriptions]
  `openapi.json`

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_