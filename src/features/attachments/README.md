# Action Attachments System

This feature provides file attachment capabilities for actions using Azure Blob Storage.

## Overview

Attachments are stored in Azure Blob Storage and tracked in the database. Each attachment:
- **Required**: Links to an action (via `action_id` and `action_sub_id`)
- **Optional**: Links to a specific milestone (via `milestone_id`)
- If `milestone_id` is NULL, the attachment is considered "general" to the action

All attachments for an action are displayed together in the Milestones tab, regardless of whether they're linked to a specific milestone or not.

## Database Schema

Table: `un80actions.action_attachments`

```sql
CREATE TABLE action_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id int NOT NULL,
    action_sub_id text,
    milestone_id uuid REFERENCES action_milestones(id) ON DELETE SET NULL,
    filename text NOT NULL,
    original_filename text NOT NULL,
    blob_name text NOT NULL UNIQUE,  -- unique Azure blob storage reference
    content_type text NOT NULL,
    file_size bigint NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
    FOREIGN KEY (action_id, action_sub_id) REFERENCES actions(id, sub_id) ON DELETE CASCADE
);
```

## Architecture

### 1. Blob Storage Service (`lib/blob-storage.ts`)

Unified interface for all blob storage operations:

- `generateBlobName(originalFilename)` - Creates unique blob names
- `uploadBlob(blobName, content, contentType)` - Uploads files
- `deleteBlob(blobName)` - Deletes files
- `generateDownloadUrl(blobName, expiryMinutes)` - Creates time-limited SAS URLs
- `blobExists(blobName)` - Checks file existence
- `getBlobProperties(blobName)` - Gets file metadata

**Reusable**: This service can be used anywhere in the app that needs blob storage.

### 2. Attachment Queries (`features/attachments/queries.ts`)

Read operations:
- `getActionAttachments(actionId, actionSubId)` - Get all attachments for an action
- `getActionAttachmentCount(actionId, actionSubId)` - Count attachments
- `getAttachmentById(attachmentId)` - Get specific attachment

### 3. Attachment Commands (`features/attachments/commands.ts`)

Write operations:
- `uploadActionAttachment(actionId, actionSubId, milestoneId, formData)` - Upload file
- `deleteActionAttachment(attachmentId)` - Delete file (uploader or admin only)
- `getAttachmentDownloadUrl(attachmentId)` - Generate temporary download URL

### 4. API Routes

- `POST /api/attachments/upload` - Upload endpoint
- `GET /api/attachments/[id]/download` - Download redirect (generates SAS URL)
- `DELETE /api/attachments/[id]` - Delete endpoint

## Configuration

Add to `.env`:

```env
AZURE_STORAGE_ACCOUNT_NAME=your-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

## Usage in UI

In the MilestonesTab component:

```tsx
import { getActionAttachments } from "@/features/attachments/queries";

// Load attachments
const attachments = await getActionAttachments(action.id, action.sub_id);

// Upload form
<form onSubmit={handleUpload}>
  <select name="milestone_id">
    <option value="">General (all milestones)</option>
    {milestones.map(m => <option value={m.id}>{m.name}</option>)}
  </select>
  <input type="file" name="file" />
  <button type="submit">Upload</button>
</form>
```

## File Constraints

- **Max size**: 50 MB
- **Allowed types**: `.pdf`, `.doc`, `.docx`, images, `.txt`, `.csv`

## Security

- **Authentication**: Required for all operations
- **Download URLs**: Time-limited (60 minutes) SAS tokens
- **Deletion**: Only by uploader or admin
- **Upload**: Any authenticated user

## Display

Attachments appear in a unified section below all milestones, showing:
- Original filename
- File size
- Download link (generates temporary URL)
- Associated milestone badge (or "General" if no milestone)
- Delete button (if authorized)

## Extension

To use the blob storage service elsewhere in the app:

```typescript
import { uploadBlob, generateDownloadUrl } from "@/lib/blob-storage";

// Upload a file
const blobName = generateBlobName("myfile.pdf");
await uploadBlob(blobName, fileBuffer, "application/pdf");

// Generate download URL
const url = await generateDownloadUrl(blobName, 60);
```
