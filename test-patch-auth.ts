import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  // Login as nurse
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "nurse1@hospital.com",
    password: "Password123"
  });

  if (error || !data.session) {
    console.log("Login failed", error);
    return;
  }

  const token = data.session.access_token;
  console.log("Got token");

  const res = await fetch("http://localhost:4000/api/alerts/0cb74197-9006-4888-936a-6f0a5703163a/acknowledge", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
