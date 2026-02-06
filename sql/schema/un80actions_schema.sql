CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP SCHEMA IF EXISTS un80actions CASCADE;
CREATE SCHEMA un80actions AUTHORIZATION un80actions_schema_owner;
REVOKE ALL ON SCHEMA un80actions
FROM PUBLIC;
GRANT USAGE ON SCHEMA un80actions TO un80actions_app_user,
    un80actions_readonly_user;
-- =========================================================
-- ENUM TYPES
-- =========================================================
create type un80actions.public_action_status as enum ('Further work ongoing', 'Decision taken');
create type un80actions.action_tracking_status as enum (
    'Finalized',
    'Attention to timeline',
    'No submission',
    'Confirmation needed'
);
create type un80actions.milestone_type as enum ('first', 'second', 'third', 'upcoming', 'final');
create type un80actions.milestone_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected'
);
create type un80actions.risk_assessment as enum ('at_risk', 'medium_risk', 'low_risk');
create type un80actions.user_roles as enum (
    'Principal',
    'Support',
    'Focal Point',
    'Assistant',
    'Admin',
    'Legal'
);
create type un80actions.user_status as enum ('Active', 'Inactive');
create type un80actions.content_review_status as enum ('approved', 'needs_review');

-- =========================================================
-- TABLES
-- =========================================================

