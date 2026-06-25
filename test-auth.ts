import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log("URL:", process.env.SUPABASE_URL);
  console.log("KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Try to get users to see if the service role key works
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users (Service Role Key might be invalid):", error);
  } else {
    console.log("Success! Found", data.users.length, "users.");
    if (data.users.length > 0) {
      console.log("First user:", data.users[0].email);
    }
  }
}

test();
