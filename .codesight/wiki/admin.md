# Admin

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Admin subsystem handles **32 routes** and touches: auth.

## Routes

- `GET` `/api/orders/admin/commissions` → out: CommissionResponse[] [orders]
  `openapi.json`
- `GET` `/api/orders/admin/commissions/summary` → out: CommissionSummary [orders]
  `openapi.json`
- `PUT` `/api/orders/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [orders]
  `openapi.json`
- `GET` `/api/admin/market-support/capabilities` → out: MarketSupportCapability[] [admin-market-support]
  `openapi.json`
- `POST` `/api/admin/market-support/capability-assignments` → in: CapabilityAssignmentCreate, out: CapabilityAssignmentResponse [admin-market-support]
  `openapi.json`
- `POST` `/api/admin/market-support/capability-assignments/:assignment_id/revoke` params(assignment_id) → in: CapabilityAssignmentRevoke, out: CapabilityAssignmentResponse [admin-market-support]
  `openapi.json`
- `GET` `/api/admin/market-support/organizations` → out: PaginatedResponse_MarketSupportOrganization_ [admin-market-support]
  `openapi.json`
- `GET` `/api/admin/market-support/organizations/:organization_id/authorizations` params(organization_id) → out: PaginatedResponse_AuthorizationResponse_ [admin-market-support, auth]
  `openapi.json`
- `POST` `/api/admin/market-support/organizations/:organization_id/authorizations` params(organization_id) → in: AuthorizationCreate, out: AuthorizationResponse [admin-market-support, auth]
  `openapi.json`
- `GET` `/api/admin/market-support/organizations/:organization_id/listings` params(organization_id) → out: PaginatedResponse_AssistedListingResponse_ [admin-market-support]
  `openapi.json`
- `POST` `/api/admin/market-support/organizations/:organization_id/listings` params(organization_id) → in: AssistedListingCreate, out: AssistedListingResponse [admin-market-support]
  `openapi.json`
- `POST` `/api/admin/market-support/organizations/:organization_id/listings/:order_id/cancel` params(organization_id, order_id) → in: AssistedListingCancel, out: AssistedListingResponse [admin-market-support]
  `openapi.json`
- `POST` `/api/admin/market-support/organizations/:organization_id/authorizations/:authorization_id/revoke` params(organization_id, authorization_id) → in: AuthorizationRevoke, out: AuthorizationResponse [admin-market-support, auth]
  `openapi.json`
- `GET` `/api/admin/market-support/organizations/:organization_id/context` params(organization_id) → out: MarketSupportContext [admin-market-support]
  `openapi.json`
- `GET` `/api/admin/audit-logs` → out: AuditLogResponse[]
  `openapi.json`
- `GET` `/api/admin/analytics/product-usage` → out: ProductUsageResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/overview` → out: app__routers__admin_analytics__OverviewResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/daily` → out: DailyStat[] [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/users` → out: AdminUsersResponse [admin-analytics]
  `openapi.json`
- `PUT` `/api/admin/analytics/users/:user_id/reject` params(user_id) → out: AdminUserEntry [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/overview` → out: app__schemas__product_analytics__OverviewResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/acquisition` → out: AcquisitionResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/activation` → out: ActivationResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/engagement` → out: EngagementResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/marketplace` → out: MarketplaceResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/retention` → out: RetentionResponse [admin-analytics]
  `openapi.json`
- `GET` `/api/admin/analytics/product-analytics/reliability` → out: ReliabilityResponse [admin-analytics]
  `openapi.json`
- `PUT` `/api/kyc/admin/:user_id/approve` params(user_id) → in: AdminApproveBody [kyc]
  `openapi.json`
- `PUT` `/api/kyc/admin/:user_id/reject` params(user_id) → in: AdminRejectBody [kyc]
  `openapi.json`
- `GET` `/api/admin/subscriptions` → out: SubscriptionResponse[] [subscriptions]
  `openapi.json`
- `GET` `/api/admin/subscriptions/:org_id` params(org_id) → out: SubscriptionResponse [subscriptions]
  `openapi.json`
- `PUT` `/api/admin/subscriptions/:org_id` params(org_id) → in: SubscriptionUpdate, out: SubscriptionResponse [subscriptions]
  `openapi.json`

## Related Models

- **app__routers__admin_analytics__OverviewResponse** (10 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_