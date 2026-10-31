# Security Spec: Orbit Firestore Zero-Trust Rules

## 1. Data Invariants
1. **Private Pair Isolation**: Users who are neither the Boss (`bossUid`) nor the Freelancer (`freelancerUid`) of `/pairs/{pairId}` are strictly forbidden from reading, listing, creating, modifying, or deleting the pair and its sub-resources (`/pairs/{pairId}/tasks/{taskId}`).
2. **Boss Authority Invariant**: Only the Boss (`request.auth.uid == pair.bossUid`) can create tasks, delete tasks, or modify core task fields (`title`, `brand`, `contentType`, `dueDate`, `priority`, `notes`).
3. **Freelancer Restricted Role**: The Freelancer (`request.auth.uid == pair.freelancerUid`) can ONLY update the `status` field (`'pending'` | `'done'`), `completedAt`, and `updatedAt`. Any attempt to modify `title`, `brand`, `dueDate`, `notes`, or `createdBy` is rejected.
4. **One-to-One Lock**: Once a pair is active (`freelancerUid != null`), it cannot be hijacked or reassigned to a different freelancer.
5. **No Spoofed Profile Writes**: A user can only read and write their own `/users/{userId}` where `userId == request.auth.uid`.
6. **Invites Integrity**: Only the Boss can create an invite for their pair. A freelancer can accept an unexpired, unaccepted invite only once.

## 2. The "Dirty Dozen" Threat Payloads
1. **Payload 1 (Freelancer Privilege Escalation)**: Freelancer attempts to change task `dueDate` or `title`. *Result: Rejected*.
2. **Payload 2 (Freelancer Task Deletion)**: Freelancer attempts `delete` on `/pairs/{pairId}/tasks/{taskId}`. *Result: Rejected*.
3. **Payload 3 (Freelancer Task Creation)**: Freelancer attempts `create` on `/pairs/{pairId}/tasks/{taskId}`. *Result: Rejected*.
4. **Payload 4 (External Snoop Read)**: Authenticated user C attempts `get` or `list` on `/pairs/{pairId}/tasks` for Pair AB. *Result: Rejected*.
5. **Payload 5 (Unauthenticated Access)**: Guest attempts `read` or `write` on any collection. *Result: Rejected*.
6. **Payload 6 (Shadow Field Injection)**: Boss attempts to write task with `isSuperAdmin: true`. *Result: Rejected*.
7. **Payload 7 (Invite Re-acceptance)**: Freelancer B attempts to accept an already accepted invite. *Result: Rejected*.
8. **Payload 8 (Expired Invite Acceptance)**: Freelancer attempts to accept invite where `expiresAt < request.time`. *Result: Rejected*.
9. **Payload 9 (Profile Impersonation)**: User A attempts to write `/users/{userB}`. *Result: Rejected*.
10. **Payload 10 (Denial of Wallet String Injection)**: User attempts to create a task title exceeding 140 chars or notes exceeding 1000 chars. *Result: Rejected*.
11. **Payload 11 (Pair Hijack)**: User B attempts to overwrite `bossUid` in `/pairs/{pairId}`. *Result: Rejected*.
12. **Payload 12 (Blanket List Query Scraping)**: User attempts to query `/pairs` without filtering by their own UID. *Result: Rejected*.
