-- =========================================================
-- Schema: un80actions
-- =========================================================
-- Clean up existing schema
drop schema if exists un80actions cascade;
create schema un80actions;
set search_path = un80actions,
    public;
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
create type milestone_type as enum ('first', 'final', 'upcoming');
create type milestone_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected'
);
create type user_role as enum (
    'Principal',
    'Support',
    'Focal',
    'Assistant',
    'Admin',
    'Legal'
);
-- Admin is UN80 internal
-- =========================================================
-- ENTITIES & LEADS (Created first - no dependencies)
-- =========================================================
-- Organizational entities (from systemchart)
create table un_entities (id text primary key, entity_long text);
-- Leads pool - shared by both work packages and actions
-- Examples: "USG DPPA", "USG DPO", "USG DESA", "Administrator UNDP"
create table leads (
    id serial primary key,
    entity_id text not null references un_entities(id) on delete restrict,
    name text not null unique
);
comment on table leads is 'Shared pool of leadership positions. Both work packages and actions draw leads from this single table.';
-- =========================================================
-- USERS & AUTHENTICATION
-- =========================================================
-- Pre-approved users whitelist
-- Defines who is allowed to access the system and their default permissions
create table approved_users (
    id serial primary key,
    email text not null unique,
    entity_id text not null references un_entities(id) on delete restrict,
    role user_role not null,
    lead_id int references leads(id) on delete restrict,
    created_at timestamp not null default now()
);
comment on table approved_users is 'Pre-approval registry. Users must have an entry here to authenticate. Email links to users table.';
-- Actual authenticated users
-- Populated from approved_users on first login via email match
-- APPLICATION LOGIC: Only create users entry if email exists in approved_users
create table users (
    id serial primary key,
    email text not null unique,
    role user_role not null,
    lead_id int references leads(id) on delete restrict,
    entity_id text not null references un_entities(id) on delete restrict,
    created_at timestamp not null default now(),
    last_login_at timestamp
);
-- Passwordless authentication tokens
-- Uses timestamptz for unambiguous expiration handling across timezones
create table magic_tokens (
    token text not null primary key,
    email text not null references approved_users(email) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    used_by int references users(id) on delete
    set null,
        created_at timestamptz not null default now()
);
-- =========================================================
-- CORE TABLES
-- =========================================================
-- Workstreams (e.g. WS1, WS2, WS3)
-- NOTE: This was called "reports" in earlier schema drafts.
-- IDs are fixed: 1, 2, 3 (representing WS1, WS2, WS3)
create table workstreams (
    id text primary key code text not null unique,
    workstream_title text,
    report_title text,
    report_document_symbol text
);
-- Work packages (scoped to a workstream)
create table work_packages (
    id int not null primary key,
    workstream_id text not null references workstreams(id) on delete restrict,
    name text not null,
    goal text,
    constraint work_packages_workstream_number_key unique (workstream_id, number)
);
-- Actions
-- Uniquely identified by id + sub_id (e.g., id=94, sub_id="(a)")
create table actions (
    id int not null,
    sub_id text not null,
    work_package_id int not null references work_packages(id) on delete cascade,
    document_lgraph_number text,
    document_paragraph_text text,
    action_number int not null,
    indicative_action text not null,
    indicative_sub_action text,
    is_big_ticket boolean not null default false,
    is_subaction boolean not null default false,
    tracking_status action_tracking_status,
    doc_text text,
    public_action_status public_action_status,
    primary key (id, sub_id),
    constraint actions_wp_action_number_key unique (work_package_id, action_number)
);
-- Action milestones
create table action_milestones (
    id int primary key,
    action_id int not null,
    action_sub_id text not null,
    milestone_type milestone_type not null,
    description text,
    delivery_date date,
    deadline date,
    updates text,
    status milestone_status not null default 'draft',
    submitted_by int references users(id) on delete
    set null,
        submitted_by_entity text references un_entities(id) on delete
    set null,
        submitted_at timestamp,
        reviewed_by int references users(id) on delete
    set null,
        reviewed_at timestamp,
        approved_by int references users(id) on delete
    set null,
        approved_at timestamp,
        foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
        constraint action_milestones_action_type_key unique (action_id, action_sub_id, milestone_type)
);
-- =========================================================
-- RELATIONSHIP TABLES
-- =========================================================
-- Work package ↔ leads (from shared pool)
create table work_package_leads (
    work_package_id int not null references work_packages(id) on delete cascade,
    lead_id int not null references leads(id) on delete restrict,
    primary key (work_package_id, lead_id)
);
-- Action ↔ leads (from same shared pool)
create table action_leads (
    action_id int not null,
    action_sub_id text not null,
    lead_id int not null references leads(id) on delete restrict,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, lead_id)
);
-- Action ↔ entities (responsible organizations)
create table action_entities (
    action_id int not null,
    action_sub_id text not null,
    entity_id text not null references un_entities(id) on delete restrict,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, entity_id)
);
-- =========================================================
-- NOTES & QUESTIONS
-- =========================================================
create table action_notes (
    id serial primary key,
    action_id int not null,
    action_sub_id text not null,
    user_id int not null references users(id) on delete restrict,
    content text not null,
    created_at timestamp not null default now(),
    updated_at timestamp,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);
create table action_questions (
    id serial primary key,
    action_id int not null,
    action_sub_id text not null,
    user_id int not null references users(id) on delete restrict,
    question text not null,
    answer text,
    answered_by int references users(id) on delete
    set null,
        answered_at timestamp,
        created_at timestamp not null default now(),
        updated_at timestamp,
        foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);
-- =========================================================
-- INDEXES (DASHBOARD / FILTERING)
-- =========================================================
create index actions_work_package_id_idx on actions(work_package_id);
create index actions_status_idx on actions(public_action_status);
create index actions_big_ticket_idx on actions(is_big_ticket);
create index action_milestones_action_idx on action_milestones(action_id, action_sub_id);
create index action_milestones_deadline_idx on action_milestones(deadline);
create index action_milestones_status_idx on action_milestones(status);
create index action_milestones_submitted_by_idx on action_milestones(submitted_by);
create index action_milestones_reviewed_by_idx on action_milestones(reviewed_by);
create index action_milestones_approved_by_idx on action_milestones(approved_by);
create index leads_entity_id_idx on leads(entity_id);
create index work_package_leads_lead_id_idx on work_package_leads(lead_id);
create index action_leads_action_idx on action_leads(action_id, action_sub_id);
create index action_leads_lead_id_idx on action_leads(lead_id);
create index action_entities_action_idx on action_entities(action_id, action_sub_id);
create index action_entities_entity_id_idx on action_entities(entity_id);
create index un_entities_id_idx on un_entities(id);
create index approved_users_email_idx on approved_users(email);
create index approved_users_entity_id_idx on approved_users(entity_id);
create index approved_users_lead_id_idx on approved_users(lead_id);
create index users_entity_id_idx on users(entity_id);
create index users_lead_id_idx on users(lead_id);
create index users_role_idx on users(role);
create index magic_tokens_email_idx on magic_tokens(email);
create index magic_tokens_expires_at_idx on magic_tokens(expires_at);
create index action_notes_action_id_idx on action_notes(action_id);
create index action_notes_user_id_idx on action_notes(user_id);
create index action_notes_created_at_idx on action_notes(created_at);
create index action_questions_action_id_idx on action_questions(action_id);
create index action_questions_user_id_idx on action_questions(user_id);
create index action_questions_answered_by_idx on action_questions(answered_by);
create index action_questions_created_at_idx on action_questions(created_at);
-- =========================================================
-- END
-- =========================================================