-- DO NOT CREATE INDEXES YET!!
-- Clean up existing schema
drop schema if exists un80actions cascade;
create schema un80actions;
-- Sets the search path for the current session to the 'un80actions' schema
set search_path = un80actions;
-- =========================================================
-- ENUM TYPES
-- =========================================================
create type public_action_status as enum ('Further work ongoing', 'Decision taken');
create type action_tracking_status as enum (
    'Finalized',
    'Attention to timeline',
    'No submission',
    'Confirmation needed'
);
create type milestone_type as enum ('first', 'second', 'third', 'upcoming', 'final');
create type milestone_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected'
);
create type risk_assessment as enum ('at_risk', 'medium_risk', 'low_risk');
create type user_roles as enum (
    'Principal',
    'Support',
    'Focal Point',
    'Assistant',
    'Admin',
    'Legal'
);
create type user_status as enum ('Active', 'Inactive');
create type content_review_status as enum ('approved', 'needs_review');
-- =========================================================
-- USERS & AUTHENTICATION
-- =========================================================
-- Pre-approved users whitelist
-- Defines who is allowed to access the system and their default permissions
create table approved_users (
    email text not null unique primary key,
    full_name text,
    entity text references systemchart.entities(entity) on delete restrict, 
    --  should make this not null once input is completed
    user_status user_status,
    user_role user_roles,
    created_at timestamp with time zone not null default now()
);
comment on table approved_users is 'Pre-approval registry. Users must have an entry here to authenticate. Email links to users table.';
-- =========================================================
-- ENTITIES & LEADS
-- =========================================================
-- Organizational entities (from systemchart)
-- create table systemchart.entities (id text primary key, entity_long text);
-- Leads - shared by both work packages and actions
-- Examples: "USG DPPA", "USG DPO", "USG DESA", "Administrator UNDP", "Chair HLCM"
create table leads (
    name text primary key,
    entity text references systemchart.entities(entity) on delete restrict
);
-- Approved users ↔ leads (many-to-many)
-- Links approved users to their lead positions
-- Supports: one user with multiple positions, multiple users sharing one position (e.g., "Co-Chairs BIG")
create table approved_user_leads (
    user_email text not null references approved_users(email) on delete cascade,
    lead_name text not null references leads(name) on delete restrict,
    primary key (user_email, lead_name)
);
-- Actual authenticated users
-- Populated from approved_users on first login via email match
-- APPLICATION LOGIC: Only create users entry if email exists in approved_users
-- This table tracks people who actually used the platform
create table users (
    id uuid primary key default gen_random_uuid() not null,
    email text not null unique references approved_users(email),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    last_login_at timestamp with time zone
);
-- Passwordless authentication tokens
create table magic_tokens (
    token text not null primary key,
    email text not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone
);
-- =========================================================
-- CORE TABLES
-- =========================================================
-- Workstreams (e.g. WS1, WS2, WS3)
create table workstreams (
    id text primary key,
    workstream_title text,
    report_title text,
    report_document_symbol text
);
-- Work packages (scoped to a workstream)
create table work_packages (
    id int not null primary key,
    workstream_id text not null references workstreams(id) on delete restrict,
    work_package_title text not null,
    work_package_goal text
);
-- Actions
-- Uniquely identified by id + sub_id (e.g., id=94, sub_id="(a)")
-- sub_id is NULL for actions without sub-actions
-- Use COALESCE in unique constraint to handle NULL values
create table actions (
    id int not null,
    sub_id text,
    -- 
    work_package_id int not null references work_packages(id) on delete cascade,
    -- Content & description
    indicative_action text not null,
    sub_action text,
    document_paragraph_number text,
    document_paragraph_text text,
    -- Implementation details
    scope_definition text,
    legal_considerations text,
    proposal_advancement_scenario text,
    un_budgets text,
    -- Flags
    is_big_ticket boolean not null default false,
    needs_member_state_engagement boolean not null default false,
    -- Status & tracking
    tracking_status action_tracking_status,
    public_action_status public_action_status,
    -- Admin-only risk assessment
    risk_assessment risk_assessment,
    -- Airtable reference
    action_record_id text,
    -- Unique constraint that treats NULL as a value
    unique (id, sub_id)
);
-- Action milestones
create table action_milestones (
    id uuid primary key default gen_random_uuid(),
    action_id int not null,
    action_sub_id text,
    milestone_type milestone_type not null,
    description text,
    deadline date,
    updates text,
    status milestone_status not null default 'draft',
    content_review_status content_review_status not null default 'approved',
    content_reviewed_by uuid references users(id) on delete set null,
    content_reviewed_at timestamp with time zone,
    submitted_by uuid references users(id) on delete cascade,
    submitted_by_entity text references systemchart.entities(entity) on delete
    set null,
        submitted_at timestamp with time zone,
        reviewed_by uuid references users(id) on delete cascade,
        reviewed_at timestamp with time zone,
        approved_by uuid references users(id) on delete cascade,
        approved_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
        constraint action_milestones_action_type_key unique (action_id, action_sub_id, milestone_type)
);

