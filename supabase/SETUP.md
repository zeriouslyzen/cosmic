# Supabase Setup Guide

## 1. Configure Environment Variables

Create a file named `.env` in the root of your project (or edit it if it exists) and add your keys:

```bash
VITE_SUPABASE_URL=https://idbanwonrtgucfhyrlnv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Aaq3aGCqyk1VFes6tR0WVQ_pAZFjEtK
```

*(Note: Never commit `.env` to Git!)*

## 2. Setup Database Schema

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/idbanwonrtgucfhyrlnv).
2. Click on the **SQL Editor** (icon on the left).
3. Click **New Query**.
4. Open the file `supabase/schema.sql` from this project, copy all the contents, and paste them into the query editor.
5. Click **Run**.

This will create the necessary tables:
- `owner_settings`: Stores your About/Live panel content.
- `products`: Stores your inventory.
- `orders`: Stores purchase history.

## 3. Setup Storage

1. Go to **Storage** in your Supabase Dashboard.
2. Click **New Bucket**.
3. Name it `panel-images`.
4. Make it **Public**.
5. Save.

## 4. Restart Server

After creating the `.env` file, restart your dev server:
```bash
npm run dev
```

You are now connected to the real Supabase backend! 🚀
