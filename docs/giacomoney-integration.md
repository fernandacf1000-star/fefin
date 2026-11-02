# Norte receiver for GiacoMoney

Prepared receiver, not yet activated. Deploy only as part of the paired GiacoMoney integration.

Endpoint: `/functions/v1/norte-giacomoney` (POST). Server-to-server authentication: `x-giacomoney-key`, matched against the private `GIACOMONEY_INTEGRATION_KEY` Edge Function secret. The caller cannot choose the destination user. Never use a service-role key in the frontend.

Body: `{ "expense": { "id": "source-uuid", "description": "Mercado", "amount": 100, "created_at": "2026-11-02T15:00:00Z", "installment_number": null, "installment_total": null, "installment_group_id": null } }`.

GiacoMoney sends each installment separately, with the first installment's creation timestamp for all members of a series. Each received amount is halved once. Stable namespaced IDs prevent repeated inserts; conflicts do not overwrite user edits. Existing history/AI category validation is reused. Source timestamp is converted to America/Sao_Paulo, payment is Pix, and Norte's existing installment offset semantics determine each monthly reference. Historical records and subsequent source edits/deletions are not synchronized by this version.

Deployment requires this entrypoint plus `handler.ts`, `../_shared/classification.ts`, `../_shared/norte.ts`, and `../norte-ai/handler.ts`. Keep verify_jwt=false ONLY for this endpoint because it implements its own key authentication. The existing AI endpoint retains JWT authentication.

Pair with the GiacoMoney PR and its `docs/norte-integration.md`: source DB queue migration, source secrets, two source function deployments, and a one-minute source Cron job are required before calling the integration active. Unit validation: `node --test supabase/functions/norte-giacomoney/handler.test.ts`. A deployed end-to-end test and source advisors are still required.
