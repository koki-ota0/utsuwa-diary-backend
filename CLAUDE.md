# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

utsuwa-diary-backend is a React + TypeScript + Vite frontend application for a Japanese tableware and household goods diary. Users can catalog their items (tableware, kitchen tools, home goods), upload photos (max 3 per item), and track usage history. The backend is Supabase (authentication, database, and storage).

## Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Architecture

### Supabase Client
Single shared client instance at `src/lib/supabase.ts`. All API functions receive the Supabase client as a parameter for dependency injection.

### Code Organization
- `src/lib/` - Core utilities and Supabase interaction logic
  - `supabase.ts` - Supabase client initialization
  - `itemPhotoUpload.ts` - Photo upload logic (max 3 per item)
  - `usageLogs.ts` - Usage tracking functions
- `src/api/` - Data access functions (items CRUD)
- `src/types/` - TypeScript type definitions (follows Supabase schema conventions)
- `src/examples/` - Auth flow examples (signUp, signIn, signOut)

### Database Schema (Supabase)
Key tables with RLS (Row Level Security) enabled:
- `profiles` - User metadata, 1:1 with auth.users
- `items` - User-owned tableware/household items
- `item_photos` - Photo metadata (max 3 per item via DB trigger)
- `usage_logs` / `usage_events` - Item usage tracking

All tables enforce owner-only access via `user_id = auth.uid()` policies.

### Storage
- Bucket: `item-photos` (private)
- Path convention: `{user_id}/{item_id}/{1|2|3}.{ext}`
- Max 3 photos per item enforced by slot naming (1, 2, 3)

### Patterns
- API functions validate authentication via `supabase.auth.getUser()` before operations
- TypeScript types follow Supabase's Row/Insert/Update pattern for database tables
- All Supabase operations use typed clients (`SupabaseClient<Database>`)
