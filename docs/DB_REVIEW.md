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