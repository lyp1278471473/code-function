import cron from "node-cron";
import { db } from "../../db";

// 每小时清理超时未支付订单
cron.schedule("0 * * * *", async () => {
  const stale = await db.orders.findStalePending(60);
  for (const order of stale) {
    await db.orders.update(order.id, { status: "cancelled" });
  }
});
