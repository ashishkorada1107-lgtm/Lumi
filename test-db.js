const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uikyetwyuephflpylnod.supabase.co',
  'sb_publishable_7f-jB-QuM_-ESwfTyYGObg_STvuBTWE'
);

async function check() {
  const { data: classes, error: cErr } = await supabase.from('classes').select('*').limit(1);
  console.log('classes error:', cErr);
  const { data: tasks, error: tErr } = await supabase.from('tasks').select('*').limit(1);
  console.log('tasks error:', tErr);
  const { data: activities, error: aErr } = await supabase.from('activities').select('*').limit(1);
  console.log('activities error:', aErr);
}

check();

