# Design Decisions

## 1. Purpose of this document

This document explains **how the original “Backend requirements for Inbox and Allocation system” were interpreted and implemented**, and highlights the main design decisions, trade-offs, and open points.

It also documents **how ChatGPT was used as a design partner** to:

- break the spec into concrete backend modules,
- identify ambiguities and edge cases,
- propose API contracts and flows,
- and generate structured prompts for code generation (e.g. Cursor + NestJS resources).

The goal is to show not only _what_ was built, but _why_ it looks like this.

---

## 2. Summary of the original requirements

The original spec describes a backend service that:

- Provides **inbox and allocation capabilities for operators** in a multi-tenant environment.
- Stores **conversation metadata only** (no message bodies).
- Delegates:
  - **message history** and **delivery** to an **orchestrator**,
  - **login/auth** and **contact management** to other services.
- Defines a **domain model** including:
  - Inbox (unique phone per tenant),
  - Operator, roles, and OperatorInboxSubscription,
  - ConversationRef (QUEUED / ALLOCATED / RESOLVED),
  - Label / ConversationLabel,
  - OperatorStatus and GracePeriodAssignment.
- Requires:
  - Auto allocation endpoint returning the next allocatable conversation, sorted by priority,
  - Manual claim / resolve / deallocate / reassign / move inbox,
  - Labels CRUD and tagging,
  - Search by phone (exact match),
  - Conversation listing with filters (state / operator / label) and sorting (newest / oldest / priority),
  - Polling-friendly endpoints with minimal payloads.
- Non-functional:
  - Allocation/claim operations should be **atomic**,
  - State updates should be **idempotent**,
  - Background jobs should scale horizontally,
  - Use **polling** (no websockets required).

---

## 3. Interpretation and clarifications

While implementing, several aspects of the spec needed **interpretation** or **additional decisions**. Many of these were explored through iterative Q&A with ChatGPT.

Key interpretation points:

1. **Tenant model**
   - The spec mentions `tenant_id` on multiple entities, but does not fully define a Tenant aggregate.
   - Decision:
     - Create a **`Tenant` table/entity** with at least:
       - `id`
       - `name`
     - Use it primarily to:
       - validate tenant existence,
       - manage foreign-key-like relations,
       - support indexing and future extensions.
     - Additional configuration (e.g. priority weights or grace settings) can be added later if needed, but for now the focus is on **identity + referential integrity**.

2. **Auth / login**
   - Spec: “This backend … does not handle login”.
   - Decision: use a **simple dev token guard** (`DevTokenGuard`) that injects:
     - `tenantId`,
     - `operatorId`,
     - `role` (`OPERATOR`, `MANAGER`, `ADMIN`).
   - This simulates a real auth system without implementing full login flows.

3. **Operator permissions and subscriptions**
   - Spec mentions roles and `OperatorInboxSubscription`, but not exact permission rules.
   - Decision:
     - Operators see and allocate from inboxes where they have subscriptions.
     - Managers/Admins can perform broader actions (reassign, move, deallocate) across all inboxes in a tenant.

4. **Conversation ownership and resolve permissions**
   - Spec: resolve is allowed for owners and managers/admins.
   - Decision:
     - Enforce `assignedOperatorId === operatorId` OR role in `{MANAGER, ADMIN}` for `resolve`.
     - Reject other attempts with a controlled error (e.g. 403).

5. **Label scoping**
   - Spec: “Are labels global? No. Labels are defined within an inbox.”
   - Decision:
     - `Label` is scoped by `(tenantId, inboxId, name)`.
     - `ConversationLabel` may only link a conversation to labels whose `inboxId` matches the conversation `inboxId`.
     - Enforce tenant consistency for both label and conversation.

6. **Search behavior**
   - Spec: “Search behavior: exact match only.”
   - Decision:
     - Implement search **as query parameters on `GET /conversations`**, instead of a separate endpoint:
       - `customerPhoneNumber` (exact match) is supported as a filter.
     - This keeps the API surface small and lets clients use a single listing endpoint for:
       - generic listing,
       - filtered listing,
       - and phone-based search.

7. **Filters in /conversations**
   - Spec mentions filters by state, operator, label, and sorting.
   - Decision:
     - First iteration: implement **simple filters using only `ConversationRef` columns**:
       - `inboxId`
       - `state` (`QUEUED`, `ALLOCATED`, `RESOLVED`)
       - `assignedOperatorId`
       - `customerPhoneNumber` (exact match, as per search behavior)
       - `sort` (`newest`, `oldest`, `priority`)
       - `limit` with a hard cap for performance (e.g. 100)
     - Label-based filtering (via joins with `ConversationLabel`) is possible but intentionally left out of this iteration to keep the implementation straightforward and performant.

