# DataEntryGen Client

Next.js frontend for the DataEntryGen dynamic data entry system.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - Component library
- **TanStack Query (React Query)** - Data fetching and caching
- **React Hook Form + Zod** - Form handling and validation

## Getting Started

### Prerequisites

- Node.js 20+ installed
- Backend API running (DataEntryGen.Backend)

### Installation

```bash
npm install
```

### Configuration

The `.env.local` file is already configured:

```env
NEXT_PUBLIC_API_URL=https://localhost:5001
```

Update the API URL to match your backend server if needed.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin panel page
│   ├── tables/              # Tables list and detail pages
│   │   └── [tableName]/    # Dynamic table data page
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home page
│   └── not-found.tsx        # 404 page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── MainLayout.tsx       # Page layout with sidebar
│   ├── NavMenu.tsx          # Navigation menu
│   └── providers.tsx        # React Query provider
└── lib/
    ├── api/
    │   ├── client.ts        # API client with fetch wrapper
    │   └── hooks.ts         # React Query hooks
    ├── schemas.ts           # Zod validation schemas
    ├── type-conversion.ts   # Type conversion utilities
    ├── types.ts             # TypeScript type definitions
    └── utils.ts             # Utility functions
```

## Features

### Admin Panel (`/admin`)
- Initialize default registrations
- Discover and register database tables
- Delete registrations
- View all registered tables

### Tables List (`/tables`)
- Browse all registered tables
- Quick access to table data management

### Dynamic Table Data (`/tables/[tableName]`)
- **Dynamic form generation** based on table schema
- **CRUD operations**: Create, Read, Update, Delete
- **Type validation**: Handles integers, decimals, booleans, UUIDs, dates, JSON, etc.
- **Foreign key indicators**
- **Primary key protection** in edit mode
- **Real-time validation** with error messages

## Type Conversion

The application handles various PostgreSQL data types:

- **Integer types** → JavaScript `number` or `bigint`
- **Decimal/Numeric** → JavaScript `number`
- **Boolean** → Supports `true/false`, `1/0`, `yes/no`, `y/n`
- **UUID** → String with validation
- **Timestamp/Date** → ISO 8601 datetime strings
- **JSON/JSONB** → Parsed JavaScript objects
- **Text/Varchar** → String
