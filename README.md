# UN80 Initiative Actions

This Dashboard is an annex to the [UN80 Initiative Action Plan](https://www.un.org/un80-initiative/sites/default/files/2025-11/UN80_Initiative_Action_Plan.pdf). It presents the detailed work packages across the three [UN80 Initiative](https://www.un.org/un80-initiative/en) workstreams in a single reference. This Dashboard also lists designated leads for each work package, along with their individual action items (derived from paragraphs in the [SG's reports on the UN80 Initiative](https://www.un.org/un80-initiative/en)).

[un80actions.un.org](https://un80actions.un.org)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Next.js 16** - App Router
- **Tailwind CSS v4.1** - Styling
- **shadcn/ui** - UI Components
- **TypeScript** - Type safety

## Project Structure

- `/src/app` - Next.js app router pages and layouts
- `/src/components` - React components
- `/src/components/ui` - shadcn/ui components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility functions and data processing
- `/src/types` - TypeScript type definitions
- `/public/data` - Static data files
- `/python` - Data preparation scripts


## Maintenance 

```bash
npm run format

npm run lint
npm run lint -- --fix

npm outdated
npm update

npm audit
```

## Deployment

- GitHub Pages
- Vercel