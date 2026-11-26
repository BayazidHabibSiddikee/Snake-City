# Global Ranking Security Specification (Phase 0 TDD)

## 1. Master Source of Truth & Relationship Mapping
- **Collection**: `/globalRankings/{userId}`
- **Ownership**: Document ID `{userId}` MUST equal `request.auth.uid` AND `resource/request.resource.data.userId == request.auth.uid`.
- **PII Isolation (Pillar 6)**: Zero PII (`email`, `phone`, `address`, `photoURL`) is ever stored in `/globalRankings`. Only public cultivation telemetry and a sanitized `displayName` (`1..32` chars).
- **Default Deny Catch-All**: `match /{document=**} { allow read, write: if false; }` is enforced as the first block inside `match /databases/{database}/documents`.

## 2. Data Invariants
1. A ranking record cannot be created or updated without a verified Firebase Auth account (`request.auth != null && request.auth.token.email_verified == true`).
2. `userId` in the document payload MUST strictly match both `request.auth.uid` and the `{userId}` path parameter, and MUST remain immutable on updates.
3. `createdAt` MUST equal `request.time` on create and remain immutable (`incoming().createdAt == existing().createdAt`) on update; `updatedAt` MUST equal `request.time` on both create and update.
4. No shadow/ghost fields are allowed (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` on update).
5. All strings enforce `.size()` limits and regex guards (`isValidId` on `{userId}` and `userId`; safe callsign regex on `displayName`); all numeric fields enforce domain bounds (`level` 1..12, `shrinesConquered` 0..12, `soulsCollected` 0..14, `score` 0..100000000, `xp` 0..100000000).
6. List queries MUST evaluate `resource.data.score >= 0` and enforce `request.query.limit <= 100`.

## 3. The "Dirty Dozen" Adversarial Payloads
All 12 payloads below MUST evaluate to `PERMISSION_DENIED`:

1. **Identity Spoofing (UID Mismatch)**: Authenticated as `uid_alice`, attempts `create` at `/globalRankings/uid_bob` with `{ "userId": "uid_bob", ... }`.
2. **Body UID Mismatch**: Authenticated as `uid_alice`, attempts `create` at `/globalRankings/uid_alice` with `{ "userId": "uid_bob", ... }`.
3. **Unverified Email Bypass**: Authenticated as `uid_alice` with `email_verified: false`, attempts `create` at `/globalRankings/uid_alice`.
4. **Shadow/Ghost Field Injection**: Valid owner payload plus extra `"isAdmin": true` or `"email": "leak@example.com"`.
5. **ID Poisoning (1.5KB Junk Doc ID)**: Attempts `create` or `get` with `{userId}` containing invalid characters (`../admin`) or length > 128.
6. **Value Poisoning (Out-of-Bounds Level/Souls)**: Attempts `create` or `update` with `"level": 999` or `"soulsCollected": 500` or `"score": -50`.
7. **Denial-of-Wallet Oversized String**: Attempts `create` or `update` with `"displayName"` of 10,000 characters or `"stageTitle"` > 48 chars.
8. **Type Confusion on Whitelisted Update Key**: Attempts `update` setting `"score": "999999"` (string instead of number) or `"isHuman": "yes"`.
9. **Timestamp Forgery (Client Clock Spoofing)**: Attempts `create` with `"createdAt": "2020-01-01T00:00:00Z"` instead of `request.time`.
10. **Immortal Field Mutation (`createdAt` / `userId`)**: Owner attempts `update` changing `"createdAt"` to `request.time` (different from `existing().createdAt`).
11. **Invalid Enum Injection**: Attempts `create` with `"biome": "volcano"` or `"weather": "apocalypse"` or `"speedPreset": "godmode"`.
12. **Unbounded Scraping List Query**: Client attempts `list` on `/globalRankings` with `limit(500)` or without a `score >= 0` bound.
