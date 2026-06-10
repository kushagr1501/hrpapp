import { supabaseAdmin } from './src/config/supabase.js';

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById('dd9768e9-45db-44c2-a021-3a3070b12635');
  console.log(data?.user?.user_metadata);
}

main().catch(console.error);
