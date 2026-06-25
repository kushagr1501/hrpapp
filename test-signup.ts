import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function test() {
  const testEmail = `test_${Date.now()}@gmail.com`;
  console.log("Signing up as", testEmail);
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: "password123",
    options: {
      data: {
        full_name: "Test User",
        role: "patient"
      }
    }
  });
  
  if (error) {
    console.error("Signup failed:", error.message);
    return;
  }
  
  console.log("Signed up! Token:", data.session?.access_token?.substring(0, 20) + "...");
  
  if (!data.session?.access_token) {
    console.error("No access token returned. Email confirmation might be required.");
    return;
  }
  
  const res = await fetch("http://localhost:4000/api/auth/me", {
    headers: {
      "Authorization": `Bearer ${data.session.access_token}`
    }
  });
  
  const text = await res.text();
  console.log("Response:", res.status, text);
}

test();