8. **History and contact snapshot**
   - Spec: “History: Proxy orchestrator history with pagination”, “Contact snapshot: Read only contact information.”
   - Decision:
     - For this exercise, history and contact snapshot are treated as **integration points**:
       - They can be implemented later as proxy endpoints to the orchestrator,
       - but are not required to demonstrate the core inbox/allocation logic.

---

## 4. Major design decisions

### 4.1. Multi-tenant design

- All core entities (`Tenant`, `Operator`, `Inbox`, `ConversationRef`, `Label`, `GracePeriodAssignment`, etc.) include a `tenantId`.
- All service methods and queries are **scoped by `tenantId`** from the auth context.
- The explicit `Tenant` table is used to:
  - validate that a tenant exists,
  - anchor foreign-key-like relations,
  - provide a clean place for future tenant-level configuration.

This guarantees strict separation between tenants and avoids cross-tenant data leaks.

---

### 4.2. Unique phone number per tenant

Requirement:

> One phone number maps to one inbox per tenant.

Implementation choice:

- Enforce at **database level**:
  - Unique constraint like `UNIQUE(tenant_id, phone_number)` (or ORM equivalent).
- Mirror this rule in services:
  - Before creating/updating an inbox, catch uniqueness violations and return a friendly error instead of a raw DB error.

This aligns business rules with persistence constraints.

---

### 4.3. Separation of Concerns: Conversations vs Allocation

Rather than mixing lifecycle transitions inside a generic Conversations controller:

- **ConversationsModule**:
  - Responsible for:
    - storing `ConversationRef`,
    - listing conversations,
    - updating **metadata only** (e.g. `lastMessageAt`, `messageCount`, `priorityScore`).
  - Does _not_ change `state` or assignment.

- **AllocationModule**:
  - The **only module** allowed to change:
    - `state` (`QUEUED`, `ALLOCATED`, `RESOLVED`),
    - `assignedOperatorId`.
  - Handles:
    - `/allocation/allocate`,
    - `/allocation/claim`,
    - `/allocation/resolve`,
    - `/allocation/deallocate`,
    - `/allocation/reassign`,
    - `/allocation/move-inbox`.

This clear separation makes the lifecycle easier to reason about, test, and extend.

---

### 4.4. Priority model & allocation algorithm

Spec:

> Priority is a weighted combination of message count and time delay since last message.  
> Weights are configurable by tenant.

Decisions:

- Introduce `priorityScore` on `ConversationRef`.
- Base logic:
  - Normalize `messageCount` and delay (simplified for this exercise).
  - Compute `priorityScore = alpha * normalizedCount + beta * normalizedDelay`.
  - `alpha` and `beta` can be tenant-specific in the future (e.g. stored on Tenant), but the structure is already compatible.
- During auto-allocate:
  - Build candidate list of conversations where:
    - `state = QUEUED`,
    - `inboxId` in operator’s subscriptions,
    - limited to the most recent 100.
  - Sort by:
    - `priorityScore DESC`,
    - then `lastMessageAt DESC`.

ChatGPT assisted in translating the textual spec into these concrete algorithm steps and ensuring a balance between fairness, performance, and simplicity.

---

### 4.5. Labels and tagging model

Spec:

> Are labels global? No. Labels are defined within an inbox.

Decisions:

- `Label`:
  - Scoped by `(tenantId, inboxId)`.
  - Optional uniqueness on `(tenantId, inboxId, name)` to prevent duplicates.
- `ConversationLabel`:
  - Many-to-many join between `ConversationRef` and `Label`.
  - Unique `(conversationId, labelId)` to avoid repeated tags.

Additional validation:

- When attaching a label to a conversation:
  - Enforce that `label.tenantId === conversation.tenantId`.
  - Enforce that `label.inboxId === conversation.inboxId`.

This prevents cross-tenant and cross-inbox inconsistencies and keeps labels semantically aligned with the inbox context.

---

### 4.6. OperatorStatus & GracePeriod (with background cron)

Spec:

> When operator changes to OFFLINE, start grace window instead of immediate release.

Decisions:

- **`OperatorStatus`**:
  - 1–1 relationship with `Operator`.
  - Tracks:
    - `status` (`AVAILABLE` / `OFFLINE`),
    - `lastStatusChangeAt`.

- **`GracePeriodAssignment`**:
  - Created when an operator switches to `OFFLINE`.
  - One entry per currently `ALLOCATED` conversation for that operator.
  - Contains:
    - `tenantId`
    - `operatorId`
    - `conversationId`
    - `expiresAt`
    - `reason` (`OFFLINE` or `MANUAL`)
    - `createdAt`.

