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
create table approved_users (
    email text not null primary key,
    full_name text,
    entity text references systemchart.entities on delete restrict,
    user_status un80actions.user_status,
    user_role un80actions.user_roles,
    created_at timestamp with time zone default now() not null
);
comment on table approved_users is 'Pre-approval registry. Users must have an entry here to authenticate. Email links to users table.';
create table leads (
    name text not null primary key,
    entity text references systemchart.entities on delete restrict
);
create table approved_user_leads (
    user_email text not null references approved_users on delete cascade,
    lead_name text not null references leads on delete restrict,
    primary key (user_email, lead_name)
);
create table users (
    id uuid default gen_random_uuid() not null primary key,
    email text not null unique references approved_users,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    last_login_at timestamp with time zone
);
create table magic_tokens (
    token text not null primary key,
    email text not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone
);
create table workstreams (
    id text not null primary key,
    workstream_title text,
    report_title text,
    report_document_symbol text
);
create table work_packages (
    id integer not null primary key,
    workstream_id text not null references workstreams on delete restrict,
    work_package_title text not null,
    work_package_goal text
);
create table actions (
    id integer not null,
    sub_id text,
    work_package_id integer not null references work_packages on delete cascade,
    indicative_action text not null,
    sub_action text,
    document_paragraph_number text,
    document_paragraph_text text,
    scope_definition text,
    legal_considerations text,
    proposal_advancement_scenario text,
    un_budgets text,
    is_big_ticket boolean default false not null,
    needs_member_state_engagement boolean default false not null,
    tracking_status un80actions.action_tracking_status,
    public_action_status un80actions.public_action_status,
    risk_assessment un80actions.risk_assessment,
    action_record_id text,
    unique (id, sub_id)
);
create table action_milestones (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    milestone_type un80actions.milestone_type not null,
    is_public boolean default false not null,
    is_draft boolean default true not null,
    is_approved boolean default false not null,
    needs_attention boolean default false not null,
    description text,
    deadline date,
    updates text,
    status un80actions.milestone_status default 'draft'::un80actions.milestone_status not null,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        submitted_by uuid references users on delete cascade,
        submitted_by_entity text references systemchart.entities on delete
    set null,
        submitted_at timestamp with time zone,
        reviewed_by uuid references users on delete cascade,
        reviewed_at timestamp with time zone,
        approved_by uuid references users on delete cascade,
        approved_at timestamp with time zone,
        constraint action_milestones_action_type_key unique (action_id, action_sub_id, milestone_type),
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table milestone_versions (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references action_milestones on delete cascade,
    description text,
    deadline date,
    updates text,
    status un80actions.milestone_status not null,
    changed_by uuid references users on delete
    set null,
        changed_at timestamp with time zone default now() not null,
        change_type text not null
);
create index idx_milestone_versions_milestone_id on milestone_versions (milestone_id);
create index idx_milestone_versions_changed_at on milestone_versions (changed_at desc);
create table action_attachments (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    milestone_id uuid references action_milestones on delete
    set null,
        title text,
        description text,
        filename text not null,
        original_filename text not null,
        blob_name text not null unique,
        content_type text not null,
        file_size bigint not null,
        uploaded_by uuid references users on delete
    set null,
        uploaded_at timestamp with time zone default now() not null,
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create index idx_action_attachments_action on action_attachments (action_id, action_sub_id);
create index idx_action_attachments_milestone on action_attachments (milestone_id)
where (milestone_id IS NOT NULL);
create table work_package_leads (
    work_package_id integer not null references work_packages on delete cascade,
    lead_name text not null references leads on delete restrict,
    primary key (work_package_id, lead_name)
);
create table work_package_focal_points (
    work_package_id integer not null references work_packages on delete cascade,
    user_email text not null references approved_users on delete cascade,
    primary key (work_package_id, user_email)
);
create table action_leads (
    action_id integer not null,
    action_sub_id text,
    lead_name text not null references leads on delete restrict,
    unique (action_id, action_sub_id, lead_name),
    foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_focal_points (
    action_id integer not null,
    action_sub_id text,
    user_email text not null references approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_member_persons (
    action_id integer not null,
    action_sub_id text,
    user_email text not null references approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_support_persons (
    action_id integer not null,
    action_sub_id text,
    user_email text not null references approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_member_entities (
    action_id integer not null,
    action_sub_id text,
    entity_id text not null references systemchart.entities on delete restrict,
    unique (action_id, action_sub_id, entity_id),
    foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_notes (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    user_id uuid references users on delete cascade,
    content text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table action_questions (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    user_id uuid not null references users on delete cascade,
    question text not null,
    answer text,
    answered_by uuid references users on delete
    set null,
        answered_at timestamp with time zone,
        created_at timestamp with time zone default now() not null,
        updated_at timestamp with time zone,
        content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
        content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
-- Shared tags pool - single source of truth for all tags across the system
-- Tags created here can be applied to notes, questions, legal comments, etc.
-- This prevents tag duplication and ensures consistency across content types
create table tags (
    id uuid default gen_random_uuid() not null primary key,
    name text not null unique,
    created_at timestamp with time zone default now() not null
);

-- Tag relationships - all junction tables reference the same tags pool above
create table note_tags (
    note_id uuid not null references action_notes on delete cascade,
    tag_id uuid not null references tags on delete cascade,
    primary key (note_id, tag_id)
);
create index idx_note_tags_note_id on note_tags (note_id);
create index idx_note_tags_tag_id on note_tags (tag_id);

create table question_tags (
    question_id uuid not null references action_questions on delete cascade,
    tag_id uuid not null references tags on delete cascade,
    primary key (question_id, tag_id)
);
create index idx_question_tags_question_id on question_tags (question_id);
create index idx_question_tags_tag_id on question_tags (tag_id);
create table action_legal_comments (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    user_id uuid references users on delete cascade,
    content text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create index idx_action_legal_comments_action on action_legal_comments (action_id, action_sub_id);

-- Legal comment tags - references the same shared tags pool
create table legal_comment_tags (
    legal_comment_id uuid not null references action_legal_comments on delete cascade,
    tag_id uuid not null references tags on delete cascade,
    primary key (legal_comment_id, tag_id)
);
create index idx_legal_comment_tags_comment_id on legal_comment_tags (legal_comment_id);
create index idx_legal_comment_tags_tag_id on legal_comment_tags (tag_id);
create table action_updates (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text,
    user_id uuid references users on delete cascade,
    content text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references actions (id, sub_id) on delete cascade
);
create table milestone_updates (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references action_milestones on delete cascade,
    user_id uuid references users on delete
    set null,
        content text not null,
        reply_to uuid references milestone_updates on delete cascade,
        is_resolved boolean default false not null,
        created_at timestamp with time zone default now() not null,
        updated_at timestamp with time zone,
        content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
        content_reviewed_by uuid references users on delete
    set null,
        content_reviewed_at timestamp with time zone
);
create index idx_milestone_updates_milestone_id on milestone_updates (milestone_id);
create index idx_milestone_updates_created_at on milestone_updates (created_at desc);
create index idx_milestone_updates_reply_to on milestone_updates (reply_to)
where (reply_to IS NOT NULL);
create table milestone_attachments (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references action_milestones on delete cascade,
    file_name text not null,
    file_path text not null,
    content_type text,
    file_size integer,
    uploaded_by uuid references users on delete
    set null,
        uploaded_at timestamp with time zone default now() not null
);
create index idx_milestone_attachments_milestone_id on milestone_attachments (milestone_id);