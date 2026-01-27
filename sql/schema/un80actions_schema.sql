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
create type milestone_type as enum ('first', 'final', 'upcoming');
create type user_role as enum ('Principal', 'Support', 'Focal', 'Assistant', 'Admin');
-- Admin is UN80 internal
-- =========================================================
-- CORE TABLES
-- =========================================================
-- Workstreams (e.g. WS1, WS2, WS3)
-- NOTE: This was called "reports" in earlier schema drafts.
-- IDs are fixed: 1, 2, 3 (representing WS1, WS2, WS3)
create table workstreams (
    id int primary key check (
        id between 1 and 3
    ),
    code text not null unique
);
-- Work packages (scoped to a workstream)
create table work_packages (
    id int primary key,
    workstream_id int not null references workstreams(id) on delete restrict,
    number int not null,
    name text not null,
    goal text,
    constraint work_packages_workstream_number_key unique (workstream_id, number)
);
-- Actions
create table actions (
    id int primary key,
    work_package_id int not null references work_packages(id) on delete cascade,
    document_paragraph text,
    action_number int not null,
    indicative_activity text not null,
    is_big_ticket boolean not null default false,
    is_subaction boolean not null default false,
    sub_action_details text,
    doc_text text,
    public_action_status public_action_status,
    constraint actions_wp_action_number_key unique (work_package_id, action_number)
);
-- Action milestones
create table action_milestones (
    id int primary key,
    action_id int not null references actions(id) on delete cascade,
    milestone_type milestone_type not null,
    description text,
    delivery_date date,
    deadline date,
    updates text,
    constraint action_milestones_action_type_key unique (action_id, milestone_type)
);
-- =========================================================
-- ENTITIES & LEADS
-- =========================================================
-- from systemchart
create table entities (id text primary key, entity_long text);
-- Leads table - all possible leads (e.g., USG DESA)
create table leads (
    id serial primary key,
    entity_id text not null references entities(id) on delete restrict,
    name text not null unique
);
-- Work package ↔ leads
create table work_package_leads (
    work_package_id int not null references work_packages(id) on delete cascade,
    lead_id int not null references leads(id) on delete restrict,
    primary key (work_package_id, lead_id)
);
-- Action ↔ leads
create table action_leads (
    action_id int not null references actions(id) on delete cascade,
    lead_id int not null references leads(id) on delete restrict,
    primary key (action_id, lead_id)
);
create table action_entities (
    action_id int not null references actions(id) on delete cascade,
    entity_id text not null references entities(id) on delete restrict,
    primary key (action_id, entity_id)
);
-- =========================================================
-- USERS & AUTHENTICATION
-- =========================================================
-- Pre-approved users whitelist
create table approved_users (
    id serial primary key,
    email text not null unique,
    entity_id text not null references entities(id) on delete restrict,
    role user_role not null,
    lead_id int references leads(id) on delete restrict,
    created_at timestamp not null default now()
);
-- Actual authenticated users
create table users (
    id serial primary key,
    email text not null unique,
    role user_role not null,
    lead_id int references leads(id) on delete restrict,
    entity_id text not null references entities(id) on delete restrict,
    created_at timestamp not null default now(),
    last_login_at timestamp
);
create table magic_link_tokens (
    id serial primary key,
    token text not null unique,
    user_id int not null references users(id) on delete cascade,
    expires_at timestamp not null,
    used_at timestamp,
    created_at timestamp not null default now()
);
-- =========================================================
-- NOTES & QUESTIONS
-- =========================================================
create table action_notes (
    id serial primary key,
    action_id int not null references actions(id) on delete cascade,
    user_id int not null references users(id) on delete restrict,
    content text not null,
    parent_id int references action_notes(id) on delete cascade,
    created_at timestamp not null default now(),
    updated_at timestamp
);
create table action_questions (
    id serial primary key,
    action_id int not null references actions(id) on delete cascade,
    user_id int not null references users(id) on delete restrict,
    question text not null,
    answer text,
    answered_by int references users(id) on delete
    set null,
        answered_at timestamp,
        created_at timestamp not null default now(),
        updated_at timestamp
);
-- =========================================================
-- INDEXES (DASHBOARD / FILTERING)
-- =========================================================
create index actions_work_package_id_idx on actions(work_package_id);
create index actions_delivery_date_idx on actions(delivery_date);
create index actions_status_idx on actions(public_action_status);
create index actions_big_ticket_idx on actions(is_big_ticket);
create index action_milestones_action_id_idx on action_milestones(action_id);
create index action_milestones_deadline_idx on action_milestones(deadline);
create index leads_entity_id_idx on leads(entity_id);
create index work_package_leads_lead_id_idx on work_package_leads(lead_id);
create index action_leads_lead_id_idx on action_leads(lead_id);
create index action_entities_entity_id_idx on action_entities(entity_id);
create index approved_users_email_idx on approved_users(email);
create index approved_users_entity_id_idx on approved_users(entity_id);
create index approved_users_lead_id_idx on approved_users(lead_id);
create index users_entity_id_idx on users(entity_id);
create index users_lead_id_idx on users(lead_id);
create index users_role_idx on users(role);
create index magic_link_tokens_token_idx on magic_link_tokens(token);
create index magic_link_tokens_user_id_idx on magic_link_tokens(user_id);
create index magic_link_tokens_expires_at_idx on magic_link_tokens(expires_at);
create index action_notes_action_id_idx on action_notes(action_id);
create index action_notes_user_id_idx on action_notes(user_id);
create index action_notes_parent_id_idx on action_notes(parent_id);
create index action_notes_created_at_idx on action_notes(created_at);
create index action_questions_action_id_idx on action_questions(action_id);
create index action_questions_user_id_idx on action_questions(user_id);
create index action_questions_answered_by_idx on action_questions(answered_by);
create index action_questions_created_at_idx on action_questions(created_at);
-- =========================================================
-- END
-- =========================================================