- **Status change logic**:
  - On `status = OFFLINE`:
    - Find all `ALLOCATED` conversations assigned to the operator.
    - Create corresponding `GracePeriodAssignment` rows, with `expiresAt` computed from a grace window.
  - On `status = AVAILABLE`:
    - Delete all pending `GracePeriodAssignment` entries for that operator (conversations remain allocated).

- **Background processing**:
  - A **cron job** is configured to run in the background (using NestJS scheduling) and:
    - Fetch all `GracePeriodAssignment` where `expiresAt <= now`.
    - For each:
      - If the operator is still OFFLINE and the conversation is still ALLOCATED to that operator:
        - Update conversation to `state = QUEUED` and `assignedOperatorId = null`.
      - Remove the processed `GracePeriodAssignment` row.
  - This is fully automated; it does **not** depend on a manual endpoint.

Design-wise, this keeps grace-period behavior:

- decoupled from the allocation endpoints,
- easy to reason about as an independent background concern,
- aligned with the non-functional requirement that background jobs can scale horizontally.

---

### 4.7. Search and simple filters

Spec:

> Search behavior: exact match only.  
> Conversation lists: filters for state, operator and label, sorting newest, oldest and priority.

Decisions:

- **Phone search integrated into `GET /conversations`**:
  - Instead of a separate search endpoint, a query param is added:
    - `customerPhoneNumber=...`
  - Behavior:
    - Exact-match filtering on `ConversationRef.customerPhoneNumber`.
    - Combined with existing filters like `state` and `inboxId` when present.

- **Conversation listing filters**:
  - Implemented using only `ConversationRef` data:
    - `inboxId`
    - `state` (`QUEUED`, `ALLOCATED`, `RESOLVED`)
    - `assignedOperatorId`
    - `customerPhoneNumber` (exact match)
    - `sort`:
      - `newest`: `createdAt` or `lastMessageAt` DESC,
      - `oldest`: ASC,
      - `priority`: `priorityScore DESC`, then `lastMessageAt DESC`.
    - `limit` with a maximum (e.g. 100) to support polling.

This design keeps the API compact (one listing endpoint) while still satisfying the spec’s search behavior and filter requirements.

---

## 5. Collaboration with ChatGPT

ChatGPT was used as a **design assistant**, not just a code generator. Key collaboration patterns:

1. **High-level breakdown**
   - First, we asked for:
     - a **roadmap of modules** (Tenants, Operators, Inboxes, Conversations, Allocation, Labels, Status/Grace),
     - a breakdown by steps (what to build first, second, etc.),
     - priorities (must / nice-to-have).
   - This helped sequence the work and keep scope under control.

2. **Prompt design for Cursor**
   - ChatGPT was used to craft **detailed prompts** for Cursor so it would:
     - generate NestJS resources (modules, controllers, services, DTOs),
     - wire Swagger decorators,
     - integrate with Pino logging,
     - and reuse the existing ORM repositories.
   - Constraints such as:
     - “do not change conversation state outside AllocationModule”
     - “do not implement in-memory repositories, always use DB”
       were explicitly embedded into these prompts.

3. **Clarifying ambiguities**
   - We used ChatGPT to explore questions like:
     - “What happens if an operator has zero subscriptions?”
     - “Where exactly do we enforce that phone numbers are unique per tenant?”
     - “How do we guarantee that labels belong to the same inbox as the conversation?”
     - “What’s the cleanest way to model grace period without polluting allocation endpoints?”
   - The resulting decisions shaped entities (`Tenant`, `OperatorStatus`, `GracePeriodAssignment`) and service boundaries.

4. **Documentation and flow diagrams**
   - ChatGPT generated:
     - the ERD in Mermaid,
     - flow diagrams for:
       - message ingestion & QUEUED creation,
       - allocation & handling,
       - resolve flow,
       - operator status & grace period.
   - It also provided the initial structure and content for:
     - `README.md`,
     - `ARCHITECTURE.md`,
     - this `DESIGN_DECISIONS.md`.

5. **Testing mindset**
   - Instead of only writing code, we used ChatGPT to build **checklists of scenarios** to validate:
     - allocation edge cases,
     - claim conflicts and idempotency,
     - resolve permissions,
     - label constraints (tenant/inbox),
     - grace-period expiry behavior,
     - and multi-tenant isolation for all endpoints.

This collaborative approach helped ensure the implementation stayed closely aligned with the original spec while remaining practical and maintainable in a real-world NestJS + PostgreSQL codebase.
