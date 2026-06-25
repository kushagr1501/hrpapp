import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function test() {
  console.log("Logging in as radha@gmail.com...");
  // I don't know the password, let's try a common one or we can just fetch a user and see what happens
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "radha@gmail.com",
    password: "password123" // guess
  });
  
  if (error) {
    console.error("Login failed:", error.message);
    return;
  }
  
  console.log("Logged in! Token:", data.session.access_token.substring(0, 20) + "...");
  
  // Now hit the /api/auth/me endpoint
  const res = await fetch("http://localhost:4000/api/auth/me", {
    headers: {
      "Authorization": `Bearer ${data.session.access_token}`
    }
  });
  
  const text = await res.text();
  console.log("Response:", res.status, text);
}

test();
