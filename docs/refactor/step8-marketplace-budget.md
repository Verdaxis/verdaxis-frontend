# Step 8 marketplace first-load ceiling (decision FE-B1)

Adopting TanStack Query for the Marketplace reads (step 8 Task 7) raises the
`marketplace` route first load above its ceiling. The PM decision FE-B1 allows
that one ceiling to move, only for growth caused by adopting Query (runtime,
hooks and adapters).

## Rule

- The `marketplace` ceiling is re-baselined to the measured first load plus 2 %,
  rounded up to the next 100 gzip bytes (the rule the other ceilings use).
- It moves twice: once at the Task 7 merge (7d0f805e) and once at the Task 8
  merge, when the OrderBook hook joins the same route chain.
- No other route ceiling changes. `scripts/check-build-artifacts.mjs` counts
  chunks exactly as before.
- Task 10 looks for savings to win this growth back.

## Numbers (gzip bytes, `marketplace` first load)

| Point | First load | Ceiling |
|---|---|---|
| Step 8 base (605a05af) | 308,053 | 310,300 |
| Task 7 lane branch, CI run | 317,718 | 310,300 (failed) |
| Task 7 merged into step 8, staging build | 317,759 | 310,300 (failed) |
| Task 7 merged into step 8, production build | 317,735 | 310,300 (failed) |
| After the Task 7 move | 317,759 | 324,200 |

First move: 317,759 x 1.02 = 324,114, rounded up to 324,200. The larger of the
two builds is used. Growth against the base is 9,706 gzip bytes. The old
ceiling had 2,247 bytes of headroom.

| Point | First load | Ceiling |
|---|---|---|
| Task 8 merged into step 8, staging build | 318,590 | 324,200 |
| Task 8 merged into step 8, production build | 318,597 | 324,200 |
| After the Task 8 move | 318,597 | 325,000 |

Second move: 318,597 x 1.02 = 324,968.94, rounded up to 325,000. Growth against
the Task 7 measurement is 838 gzip bytes on production and 831 on staging. The
Task 7 ceiling had 5,603 bytes of headroom, so the move is small and only
covers the measured value plus 2 %.

## Cause

`Marketplace` now imports `@tanstack/react-query` statically.

1. Rollup moved `QueryClient` and `QueryClientProvider` into a shared chunk
   (`QueryClientProvider-*.js`, about 5,457 gzip bytes). The lazy `QueryProvider`
   chunk and `Marketplace` both import it, so it joins the Marketplace static
   import chain. The authenticated layout already loads it through
   `QueryProvider`, so a signed-in user does not download it twice.
2. The Query observer and hook modules (`useQuery`, `useBaseQuery`) are used
   only by Marketplace, so they moved into `Marketplace-*.js`. That chunk grew
   from about 34.9 KB to about 39.0 KB gzip, roughly 4.1 KB of real cost.
3. The feature adapter source is about 6 KB raw and is not the cause.

Removing the static import is not possible without a Suspense boundary that
changes the DOM. Placing `@tanstack/react-query` in the entry chunk would push
every route over its ceiling (the landing page has about 6 KB of headroom).

## Task 8 growth

At the Task 8 merge the `OrderBook` snapshot read joins the Marketplace route
through `useOrderBookSnapshot` and `snapshotRequests`. That is the only cause of
the second move: the Query hook, its snapshot request adapter and the OrderBook
calls that pass `{ cacheOwner: 'query', signal }`.

The first Task 8 build also pulled the invalidation bridge into the route: the
hook imported `registerQueryRefresh` from `lib/query/invalidation`, so the
`invalidation-*.js` chunk (6,737 gzip bytes) joined the Marketplace static
import chain. Commit 1b93b128 moved the lifecycle, its registry and
`registerQueryRefresh` to `lib/query/refreshRegistry`, which the hook imports
directly. The build no longer emits an `invalidation-*.js` chunk at all, and
the Marketplace chunk has no import of it. The remaining growth is the hook,
the adapter and their Query modules.

Task 10 looks for savings to win this growth back. No other route ceiling moved
and the checker counts chunks exactly as before.
