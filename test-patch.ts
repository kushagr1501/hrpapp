async function test() {
  const res = await fetch("http://localhost:4000/api/alerts/0cb74197-9006-4888-936a-6f0a5703163a/acknowledge", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    }
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
test();
