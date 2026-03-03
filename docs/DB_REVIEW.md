# DB Review — `un80actions` Schema

_Reviewed: 2026-03-03_

Issues are grouped by severity. Suggested fixes are indicative — all changes should go through a named migration in `sql/migrations/`

---

## 🔴 Critical — Data Loss / Integrity Risk

### 1. `action_milestones`: `submitted_by`, `reviewed_by`, `approved_by` use `ON DELETE CASCADE` ✅ `001_fix_milestone_audit_fk_cascade.sql`

```sql
submitted_by uuid references un80actions.users on delete cascade,
reviewed_by  uuid references un80actions.users on delete cascade,
approved_by  uuid references un80actions.users on delete cascade,
```

Deleting a user row will **cascade-delete every milestone they submitted, reviewed, or approved**. This would silently destroy submission history. All three should be `ON DELETE SET NULL` — consistent with `content_reviewed_by` and `approved_by` on the same table which correctly use `SET NULL`.

**Fix:**
```sql
alter table un80actions.action_milestones
  drop constraint action_milestones_submitted_by_fkey,
  drop constraint action_milestones_reviewed_by_fkey,
  drop constraint action_milestones_approved_by_fkey;

alter table un80actions.action_milestones
  add constraint action_milestones_submitted_by_fkey
    foreign key (submitted_by) references un80actions.users on delete set null,
  add constraint action_milestones_reviewed_by_fkey
    foreign key (reviewed_by) references un80actions.users on delete set null,
  add constraint action_milestones_approved_by_fkey
    foreign key (approved_by) references un80actions.users on delete set null;
```

---

### 2. `attachment_comments`: duplicate/conflicting columns

```sql
author_id uuid references un80actions.users on delete set null,
body      text not null,
...
user_id   uuid references un80actions.users on delete set null,
comment   text not null,
is_legal  boolean default false not null
```

The table has **two user-identity columns** (`author_id`, `user_id`) and **two content columns** (`body`, `comment`), both NOT NULL. This looks like a botched migration where new columns were added without removing the old ones. Both `body` and `comment` must be populated, creating confusion about which is canonical. Any query reading this table is likely reading only one of the two content columns.

**Fix:** Determine the active column pair (likely `user_id` + `comment` based on app code), migrate data if needed, then drop the defunct columns (`author_id`, `body`).

---

### 3. `activity_read.activity_id` is `text` with no FK to `activity_entries`

```sql
create table if not exists un80actions.activity_read (
    activity_id text not null,  -- NOT a uuid FK
    user_id     uuid not null references un80actions.users on delete cascade,
    ...
);
```

`activity_entries.id` is `uuid`. `activity_read.activity_id` is `text`. There is **no foreign key** between them, so orphaned read-markers and silent type mismatches are possible. If the app stores `activity_entries.id::text` here, changing the column to `uuid` with a proper FK would enforce integrity.

**Fix:**
```sql
alter table un80actions.activity_read
  alter column activity_id type uuid using activity_id::uuid,
  add constraint activity_read_activity_id_fkey
    foreign key (activity_id) references un80actions.activity_entries on delete cascade;
```

---

## 🟠 High — Design Flaws / Silent Bugs

### 4. `action_milestones`: boolean flags duplicate the `status` enum — can become inconsistent

```sql
is_draft    boolean default true  not null,
is_approved boolean default false not null,
status      un80actions.milestone_status default 'draft' not null,
```

`is_draft` mirrors `status = 'draft'` and `is_approved` mirrors `status = 'approved'`. A write that updates `status` but not the boolean (or vice versa) silently creates an inconsistent record. The booleans appear to be legacy fields that were retained when the `status` enum was added.

**Fix:** Drop `is_draft` and `is_approved`; derive state from `status` alone.

---

### 5. `action_milestones`: three similar document-submission flags

```sql
document_submitted          boolean default false not null,
documents_submitted         boolean default false not null,
milestone_document_submitted boolean default false not null,
```

It is unclear which flag is read by the application. This appears to be migration accumulation. There is also `document_submitted` on the `actions` table, adding further ambiguity.

**Fix:** Audit application code for reads/writes to each column. Consolidate to one canonical flag and drop the others.

---

### 6. `action_milestones`: `finalized`, `attention_to_timeline`, `confirmation_needed` duplicate `action_tracking_status` on `actions`

```sql
-- on actions:
tracking_status un80actions.action_tracking_status  -- 'Finalized', 'Attention to timeline', etc.

-- on action_milestones:
finalized            boolean default false not null,
attention_to_timeline boolean default false not null,
confirmation_needed  boolean default false not null,
```

The source of truth for these tracking states is ambiguous. Any report or dashboard combining both tables risks showing mismatched values.

**Fix:** Decide whether tracking status is per-action or per-milestone (or both, intentionally) and document/enforce accordingly. If milestone-level, remove from `actions`. If action-level, remove from `action_milestones`.

---

### 7. `action_milestones.updates` — legacy text column alongside the `milestone_updates` table

```sql
updates text,  -- on action_milestones
```

The `milestone_updates` table is the structured home for milestone updates. The `updates text` column on `action_milestones` appears to be a legacy field that is likely no longer written to. Keeping it risks old data being surfaced or new code accidentally writing to the wrong place.

