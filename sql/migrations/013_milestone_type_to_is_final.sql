-- Migration 013: Replace milestone_type enum with is_final flag + per-track serial_number
--
-- Problem: milestone_type ('first','second','third','upcoming','final') caps milestones at 5
-- and conflates ordinal identity with semantics.
--
-- New design:
--   - is_final boolean: user-taggable flag to mark the terminal/goal milestone
--   - serial_number: unique per (action_id, action_sub_id, is_public) track
--     Public milestones: 1, 2, 3... (independent sequence)
--     Internal milestones: 1, 2, 3... (independent sequence)
--   - Unique constraint on (action_id, action_sub_id, is_public, serial_number)
--
-- Semantics after migration:
--   "upcoming" (public dashboard milestone) → first public milestone by serial_number
--   "final" (terminal goal)                 → is_final = true
--   "first/second/third" (internal order)   → serial_number 1, 2, 3 in internal track

BEGIN;

-- 1. Add is_final column
ALTER TABLE un80actions.action_milestones
    ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false;

-- 2. Copy semantic from milestone_type = 'final'
UPDATE un80actions.action_milestones
SET is_final = true
WHERE milestone_type = 'final';

-- 3. Renumber serial_number per (action_id, action_sub_id, is_public) track
--    Public milestones:   order by deadline ASC NULLS LAST
--    Internal milestones: order by existing type order (first<second<third<final) then deadline
WITH renumbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY action_id, action_sub_id, is_public
            ORDER BY
                CASE
                    WHEN is_public THEN 0  -- public: just order by deadline
                    ELSE CASE milestone_type
                        WHEN 'first'    THEN 1
                        WHEN 'second'   THEN 2
                        WHEN 'third'    THEN 3
                        WHEN 'upcoming' THEN 4
                        WHEN 'final'    THEN 99
                        ELSE 50
                    END
                END,
                deadline ASC NULLS LAST
        ) AS new_serial
    FROM un80actions.action_milestones
)
UPDATE un80actions.action_milestones m
SET serial_number = r.new_serial
FROM renumbered r
WHERE m.id = r.id;

-- 4. Add unique constraint on (action_id, action_sub_id, is_public, serial_number)
--    Drops first in case of re-run
ALTER TABLE un80actions.action_milestones
    DROP CONSTRAINT IF EXISTS action_milestones_action_track_serial_unique;

ALTER TABLE un80actions.action_milestones
    ADD CONSTRAINT action_milestones_action_track_serial_unique
        UNIQUE (action_id, action_sub_id, is_public, serial_number);

-- 5. Drop milestone_type column (and its NOT NULL constraint implicitly)
ALTER TABLE un80actions.action_milestones
    DROP COLUMN milestone_type;

-- 6. Drop the now-unused enum type
DROP TYPE IF EXISTS un80actions.milestone_type;

COMMIT;
