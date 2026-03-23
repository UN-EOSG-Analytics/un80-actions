# UN80 Actions Dashboard — Security & Access Control

_Last updated: March 2026_

---

## Overview

The UN80 Actions Dashboard uses a layered security model to protect data and enforce role-based access. There are no passwords — users authenticate via magic-link email. Access to actions and milestones is scoped per user based on their organizational assignments.

This document describes how authentication, authorization, and data protection work.

---

## 1. Authentication

Users sign in with their UN email address. The system sends a one-time login link (magic link) that expires after 15 minutes. No passwords are stored or transmitted.

**How it works:**

1. User enters their email on the login page
2. The system verifies the email is in the pre-approved user list (managed by admins)
3. A unique, cryptographically random token is generated and emailed to the user
4. User clicks the link, which verifies the token (single-use, time-limited)
5. A signed session cookie is created, valid for 30 days

**Security properties:**

- Tokens are 32-byte random hex strings (256-bit entropy)
- Each token can only be used once (enforced at the database level)
- Tokens expire after 15 minutes
- Rate-limited: one token per email per 2 minutes
- Session cookies are HMAC-SHA256 signed, HttpOnly, and Secure
- Session integrity is verified on every request using constant-time comparison

---

## 2. User Management

Access to the platform requires pre-approval. Two separate tables manage users:

| Table              | Purpose                                                 | Managed by |
| ------------------ | ------------------------------------------------------- | ---------- |
| **Approved Users** | Pre-approval registry — email, role, entity, status     | Admins     |
| **Users**          | Login accounts — created automatically on first sign-in | System     |

A user cannot log in unless their email exists in the Approved Users table. Roles are resolved fresh from the database on every request — they are never cached in the session cookie, so role changes take effect immediately.

---

## 3. Roles

Every user has one role, assigned in the Approved Users table:

| Role            | Access Level                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**       | Full access — can read and write everything, manage users, approve/reject milestones, access internal notes and legal comments |
| **Legal**       | Same as Admin — intended for Office of Legal Affairs staff                                                                     |
| **Principal**   | Access determined by organizational assignment (see Section 4)                                                                 |
| **Focal Point** | Access determined by organizational assignment                                                                                 |
| **Support**     | Access determined by organizational assignment                                                                                 |
| **Assistant**   | Access determined by organizational assignment                                                                                 |

For non-admin roles, the role name itself does not determine what a user can see or edit. That is determined by how they are assigned to work packages and actions.

---

## 4. Assignment-Based Access

Non-admin users see only the actions they are assigned to. There are six assignment paths, ranked by privilege level:

| Rank  | Assignment               | Can see actions                           | Can edit         |
| ----- | ------------------------ | ----------------------------------------- | ---------------- |
| **0** | Admin / Legal            | All actions                               | Yes — everything |
| **1** | Work Package Lead        | All actions in their work package(s)      | Yes              |
| **2** | Work Package Focal Point | All actions in their work package(s)      | Yes              |
| **3** | Action Lead              | Specific actions they lead                | Yes              |
| **4** | Action Focal Point       | Specific actions they are focal point for | Yes              |
| **5** | Action Member            | Specific actions they are a member of     | View only        |
| **6** | Action Support Person    | Specific actions they support             | View only        |

**How lead assignments work:** Users are linked to named leads (e.g., "USG OCHA") via an intermediary table. Those leads are then linked to work packages or actions. This means when a lead is assigned to a new work package, all users linked to that lead automatically gain access.

A single user can have multiple assignments through different paths simultaneously — for example, being a work package focal point for one WP and an action lead for a separate action. Their effective access is the union of all their assignments.

---

## 5. What Each Rank Can Do

| Capability                 | Admin/Legal | Ranks 1–4              | Ranks 5–6 |
| -------------------------- | ----------- | ---------------------- | --------- |
| View assigned actions      | All         | Yes                    | Yes       |
| View milestones            | All         | Yes                    | Yes       |
| Create milestones          | Yes         | Yes                    | No        |
| Edit milestones            | Yes         | Yes (with public lock) | No        |
| Delete milestones          | Yes         | No                     | No        |
| Submit milestones          | Yes         | Yes                    | No        |
| Approve/reject milestones  | Yes         | No                     | No        |
| Change milestone status    | Yes         | No                     | No        |
| View/create internal notes | Yes         | No                     | No        |
| View/create questions      | Yes         | No                     | No        |
| View/create legal comments | Yes         | No                     | No        |
| Manage users               | Yes         | No                     | No        |

---

## 6. Public Milestone Locking

Milestones can be either internal (working documents) or public (externally visible). Public milestones follow a submission and review workflow:

**Draft** → **Submitted** → **Under Review** → **Approved** or **Rejected**

**The locking rule:** Once a public milestone is submitted, only admins can edit it. Non-admin users (ranks 1–4) can only edit public milestones that are in **Draft** or **Rejected** status. This ensures that submitted public milestones go through proper review before any changes are made.

Internal milestones have no such restriction — ranks 1–4 can edit them freely.

---

## 7. Three Layers of Protection

The system enforces access control at three independent layers. All three must be defeated simultaneously for unauthorized access to occur.

### Layer 1 — User Interface

Edit buttons, forms, and submission controls are only shown to users who have the appropriate access level. Users without write access see a read-only view.

### Layer 2 — Server Actions

Every write operation (create, update, delete) checks the user's identity and permissions before executing. These checks run on the server and cannot be bypassed from the browser. The user's role is fetched fresh from the database on every request.

### Layer 3 — Database Row-Level Security (RLS)

PostgreSQL Row-Level Security policies are active on all 13 core data tables. The database itself enforces which rows each user can read and write, based on the same assignment rules described in Section 4.

This means:

- If someone bypasses the UI (e.g., using developer tools), the server rejects the request
- If the server has a bug, the database rejects the query
- If no user identity is provided, the database returns zero rows (fail-closed)

The public milestone lock (Section 6) is also enforced at the database level — the database will reject any attempt by a non-admin to update a public milestone that is not in Draft or Rejected status, regardless of how the request was made.

### Protected Tables (RLS Active)

| Table                 | Description                        |
| --------------------- | ---------------------------------- |
| Actions               | Core action records                |
| Action Milestones     | Milestone tracking                 |
| Action Notes          | Internal notes (admin-only)        |
| Action Questions      | Questions (admin-only)             |
| Action Updates        | Status updates                     |
| Action Attachments    | File attachments                   |
| Action Legal Comments | Legal review comments (admin-only) |
| Activity Entries      | Audit log entries                  |
| Activity Read         | Read receipts                      |
| Milestone Versions    | Milestone edit history             |
| Milestone Updates     | Milestone status changes           |
| Milestone Attachments | Milestone file attachments         |
| Attachment Comments   | Comments on attachments            |

---

## 8. Additional Security Measures

- **No passwords** — Magic-link authentication eliminates password-related attack vectors (credential stuffing, phishing, password reuse)
- **Pre-approved users only** — The system is not open for self-registration; admins must add users before they can access the platform
- **Immediate role enforcement** — Role and access changes take effect on the next request with no delay
- **Signed sessions** — Session cookies are cryptographically signed; tampering is detected and rejected
- **Encrypted transport** — All traffic is served over HTTPS
- **Azure-hosted database** — PostgreSQL on Azure with connection via PgBouncer; no direct database exposure

---

## 9. Deployment

- Hosted on **Vercel** (frontend) and **Azure** (database)
- Production deploys automatically from the `app` branch via Vercel
- Database migrations are applied manually with review
