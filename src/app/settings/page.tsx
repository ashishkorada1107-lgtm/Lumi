import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();

  const getEnv = (k: string) => process.env[k];
  const vapidPublicKey = getEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || '';
  return <SettingsClient userEmail={user.email || ''} initialName={profile?.display_name || ''} vapidPublicKey={vapidPublicKey} />;
}

