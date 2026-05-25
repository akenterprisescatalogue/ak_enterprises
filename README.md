# AK Enterprises Catalog

Mobile-first Next.js catalog dashboard for AK Enterprises with Supabase authentication, product listing management, media uploads, and role based access control.

## Features

- Public catalog view with MRP pricing visible to everyone.
- Salesman role can view MRP and offered prices.
- Admin role can create, edit, and delete listings, categories, brands, subcategories, second subcategories, and salesman accounts.
- Product hierarchy: main category -> brand -> subcategory -> second subcategory -> product.
- Supabase Storage uploads for product images and videos.
- Responsive white and blue dashboard UI.

## Tech Stack

- Next.js 14
- React 18
- Supabase Auth, Database, and Storage
- TypeScript
- Lucide React icons

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Fill `.env` with your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Keep `.env` private. It is intentionally ignored by Git.

4. Run the database schema in Supabase SQL Editor:

```text
supabase/schema.sql
```

For an existing database that already has the first schema, run this migration too:

```text
supabase/migrations/2026-05-25-second-subcategories-and-storage.sql
```

5. Create an admin user:

- Create the user in Supabase Dashboard -> Authentication -> Users.
- Update `supabase/admin.sql` with that user's email and name.
- Run `supabase/admin.sql` in Supabase SQL Editor.

6. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Run

```bash
npm start
```

The `prestart` script runs `next build` automatically before `next start`.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Optional smoke tests:

```bash
node scripts/smoke-listing.mjs http://localhost:3000
node scripts/smoke-upload.mjs http://localhost:3000 admin@example.com "admin-password"
node scripts/inspect-bucket.mjs ensure
```

## GitHub Notes

Do not commit:

- `.env`
- `.next`
- `node_modules`
- Supabase service role keys
- Admin passwords

Commit:

- `.env.example`
- `package-lock.json`
- `supabase/schema.sql`
- `supabase/migrations/*`