-- Milestone version history
create table milestone_versions (
    id uuid primary key default gen_random_uuid(),
    milestone_id uuid not null references action_milestones(id) on delete cascade,
    description text,
    deadline date,
    updates text,
    status milestone_status not null,
    changed_by uuid references users(id) on delete set null,
    changed_at timestamp with time zone not null default now(),
    change_type text not null -- 'created', 'updated', 'submitted', 'approved', 'rejected'
);
create index idx_milestone_versions_milestone_id on milestone_versions(milestone_id);
create index idx_milestone_versions_changed_at on milestone_versions(changed_at desc);

-- Milestone attachments (documents; view/download restricted to Admin/superusers)
create table milestone_attachments (
    id uuid primary key default gen_random_uuid(),
    milestone_id uuid not null references action_milestones(id) on delete cascade,
    file_name text not null,
    file_path text not null,
    content_type text,
    file_size int,
    uploaded_by uuid references users(id) on delete set null,
    uploaded_at timestamp with time zone not null default now()
);
create index idx_milestone_attachments_milestone_id on milestone_attachments(milestone_id);

-- =========================================================
-- RELATIONSHIP TABLES
-- =========================================================
-- Work package ↔ leads (from shared pool)
create table work_package_leads (
    work_package_id int not null references work_packages(id) on delete cascade,
    lead_name text not null references leads(name) on delete restrict,
    primary key (work_package_id, lead_name)
);
-- Work package ↔ focal points (users via email)
create table work_package_focal_points (
    work_package_id int not null references work_packages(id) on delete cascade,
    user_email text not null references approved_users(email) on delete cascade,
    primary key (work_package_id, user_email)
);
-- Action ↔ leads (from same shared pool)
create table action_leads (
    action_id int not null,
    action_sub_id text,
    lead_name text not null references leads(name) on delete restrict,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    unique (action_id, action_sub_id, lead_name)
);
-- Action ↔ focal points (users via email)
create table action_focal_points (
    action_id int not null,
    action_sub_id text,
    user_email text not null references approved_users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    unique (action_id, action_sub_id, user_email)
);
-- Action ↔ member persons (users via email)
create table action_member_persons (
    action_id int not null,
    action_sub_id text,
    user_email text not null references approved_users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    unique (action_id, action_sub_id, user_email)
);
-- Action ↔ support persons (users via email)
create table action_support_persons (
    action_id int not null,
    action_sub_id text,
    user_email text not null references approved_users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    unique (action_id, action_sub_id, user_email)
);
-- Action ↔ member entities (responsible organizations)
create table action_member_entities (
    action_id int not null,
    action_sub_id text,
    entity_id text not null references systemchart.entities(entity) on delete restrict,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    unique (action_id, action_sub_id, entity_id)
);
-- =========================================================
-- NOTES & QUESTIONS
-- =========================================================
create table action_notes (
    id uuid primary key default gen_random_uuid(),
    action_id int not null,
    action_sub_id text,
    user_id uuid references users(id) on delete cascade,
    content text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone,
    content_review_status content_review_status not null default 'approved',
    content_reviewed_by uuid references users(id) on delete set null,
    content_reviewed_at timestamp with time zone,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);
create table action_questions (
    id uuid primary key default gen_random_uuid(),
    action_id int not null,
    action_sub_id text,
    user_id uuid not null references users(id) on delete cascade,
    question text not null,
    answer text,
    answered_by uuid references users(id) on delete set null,
    answered_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone,
    content_review_status content_review_status not null default 'approved',
    content_reviewed_by uuid references users(id) on delete set null,
    content_reviewed_at timestamp with time zone,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);