create table un80actions.approved_users (
    email text not null primary key,
    full_name text,
    entity text references systemchart.entities (entity) on delete restrict,
    user_status un80actions.user_status,
    user_role un80actions.user_roles,
    created_at timestamp with time zone default now() not null
);
comment on table un80actions.approved_users is 'Pre-approval registry. Users must have an entry here to authenticate. Email links to users table.';
create table un80actions.leads (
    name text not null primary key,
    entity text references systemchart.entities (entity) on delete restrict
);
create table un80actions.approved_user_leads (
    user_email text not null references un80actions.approved_users on delete cascade,
    lead_name text not null references un80actions.leads on delete restrict,
    primary key (user_email, lead_name)
);
create table un80actions.users (
    id uuid default gen_random_uuid() not null primary key,
    email text not null unique references un80actions.approved_users,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    last_login_at timestamp with time zone
);
create table un80actions.magic_tokens (
    token text not null primary key,
    email text not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone
);
create table un80actions.workstreams (
    id text not null primary key,
    workstream_title text,
    report_title text,
    report_document_symbol text
);
create table un80actions.work_packages (
    id integer not null primary key,
    workstream_id text not null references un80actions.workstreams on delete restrict,
    work_package_title text not null,
    work_package_goal text
);
create table un80actions.actions (
    id integer not null,
    sub_id text not null,
    work_package_id integer not null references un80actions.work_packages on delete cascade,
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
    document_submitted boolean default false not null,
    primary key (id, sub_id)
);
create table un80actions.action_milestones (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
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
    content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        submitted_by uuid references un80actions.users on delete cascade,
        submitted_by_entity text references systemchart.entities (entity) on delete
    set null,
        submitted_at timestamp with time zone,
        reviewed_by uuid references un80actions.users on delete cascade,
        reviewed_at timestamp with time zone,
        approved_by uuid references un80actions.users on delete cascade,
        approved_at timestamp with time zone,
        serial_number integer not null,
        needs_ola_review boolean default false not null,
        documents_submitted boolean default false not null,
        reviewed_by_ola boolean default false not null,
        finalized boolean default false not null,
        attention_to_timeline boolean default false not null,
        confirmation_needed boolean default false not null,
        document_submitted boolean default false not null,
        milestone_document_submitted boolean default false not null,
        constraint action_milestones_action_type_key unique (action_id, action_sub_id, milestone_type),
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.milestone_versions (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references un80actions.action_milestones on delete cascade,
    description text,
    deadline date,
    updates text,
    status un80actions.milestone_status not null,
    changed_by uuid references un80actions.users on delete
    set null,
        changed_at timestamp with time zone default now() not null,
        change_type text not null
);
create index idx_milestone_versions_milestone_id on un80actions.milestone_versions (milestone_id);
create index idx_milestone_versions_changed_at on un80actions.milestone_versions (changed_at desc);
create table un80actions.action_attachments (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
    milestone_id uuid references un80actions.action_milestones on delete
    set null,
        title text,
        description text,
        filename text not null,
        original_filename text not null,
        blob_name text not null unique,
        content_type text not null,
        file_size bigint not null,
        uploaded_by uuid references un80actions.users on delete
    set null,
        uploaded_at timestamp with time zone default now() not null,
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create index idx_action_attachments_action on un80actions.action_attachments (action_id, action_sub_id);
create index idx_action_attachments_milestone on un80actions.action_attachments (milestone_id)
where (milestone_id IS NOT NULL);
create table un80actions.work_package_leads (
    work_package_id integer not null references un80actions.work_packages on delete cascade,
    lead_name text not null references un80actions.leads on delete restrict,
    primary key (work_package_id, lead_name)
);
create table un80actions.work_package_focal_points (
    work_package_id integer not null references un80actions.work_packages on delete cascade,
    user_email text not null references un80actions.approved_users on delete cascade,
    primary key (work_package_id, user_email)
);
create table un80actions.action_leads (
    action_id integer not null,
    action_sub_id text not null default '',
    lead_name text not null references un80actions.leads on delete restrict,
    unique (action_id, action_sub_id, lead_name),
    foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_focal_points (
    action_id integer not null,
    action_sub_id text not null default '',
    user_email text not null references un80actions.approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_member_persons (
    action_id integer not null,
    action_sub_id text not null default '',
    user_email text not null references un80actions.approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_support_persons (
    action_id integer not null,
    action_sub_id text not null default '',
    user_email text not null references un80actions.approved_users on delete cascade,
    unique (action_id, action_sub_id, user_email),
    foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_member_entities (
    action_id integer not null,
    action_sub_id text not null default '',
    entity text not null references systemchart.entities (entity) on delete restrict,
    unique (action_id, action_sub_id, entity),
    foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_notes (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
    user_id uuid references un80actions.users on delete cascade,
    header text,
    note_date date,
    content text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.action_questions (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
    user_id uuid not null references un80actions.users on delete cascade,
    header text,
    subtext text,
    question_date date,
    question text not null,
    answer text,
    answered_by uuid references un80actions.users on delete
    set null,
        answered_at timestamp with time zone,
        created_at timestamp with time zone default now() not null,
        updated_at timestamp with time zone,
        content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
        content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        milestone_id uuid references un80actions.action_milestones on delete
    set null,
        comment text,
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.tags (
    id uuid default gen_random_uuid() not null primary key,
    name text not null unique,
    created_at timestamp with time zone default now() not null
);
create table un80actions.note_tags (
    note_id uuid not null references un80actions.action_notes on delete cascade,
    tag_id uuid not null references un80actions.tags on delete cascade,
    primary key (note_id, tag_id)
);
create index idx_note_tags_note_id on un80actions.note_tags (note_id);
create index idx_note_tags_tag_id on un80actions.note_tags (tag_id);
create table un80actions.question_tags (
    question_id uuid not null references un80actions.action_questions on delete cascade,
    tag_id uuid not null references un80actions.tags on delete cascade,
    primary key (question_id, tag_id)
);
create index idx_question_tags_question_id on un80actions.question_tags (question_id);
create index idx_question_tags_tag_id on un80actions.question_tags (tag_id);
create table un80actions.action_legal_comments (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
    user_id uuid references un80actions.users on delete cascade,
    content text not null,
    reply_to uuid references un80actions.action_legal_comments on delete cascade,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create index idx_action_legal_comments_action on un80actions.action_legal_comments (action_id, action_sub_id);
create index idx_action_legal_comments_reply_to on un80actions.action_legal_comments (reply_to)
where (reply_to IS NOT NULL);
create table un80actions.legal_comment_tags (
    legal_comment_id uuid not null references un80actions.action_legal_comments on delete cascade,
    tag_id uuid not null references un80actions.tags on delete cascade,
    primary key (legal_comment_id, tag_id)
);
create index idx_legal_comment_tags_comment_id on un80actions.legal_comment_tags (legal_comment_id);
create index idx_legal_comment_tags_tag_id on un80actions.legal_comment_tags (tag_id);
create table un80actions.action_updates (
    id uuid default gen_random_uuid() not null primary key,
    action_id integer not null,
    action_sub_id text not null default '',
    user_id uuid references un80actions.users on delete cascade,
    content text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone,
    content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
    content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        foreign key (action_id, action_sub_id) references un80actions.actions (id, sub_id) on delete cascade
);
create table un80actions.milestone_updates (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references un80actions.action_milestones on delete cascade,
    user_id uuid references un80actions.users on delete
    set null,
        content text not null,
        reply_to uuid references un80actions.milestone_updates on delete cascade,
        is_resolved boolean default false not null,
        created_at timestamp with time zone default now() not null,
        updated_at timestamp with time zone,
        content_review_status un80actions.content_review_status default 'approved'::un80actions.content_review_status not null,
        content_reviewed_by uuid references un80actions.users on delete
    set null,
        content_reviewed_at timestamp with time zone,
        is_legal boolean default false not null
);
create index idx_milestone_updates_milestone_id on un80actions.milestone_updates (milestone_id);
create index idx_milestone_updates_created_at on un80actions.milestone_updates (created_at desc);
create index idx_milestone_updates_reply_to on un80actions.milestone_updates (reply_to)
where (reply_to IS NOT NULL);
create table un80actions.milestone_attachments (
    id uuid default gen_random_uuid() not null primary key,
    milestone_id uuid not null references un80actions.action_milestones on delete cascade,
    file_name text not null,
    file_path text not null,
    content_type text,
    file_size integer,
    uploaded_by uuid references un80actions.users on delete
    set null,
        uploaded_at timestamp with time zone default now() not null
);
create index idx_milestone_attachments_milestone_id on un80actions.milestone_attachments (milestone_id);
create table un80actions.activity_entries (
    id uuid default gen_random_uuid() not null primary key,
    type text not null,
    action_id integer not null,
    action_sub_id text not null default '',
    milestone_id uuid references un80actions.action_milestones on delete
    set null,
        title text not null,
        description text not null,
        user_id uuid references un80actions.users on delete
    set null,
        created_at timestamp with time zone default now() not null
);
create index idx_activity_entries_created_at on un80actions.activity_entries (created_at desc);
create index idx_activity_entries_action on un80actions.activity_entries (action_id, action_sub_id);
create table un80actions.activity_read (
    activity_id text not null,
    user_id uuid not null references un80actions.users on delete cascade,
    read_at timestamp with time zone default now() not null,
    primary key (activity_id, user_id)
);
create index idx_activity_read_user_id on un80actions.activity_read (user_id);
create table un80actions.attachment_comments (
    id uuid default gen_random_uuid() not null primary key,
    attachment_id uuid not null references un80actions.action_attachments on delete cascade,
    author_id uuid references un80actions.users on delete
    set null,
        body text not null,
        created_at timestamp with time zone default now() not null,
        user_id uuid references un80actions.users on delete
    set null,
        comment text not null,
        is_legal boolean default false not null
);
create index idx_attachment_comments_attachment_id on un80actions.attachment_comments (attachment_id);
create index idx_attachment_comments_created_at on un80actions.attachment_comments (created_at);




-- =========================================================
-- GRANTS
-- =========================================================


GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA un80actions TO un80actions_app_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA un80actions TO un80actions_app_user;

GRANT SELECT ON ALL TABLES IN SCHEMA un80actions TO un80actions_readonly_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA un80actions TO un80actions_readonly_user;
