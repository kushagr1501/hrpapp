fetch('http://localhost:4000/api/patients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: "Test User 2",
    age: 25,
    phone: "9876543210",
    lmp: "2026-05-01",
    gravida: 1,
    para: 0
  })
}).then(res => res.json()).then(console.log).catch(console.error);