-- Shared tags (reusable across milestones, notes, questions)
create table tags (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamp with time zone not null default now()
);
create table milestone_tags (
    milestone_id uuid not null references action_milestones(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    primary key (milestone_id, tag_id)
);
create table note_tags (
    note_id uuid not null references action_notes(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    primary key (note_id, tag_id)
);
create table question_tags (
    question_id uuid not null references action_questions(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    primary key (question_id, tag_id)
);
create index idx_milestone_tags_milestone_id on milestone_tags(milestone_id);
create index idx_milestone_tags_tag_id on milestone_tags(tag_id);
create index idx_note_tags_note_id on note_tags(note_id);
create index idx_note_tags_tag_id on note_tags(tag_id);
create index idx_question_tags_question_id on question_tags(question_id);
create index idx_question_tags_tag_id on question_tags(tag_id);

create table action_updates (
    id uuid primary key default gen_random_uuid(),
    action_id int not null,
    action_sub_id text,
    user_id uuid references users(id) on delete cascade,
    content text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone,
    content_review_status content_review_status not null default 'approved',
    content_reviewed_by uuid references users(id) on delete set null,
    content_reviewed_at timestamp with time zone,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);

-- =========================================================
-- INCREMENTAL MIGRATIONS (for existing databases)
-- Run only the block below if you have an existing un80actions
-- schema and need to add risk_assessment or milestone_attachments
-- without dropping and recreating the schema.
-- Usage: SET search_path TO un80actions; then run the block.
-- =========================================================

-- Add risk_assessment column to actions table (admin-only field)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'risk_assessment' AND n.nspname = 'un80actions') THEN
    CREATE TYPE risk_assessment AS ENUM ('at_risk', 'medium_risk', 'low_risk');
  END IF;
END
$$;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS risk_assessment risk_assessment;

-- Add milestone_attachments table
CREATE TABLE IF NOT EXISTS milestone_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES action_milestones(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_path text NOT NULL,
    content_type text,
    file_size int,
    uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestone_attachments_milestone_id ON milestone_attachments(milestone_id);

-- Add content review fields (needs_review / approved with reviewer)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'content_review_status' AND n.nspname = 'un80actions') THEN
    CREATE TYPE content_review_status AS ENUM ('approved', 'needs_review');
  END IF;
END
$$;
ALTER TABLE action_milestones ADD COLUMN IF NOT EXISTS content_review_status content_review_status NOT NULL DEFAULT 'approved';
ALTER TABLE action_milestones ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE action_milestones ADD COLUMN IF NOT EXISTS content_reviewed_at timestamp with time zone;
ALTER TABLE action_notes ADD COLUMN IF NOT EXISTS content_review_status content_review_status NOT NULL DEFAULT 'approved';
ALTER TABLE action_notes ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE action_notes ADD COLUMN IF NOT EXISTS content_reviewed_at timestamp with time zone;
ALTER TABLE action_questions ADD COLUMN IF NOT EXISTS content_review_status content_review_status NOT NULL DEFAULT 'approved';
ALTER TABLE action_questions ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE action_questions ADD COLUMN IF NOT EXISTS content_reviewed_at timestamp with time zone;
ALTER TABLE action_updates ADD COLUMN IF NOT EXISTS content_review_status content_review_status NOT NULL DEFAULT 'approved';
ALTER TABLE action_updates ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE action_updates ADD COLUMN IF NOT EXISTS content_reviewed_at timestamp with time zone;

-- Tags (reusable across milestones, notes, questions)
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS milestone_tags (
    milestone_id uuid NOT NULL REFERENCES action_milestones(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (milestone_id, tag_id)
);
CREATE TABLE IF NOT EXISTS note_tags (
    note_id uuid NOT NULL REFERENCES action_notes(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);
CREATE TABLE IF NOT EXISTS question_tags (
    question_id uuid NOT NULL REFERENCES action_questions(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_milestone_tags_milestone_id ON milestone_tags(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tags_tag_id ON milestone_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);

-- Milestone version history (ensure table exists for existing DBs that may not have it)
CREATE TABLE IF NOT EXISTS milestone_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES action_milestones(id) ON DELETE CASCADE,
    description text,
    deadline date,
    updates text,
    status milestone_status NOT NULL,
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_at timestamp with time zone NOT NULL DEFAULT now(),
    change_type text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_milestone_versions_milestone_id ON milestone_versions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_versions_changed_at ON milestone_versions(changed_at DESC);