# API Reference

## Auth

### POST /auth/signup
- **Description:** Create an operator account.
- **Method:** POST
- **Body:** `role`, `firstName`, `lastName`, `email`, `password`, `phone`.
- **Response:** Operator auth record + token.

### POST /auth/login
- **Description:** Login as an operator.
- **Method:** POST
- **Body:** `operatorId`.
- **Response:** JWT token for that operator.

## Tenants

### GET /tenants
- **Description:** List tenants.
- **Method:** GET
- **Query params:** _none_
- **Response:** Array of tenants (`id`, `name`, timestamps).

### POST /tenants
- **Description:** Create a tenant.
- **Method:** POST
- **Body:** `name`.
- **Response:** Created tenant object.

## Operators

### GET /operators
- **Description:** List operators in the tenant.
- **Method:** GET
- **Query params:** _none_
- **Response:** Array of operators (`id`, `name`, `role`, `tenantId`, ...).

### GET /operators/:id
- **Description:** Fetch a single operator by id.
- **Method:** GET
- **Path params:** `id`.
- **Response:** Operator detail.

### POST /operators
- **Description:** Create an operator.
- **Method:** POST
- **Body:** `name`, `tenantId`, `role`.
- **Response:** Created operator.

## Operator Inbox Subscriptions

### POST /operator-inbox-subscriptions
- **Description:** Subscribe an operator to an inbox.
- **Method:** POST
- **Body:** `operatorId`, `inboxId`.
- **Response:** Subscription record linking operator and inbox.

## Inboxes

### GET /inboxes
- **Description:** List inboxes available to the caller.
- **Method:** GET
- **Query params:** _none_
- **Response:** Array of inboxes (`id`, `phoneNumber`, `displayName`, ...).

### POST /inboxes
- **Description:** Create an inbox/entry point.
- **Method:** POST
- **Body:** `phoneNumber`, `displayName`.
- **Response:** Created inbox.

## Conversations

### GET /conversations
- **Description:** List conversations for the tenant; Bruno shows label filter usage.
- **Method:** GET
- **Query params:** `labelId` (optional).
- **Response:** Array of conversation metadata (`id`, `inboxId`, `state`, `assignedOperatorId`, `lastMessageAt`, `labels`, ...).

### POST /conversations
- **Description:** Create/import a conversation.
- **Method:** POST
- **Body:** `tenantId`, `inboxId`, `externalConversationId`, `customerPhoneNumber`, `lastMessageAt`, `messageCount`.
- **Response:** Created conversation.

### GET /conversations/search/by-phone
- **Description:** Search conversations by customer phone number.
- **Method:** GET
- **Query params:** `phoneNumber` (E.164 string).
- **Response:** Conversation(s) matching that phone.

## Allocation

### GET /allocation
- **Description:** List allocation entries (current assignments).
- **Method:** GET
- **Query params:** _none_
- **Response:** Allocation list (conversationId, inboxId, assignedOperatorId, state).

### POST /allocation/allocate
- **Description:** Auto-allocate the best next queued conversation to the caller.
- **Method:** POST
- **Body:** _none_
- **Response:** Allocated conversation or 204/empty when none available.

### POST /allocation/claim
- **Description:** Manually claim a queued conversation.
- **Method:** POST
- **Body:** `conversationId`.
- **Response:** Conversation in `ALLOCATED` state or conflict/forbidden errors.

### POST /allocation/resolve
- **Description:** Mark an allocated conversation as resolved.
- **Method:** POST
- **Body:** `conversationId`.
- **Response:** Conversation with `state=RESOLVED`.

### POST /allocation/deallocate
- **Description:** Return an allocated conversation to queue.
- **Method:** POST
- **Body:** `conversationId`.
- **Response:** Conversation with `state=QUEUED`, `assignedOperatorId=null`.

### POST /allocation/reassign
- **Description:** Move an allocated conversation to another operator.
- **Method:** POST
- **Body:** `conversationId`, `newOperatorId`.
- **Response:** Conversation with updated `assignedOperatorId`.

### POST /allocation/move-inbox
- **Description:** Move an allocated conversation to another inbox.
- **Method:** POST
- **Body:** `conversationId`, `newInboxId`.
- **Response:** Conversation pointing to the new inbox (state stays `ALLOCATED`).

## Labels

### GET /labels
- **Description:** List labels (Bruno shows filters by inboxId or labelId).
- **Method:** GET
- **Query params:** `inboxId` (optional), `labelId` (optional).
- **Response:** Array of labels matching filters.

### GET /labels/:id
- **Description:** Get a label by id.
- **Method:** GET
- **Path params:** `id`.
- **Response:** Label detail.

### POST /labels
- **Description:** Create a label for an inbox.
- **Method:** POST
- **Body:** `inboxId`, `name`, `color`.
- **Response:** Created label.

### POST /conversations/:conversationId/labels/:labelId
- **Description:** Attach a label to a conversation.
- **Method:** POST
- **Path params:** `conversationId`, `labelId`.
- **Response:** Conversation with updated labels.

### DELETE /conversations/:conversationId/labels/:labelId
- **Description:** Detach a label from a conversation.
- **Method:** DELETE
- **Path params:** `conversationId`, `labelId`.
- **Response:** Conversation with label removed.

## Operator Status

### GET /operator-status/me
- **Description:** Read the caller’s status.
- **Method:** GET
- **Query params:** _none_
- **Response:** Status object (`status`, timestamps).

### POST /operator-status/me
- **Description:** Update the caller’s status.
- **Method:** POST
- **Body:** `status` (`AVAILABLE`, etc.).
- **Response:** Updated status object.

## Grace Period

### POST /grace-period/process
- **Description:** Trigger grace-period processing job/cron.
- **Method:** POST
- **Body:** _none_
- **Response:** Job execution result (processed conversations count/state).


