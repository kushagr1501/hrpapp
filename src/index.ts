import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initializeCronJobs } from "./jobs/cron.js";

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`HRP server listening on port ${env.PORT} (0.0.0.0)`);
  initializeCronJobs();
});
