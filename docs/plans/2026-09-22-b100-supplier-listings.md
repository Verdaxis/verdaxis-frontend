# B100 supplier listings

## Intended result

Suppliers use the same Post Supply entry, modal layout and Marketplace listing views as the alcohol fuels. UCOME B100 uses fuel-specific specification, traceability and evidence fields. Suppliers can publish an offer before a buyer submits a request.

The existing order model executes and reserves supply. B100 offers therefore use a separate, small persisted resource, presented through the shared listing interface. They are indicative offers. A buyer requests a quote from the selected supplier; automatic matching and trade acceptance remain disabled.

## Data and interaction decisions

- Keep price, quantity, minimum fill, delivery location, availability and expiry together at the start of the form.
- Require the declared standard and edition. ASTM D6751 needs its grade; EN 14214 can carry a national or climate designation. Store cold filter plugging point and cloud point separately.
- Keep UCO feedstock proportion separate from analytical ester content. Permit future batch nomination; do not invent test values or a producing site.
- Share the fuel declaration fields between supplier offers and RFQ responses. Keep unknown values null, including carbon intensity; zero is a valid declared value.
- Put optional batch quality results in an expandable section with fixed units, test methods and CoA identity. Capture water mass concentration separately from water-and-sediment volume fraction.
- Keep operator certification, batch quality evidence and consignment sustainability evidence separate. A reference or supplier declaration does not mean Verdaxis verified it. Do not add a placeholder upload.
- Retain an immutable offer revision snapshot when a buyer starts a targeted RFQ. Only that supplier can receive and quote the request. Later listing edits or withdrawal do not rewrite the request history.
- Use organization ownership, admission checks, duplicate-submit protection, revision conflict checks and audit records. Preserve the existing executable-order restrictions.
- Keep Marketplace and Map as shared discovery surfaces. Use normal Listings and My Listings presentation for B100, with quote requests accessible in the same product workspace.

## Primary references

- [ASTM D6751-24](https://store.astm.org/d6751-24.html): grade names and blendstock scope.
- [BSI EN 14214 catalog](https://knowledge.bsigroup.com/products/liquid-petroleum-products-fatty-acid-methyl-esters-fame-for-use-in-diesel-engines-and-heating-applications-requirements-and-test-methods-1): edition and climate distinctions.
- [US DOE biodiesel specifications](https://afdc.energy.gov/fuels/biodiesel-specifications): selected property names, units and methods; not an exhaustive or current grade list.
- [ISCC EU 203 v4.2](https://www.iscc-system.org/wp-content/uploads/2025/04/ISCC_EU_203_Traceability_and_Chain-of-Custody_4.2.pdf): chain of custody and delivery sustainability declarations.

## Delivery checklist

- [x] Backend schemas, offers lifecycle, targeted RFQ and migration/ACL checkpoint.
- [x] Shared supplier form, listing discovery, ownership actions and EN/ZH copy.
- [ ] Existing and new API/field tests, PostgreSQL boundary tests, frontend checks.
- [x] Browser buyer and supplier flow, readback, revision, withdrawal and relevant viewports.
- [x] Review for correctness and use of existing patterns.
- [ ] Staging deployment, live checks and unchanged production fingerprints.

The user has authorized implementation with discretion and deployment to staging. Production is outside this change.

## Verification before release

The frontend full suite passed 695 tests, with type checking, EN/ZH locale validation and the staging build/artifact checks also passing. Browser checks covered supplier publish, revision, quality-result preservation, private/public readback, a buyer request tied to offer revision 2, a supplier quote, withdrawal, and preserved request history. The shared form was inspected in English and Chinese at 1280 px; layout bounds were checked at 1024 and 1440 px.

Backend local tests passed 1,735 cases with one existing skip. All 58 deploy tests passed in Linux. PostgreSQL tests passed 183 cases; the existing Linux-only four-worker process check needs its Linux run before release. Final release evidence and exact deployed commits are recorded outside source in `outputs/b100-supplier-2026-09-22/`.
