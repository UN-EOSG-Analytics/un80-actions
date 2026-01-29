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
create type milestone_type as enum ('first', 'final', 'upcoming');
create type milestone_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected'
);
create type user_roles as enum (
    'Principal',
    'Support',
    'Focal',
    'Assistant',
    'Admin',
    'Legal'
);
-- =========================================================
-- USERS & AUTHENTICATION
-- =========================================================
-- Pre-approved users whitelist
-- Defines who is allowed to access the system and their default permissions
create table approved_users (
    email text not null unique primary key,
    full_name text not null,
    system_entity text not null references systemchart.entities(entity) on delete restrict,
    lead_positions text[],
    user_status text,
    user_role user_roles not null,
    created_at timestamp not null default now()
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
create table users (
    id serial primary key,
    email text not null unique references approved_users(email),
    entity_id text not null references systemchart.entities(entity) on delete restrict,
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
create table actions (
    primary key (id, sub_id),
    id int not null,
    sub_id text not null default '',
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
    -- Milestones (stored as text in this table, separate milestone table exists)
    milestone_1 text,
    milestone_1_deadline date,
    milestone_2 text,
    milestone_2_deadline date,
    milestone_3 text,
    milestone_3_deadline date,
    milestone_upcoming text,
    milestone_upcoming_deadline date,
    miletstone_final text,
    -- Note: typo in CSV
    milestone_final_deadline date,
    -- Flags
    is_big_ticket boolean not null default false,
    needs_member_state_engagement boolean not null default false,
    -- Status & tracking
    tracking_status action_tracking_status,
    public_action_status public_action_status,
    -- Notes
    action_notes text,
    action_updates text,
    -- Airtable reference
    action_record_id text
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
    submitted_by int references users(id) on delete cascade,
    submitted_by_entity text references systemchart.entities(entity) on delete
    set null,
        submitted_at timestamp,
        reviewed_by int references users(id) on delete cascade,
        reviewed_at timestamp,
        approved_by int references users(id) on delete cascade,
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
    lead_name text not null references leads(name) on delete restrict,
    primary key (work_package_id, lead_name)
);
-- Work package ↔ focal points (users via email)
create table work_package_focal_points (
    work_package_id int not null references work_packages(id) on delete cascade,
    user_email text not null references users(email) on delete cascade,
    primary key (work_package_id, user_email)
);
-- Action ↔ leads (from same shared pool)
create table action_leads (
    action_id int not null,
    action_sub_id text not null,
    lead_name text not null references leads(name) on delete restrict,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, lead_name)
);
-- Action ↔ focal points (users via email)
create table action_focal_points (
    action_id int not null,
    action_sub_id text not null,
    user_email text not null references users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, user_email)
);
-- Action ↔ member persons (users via email)
create table action_member_persons (
    action_id int not null,
    action_sub_id text not null,
    user_email text not null references users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, user_email)
);
-- Action ↔ support persons (users via email)
create table action_support_persons (
    action_id int not null,
    action_sub_id text not null,
    user_email text not null references users(email) on delete cascade,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade,
    primary key (action_id, action_sub_id, user_email)
);
-- Action ↔ member entities (responsible organizations)
create table action_member_entities (
    action_id int not null,
    action_sub_id text not null,
    entity_id text not null references systemchart.entities(entity) on delete restrict,
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
    user_id int not null references users(id) on delete cascade,
    content text not null,
    created_at timestamp not null default now(),
    updated_at timestamp,
    foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);
create table action_questions (
    id serial primary key,
    action_id int not null,
    action_sub_id text not null,
    user_id int not null references users(id) on delete cascade,
    question text not null,
    answer text,
    answered_by int references users(id) on delete
    set null,
        answered_at timestamp,
        created_at timestamp not null default now(),
        updated_at timestamp,
        foreign key (action_id, action_sub_id) references actions(id, sub_id) on delete cascade
);