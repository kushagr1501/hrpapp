import { authService } from './src/modules/auth/auth.service.js';

async function main() {
  const patientId = 'bc7c8bf4-66a9-4083-839b-95d4db9bbb29';
  const user = await authService.getCurrentUser(patientId);
  console.log("Returned from getCurrentUser:", user);
  console.log("JSON stringify:", JSON.stringify(user));
}

main().catch(console.error).finally(() => process.exit(0));
