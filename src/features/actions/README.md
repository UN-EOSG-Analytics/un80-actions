ActionModal as Orchestrator

Each Tab is Self-Contained

Each tab owns its data - queries/commands in their feature

src/features/
├── actions/
│ ├── queries.ts # All action queries including table data
│ ├── ui/
│ │ ├── ActionsTable.tsx
│ │ ├── ActionModal.tsx
│ │ └── ModalHandler.tsx (moved from components/)
│ └── README.md
│
├── milestones/
│ ├── queries.ts # Read operations
│ ├── commands.ts # Write operations
│ └── ui/
│
├── notes/
│ ├── queries.ts
│ ├── commands.ts
│ └── ui/
│
├── questions/
│ ├── queries.ts
│ ├── commands.ts
│ └── ui/
│
└── updates/
├── queries.ts
├── commands.ts
└── ui/