**Fix:** Verify no app code writes to `action_milestones.updates`, then drop the column.

---

### 8. `milestone_attachments.file_size` is `integer`; `action_attachments.file_size` is `bigint`

```sql
-- milestone_attachments:
file_size integer,           -- caps at ~2 GB, nullable

-- action_attachments:
file_size bigint not null,   -- correct
```

Inconsistency between the two attachment tables. Files over ~2 GB will overflow or error on `milestone_attachments`. Also nullable here vs NOT NULL there.

**Fix:**
```sql
alter table un80actions.milestone_attachments
  alter column file_size type bigint,
  alter column file_size set not null;
```

---

### 9. `users.updated_at` has no trigger — never auto-updated

```sql
updated_at timestamp with time zone default now(),
```

The column carries a creation default but there is no `BEFORE UPDATE` trigger to refresh it. It will always show the creation timestamp, making it useless for detecting stale sessions or recent logins (which have their own `last_login_at`).

**Fix:** Add a trigger, or drop `updated_at` if it serves no purpose.

---

### 10. `approved_users.user_role` and `user_status` are nullable

```sql
user_status un80actions.user_status,  -- no NOT NULL
user_role   un80actions.user_roles,   -- no NOT NULL
```

A user with `user_role IS NULL` will pass `approved_users` existence checks during auth but then fail role-based permission checks at the application layer. This is a latent runtime error waiting for a bad insert.

**Fix:**
```sql
alter table un80actions.approved_users
  alter column user_role   set not null,
  alter column user_status set not null;
```
Ensure all existing rows are populated first.

---

## 🟡 Medium — Missing Indexes / Performance

### 11. `magic_tokens` — no indexes on lookup columns ✅ `002_add_missing_indexes.sql`

Auth queries filter by `email` (to find a token for a user) and by `expires_at` (to find/purge expired tokens). Neither has an index.

```sql
create index idx_magic_tokens_email      on un80actions.magic_tokens (email);
create index idx_magic_tokens_expires_at on un80actions.magic_tokens (expires_at);
```

---

### 12. `action_notes`, `action_questions`, `action_updates` — no composite index on `(action_id, action_sub_id)` ✅ `002_add_missing_indexes.sql`

These three high-traffic tables are queried by action every time the action modal loads, but only `action_legal_comments` and `action_attachments` have this index defined.

```sql
create index idx_action_notes_action     on un80actions.action_notes     (action_id, action_sub_id);
create index idx_action_questions_action on un80actions.action_questions  (action_id, action_sub_id);
create index idx_action_updates_action   on un80actions.action_updates    (action_id, action_sub_id);
```

---

### 13. `activity_entries.milestone_id` — no index ✅ `002_add_missing_indexes.sql`

Used in milestone-specific activity feeds but missing an index.

```sql
create index idx_activity_entries_milestone_id on un80actions.activity_entries (milestone_id)
  where milestone_id is not null;
```

---

## 🔵 Low — Style / Convention

### 14. `action_milestones.public_progress` uses a text CHECK constraint instead of an enum

```sql
public_progress text constraint action_milestones_public_progress_check check (
    public_progress is null or public_progress = any(array['completed','in_progress','delayed'])
),
```

All other status-like fields use enum types. This field should be `create type un80actions.public_progress_status as enum ('completed', 'in_progress', 'delayed')`.

---

### 15. `action_leads`, `action_focal_points`, `action_member_persons`, `action_support_persons` — no explicit primary key

These tables have `unique` constraints but no declared `primary key`. Some PostgreSQL tooling and ORMs expect an explicit PK. The unique constraint columns should be promoted to a PK.

---

### 16. `workstreams.workstream_title` is nullable

```sql
workstream_title text,  -- no NOT NULL
```

Every workstream should have a title. This should be `NOT NULL`.

---

### 17. `action_notes` (and `action_questions`, `action_updates`, `action_legal_comments`) — `user_id ON DELETE CASCADE`

Deleting a user cascades to delete their notes, questions, updates, and legal comments. Whether this is intentional or not, it is inconsistent with how milestones handle this (`SET NULL`). For auditability, `SET NULL` is typically preferable for content authored by a user.

---

### 18. Empty-string sentinel for `action_sub_id` throughout

```sql
action_sub_id text default ''::text not null,
```

Used in ~10 tables. An empty string is a weak sentinel — `NULL` would be more idiomatic SQL and would allow `IS NULL` checks instead of `= ''`. The current pattern requires `IS NOT DISTINCT FROM` in every FK filter (as noted in the project conventions) specifically to work around this.

---

### 19. `action_milestones` OLA review fields lack audit timestamps

```sql
needs_ola_review boolean default false not null,
reviewed_by_ola  boolean default false not null,
```

When OLA review was performed is unrecorded. Consider adding `ola_reviewed_at timestamp with time zone` alongside `reviewed_by_ola`.

---

### 20. `milestone_updates.is_resolved` lacks resolution audit fields

```sql
is_resolved boolean default false not null,
```

No `resolved_by uuid` or `resolved_at timestamp with time zone` columns track who resolved the thread or when.

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| 🔴 Critical | 3 | #1, #2, #3 |
| 🟠 High | 7 | #4 – #10 |
| 🟡 Medium | 3 | #11 – #13 |
| 🔵 Low | 7 | #14 – #20 |
