import 'dotenv/config';

async function testApi() {
  const res = await fetch('http://localhost:4000/api/patients', {
    headers: {
      'x-dev-auth-key': 'hrp-local-dev-key-2026',
      'x-dev-user-phone': '1111111111' // phone for "n"
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testApi();
