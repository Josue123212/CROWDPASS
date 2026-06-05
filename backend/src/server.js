const app = require("./app");
const env = require("./config/env");
const reservationService = require("./services/reservation.service");
const db = require("./config/db");

app.listen(env.port, () => {
  console.log(`CROWDPASS backend ejecutandose en el puerto ${env.port}`);

  if (env.nodeEnv !== "test") {
    db.warmup({ connections: env.dbPoolMax }).catch(() => {});
  }
});

let refundWorkerRunning = false;
if (env.nodeEnv !== "test") {
  setInterval(async () => {
    if (refundWorkerRunning) {
      return;
    }

    refundWorkerRunning = true;
    try {
      await reservationService.processEventCancellationRefundsBatch({ limit: 8 });
    } catch {
    } finally {
      refundWorkerRunning = false;
    }
  }, 2500);
}
