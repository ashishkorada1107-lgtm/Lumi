'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Ensure profile exists for this user
  if (authData.user) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', authData.user.id).maybeSingle();
    if (!profile) {
      const displayName = authData.user.user_metadata?.display_name || 'User';
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        display_name: displayName,
      });
      if (profileError) console.error("Failed to create profile during login:", profileError);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get('name') as string || '').trim();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name) {
    redirect('/login?error=Name is required');
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name,
      }
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (authData.user && authData.session) {
    // Email confirmation is disabled, user is immediately logged in
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      display_name: name,
    });
    if (profileError) {
      console.error("Failed to create profile during signup:", profileError);
    }
  }

  if (authData.user && !authData.session) {
    // Email confirmation is enabled, user will log in later
    redirect('/login?message=Check your email to confirm your sign up');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

