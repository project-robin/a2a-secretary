# Mutual Contacts Implementation Design

## Goal
Implement a mutual opt-in contacts system where users can add each other via their 6-character agent code (handle). Once both parties add each other, the connection becomes "connected" and A2A communication is permitted.

## Architecture & Components

### 1. Data Layer (Convex)
- **Schema**: Add `contacts` table with `ownerId`, `contactUserId`, `status` ("pending" | "connected"), and `createdAt`.
- **API**: Create `convex/contacts.ts` with:
  - `addContact`: Validates handle, inserts pending contact, checks for reciprocal contact. If reciprocal exists, updates both to connected.
  - `getContacts`: Returns a user's contacts joined with target user details (name, handle).
  - `removeContact`: Deletes a contact and downgrades any reciprocal contact to pending.

### 2. UI Layer (Next.js/React)
- **ContactsPanel Component**: Input field for adding a 6-character code, display list of contacts with status badges (Pending/Connected).
- **Page Integration**: Add `ContactsPanel` to `src/app/page.tsx` below `UserSwitcher`.

### 3. Agent Integration
- **`resolveContactUrl` tool**: Update to check if there is a connected contact between the requesting user and the target user. Return a `connected: boolean` flag.
- **Agent Instructions**: Update the system prompt in `src/lib/agent/definition.ts` to enforce that agents can only message contacts if `connected=true`.

## Edge Cases Handled
- Self-add: Rejected.
- Invalid handle: Regex validation.
- Race conditions: Handled by Convex transactional mutations.
- Removal: Handled by downgrading reciprocal connection.
