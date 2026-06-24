# ProductWizard Fixes — TODO

## Backend
- [ ] Add `ProductFile` Prisma model to `prisma/schema.prisma`
- [ ] Create Prisma migration for `ProductFile`
- [ ] Update `src/lib/supabase-storage.ts` with dedicated `product-files` upload helper (buffer + bucket selection)
- [ ] Create/verify `src/app/api/products/upload-file/route.ts`
  - [ ] Accept multipart/form-data with `file`
  - [ ] Upload to dedicated bucket
  - [ ] Insert `ProductFile` row linked to `productId`
  - [ ] Return `{ id, publicUrl, path, fileName, size, type }`
- [ ] Verify `src/app/api/products/[id]/route.ts` metadata/image handling doesn’t break file flows

- [ ] Gateways: align Step 3 to real integration settings endpoints:
  - [ ] Ensure Step 3 uses `/api/integrations/settings?provider=stripe` for Stripe connected
  - [ ] Use `/api/integrations/settings?provider=payment_gateways` for enablement/connect where applicable
- [ ] Funnel persistence: update backend funnel upsert to use `upsell_funnels` + `funnel_steps` (not product.metadata)
  - [ ] Ensure accept/decline branching fields map correctly
  - [ ] Ensure Step 7 saves/updates funnel + steps in DB

- [ ] Finish publish: update funnel activation backend call/fields if needed
  - [ ] Ensure `PATCH /api/upsell/funnels/[id]` activates with the correct payload

## Frontend (ProductWizard)
- [ ] Step 1: audit image upload flow (multipart vs base64) and confirm preview works
- [ ] Step 3 Gateways: fix connection detection + toggle enabled logic; ensure state persists to `product.metadata.gateways`
- [ ] Step 4 Contents:
  - [ ] Remove `prompt()` “Add Link” flow and replace with inline external URL inputs
  - [ ] On upload success: persist file reference (not dead URLs) and render list from product metadata/DB
  - [ ] Add delete behavior (at least updates list; ideally deletes DB row)
- [ ] Step 5 Checkout templates: verify cards map to backend + fields persist
- [ ] Step 6 Bumps: verify save wiring
- [ ] Step 7 Funnel:
  - [ ] Replace metadata-only funnelSteps save with DB-backed persistence via `/api/upsell/funnels/[id]`
  - [ ] Include accept/decline branching fields if supported
  - [ ] Replace Step “Page Template” free text with real PageBuilder template selection from checkout templates list (or dedicated funnel templates)
- [ ] Step 8 Fulfillment: verify save wiring
- [ ] Step 9 Affiliates: verify enabled/sync + GoAffPro integration calls
- [ ] Step 10 Proof: verify testimonial add/delete/rating widget persistence
- [ ] Step 11 Finish:
  - [ ] Publish updates status
  - [ ] Activate funnel when `funnelId` exists

## Validation
- [ ] Run `npm run build 2>&1 | tail -20`
- [ ] Run final commit/push commands after tests
