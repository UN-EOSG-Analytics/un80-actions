-- Seed: Add one question for Action 1 (Work Package 22) – "Task Force" on Feb 13, question "for who?"
-- Run once with: psql $DATABASE_URL -f sql/seed_question_action1_task_force.sql
-- Or run the INSERT below in your SQL client.

SET search_path TO un80actions;

INSERT INTO action_questions (
  action_id,
  action_sub_id,
  user_id,
  header,
  subtext,
  question_date,
  question,
  milestone_id,
  content_review_status,
  comment
)
SELECT
  1,
  '',
  (SELECT id FROM users LIMIT 1),
  'Task Force',
  NULL,
  '2026-02-13'::date,
  'for who?',
  NULL,
  'needs_review'::content_review_status,
  NULL
WHERE EXISTS (SELECT 1 FROM users LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM action_questions
    WHERE action_id = 1 AND (action_sub_id IS NOT DISTINCT FROM '')
      AND header = 'Task Force' AND question = 'for who?' AND question_date = '2026-02-13'
  );
