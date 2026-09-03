-- Run this SQL in your Supabase SQL Editor to enable Push Notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL UNIQUE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Note: Since Lumi currently uses anonymous access, we use `device_id` as a unique identifier.
-- If you implement Authentication later, you should add a `user_id` column and relate it to `auth.users`.

