# Testing

## 1. Testing strategy
- Manual testing is done with the Bruno collection in `collection-zendly`; every request present there is treated as “manually exercised at least once”.
- Automated testing uses Jest. Most specs are service-level and run against the TypeORM data source (logic + persistence), not HTTP controllers. The only e2e test hits the root controller.
- Scope reminder: this backend manages inbox, allocation, and metadata only (no real auth provider, no message delivery). Coverage focuses on allocation logic, state transitions, and metadata consistency.

## 2. Manual testing (Bruno collections)
Each entry lists the request method and path present in Bruno; these are considered manually tested.

### Auth
- `POST /auth/signup`
- `POST /auth/login`

### Tenants
- `POST /tenants`
- `GET /tenants`

### Operators
- `POST /operators`
- `GET /operators`
- `GET /operators/{id}`

### Inboxes
- `POST /inboxes`
- `GET /inboxes`

### Operator inbox subscriptions
- `POST /operator-inbox-subscriptions`

### Conversations
- `POST /conversations` – create conversation metadata
- `GET /conversations` – list with filters
- `GET /conversations?labelId={id}` – filter by label
- `GET /conversations/search/by-phone?phoneNumber=...` – search by phone

### Allocation
- `GET /allocation` – current allocations
- `POST /allocation/allocate` – auto-allocate next conversation
- `POST /allocation/claim` – claim a queued conversation
- `POST /allocation/resolve` – resolve allocated conversation
- `POST /allocation/deallocate` – return to queue
- `POST /allocation/reassign` – reassign to another operator
- `POST /allocation/move-inbox` – move conversation to another inbox

### Labels
- `POST /labels` – create label
- `GET /labels` – list labels (tenant-wide or by `labelId`)
- `GET /labels?inboxId={id}` – list by inbox
- `POST /conversations/{conversationId}/labels/{labelId}` – attach label
- `DELETE /conversations/{conversationId}/labels/{labelId}` – detach label

### Operator status & grace period
- `GET /operator-status/me`
- `POST /operator-status/me` – set status
- `POST /grace-period/process` – cron-style requeue of expired grace periods

### Operator inbox subscriptions
- `POST /operator-inbox-subscriptions`

## 3. Automated tests (Jest)

### Allocation
- `src/allocation/allocation.service.spec.ts` (service/unit with DB): allocation selection (priority + recency tie-break), null cases when no inbox subscriptions or no queued items, race safety when candidate not queued, claim validation (queued + subscribed), resolve permissions (owner vs manager/admin), deallocate to queue, reassign permission/tenant/inbox checks, move inbox resets allocation.

### Conversations
- `src/conversations/conversations.service.spec.ts` (service/unit): list filtering (inbox/state/operator) and priority sorting, findById happy/missing, updateMetadata returns undefined when not found.

### Inboxes
- `src/inboxes/inboxes.service.spec.ts` (service/unit): create inbox, list active by tenant, listByIds scoping, findById, update phone/displayName, soft delete.

### Labels
- `src/labels/labels.service.spec.ts` (service/unit): create label (null/empty color handling, uniqueness, tenant/inbox guards), list (tenant-wide and by inbox, ordering), get with tenant scoping, update (name/color/conflict), delete with tenant checks, attach/detach label to conversation with inbox/tenant validations and idempotency.

### Operator inbox subscriptions
- `src/operator-inbox-subscriptions/operator-inbox-subscriptions.service.spec.ts` (service/unit): create with operator/inbox existence validation, list by tenant with operator/inbox filters, remove with tenant scoping and missing-id no-op.

### Operator status & grace period
- `src/operator-status/operator-status.service.spec.ts` (service/unit): setStatus offline creates status + grace assignments and expiry, forbidden/NotFound cases, setStatus available clears grace assignments, getStatus returns null/tenant-scoped/forbidden.
- `src/operator-status/grace-period.service.spec.ts` (service/unit): processExpiredGracePeriods requeues allocated conversations, clears or retains assignment based on state, deletes orphaned assignments.

### Operators
- `src/operators/operators.service.spec.ts` (service/unit): create operator, update name, findAll.

### Tenants
- `src/tenants/tenants.service.spec.ts` (service/unit): create tenant, findAll empty and populated.

### E2E
- `test/app.e2e-spec.ts` (controller/e2e): `GET /` returns 200 "Hello World!".

## 4. Coverage matrix (critical flows)

| Flow | Manual (Bruno) | Automated (Jest) | To be tested / gaps |
| --- | --- | --- | --- |
| Tenant create/list | Yes | Yes (service) | Controller/e2e coverage missing |
| Operator create/list/get | Yes | Yes (service) | Manual update not covered; controller/e2e missing |
| Inbox create/list | Yes | Yes (service) | Update/delete only automated; no manual/e2e |
| Operator inbox subscription create | Yes | Yes (service) | Delete/list not manual; no e2e |
| Conversation create/list/search | Yes | Partially (list filters/sort, find, updateMetadata) | Controller/e2e gaps for create/search |
| Allocation (allocate/claim/resolve/deallocate/reassign/move) | Yes | Yes (service logic) | No controller/e2e |
| Labels (create/list/get/update/delete/attach/detach) | Yes | Yes (service logic + validations) | No controller/e2e |
| Operator status set/get | Yes | Yes (service logic) | No controller/e2e |
| Grace period cron requeue | Yes (`/grace-period/process`) | Yes (service logic) | No scheduled/e2e coverage |
| Auth signup/login | Yes | No | Needs automated coverage |
| Root health | Not in Bruno | Yes (`GET /`) | Broader health/auth flows untested |


