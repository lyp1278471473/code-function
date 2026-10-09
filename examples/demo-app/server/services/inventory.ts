import { db } from "../../db";

export async function reserveStock(items: { id: string; qty: number }[]) {
  for (const it of items) {
    // 简化：真实实现会做事务扣减
    await db.products.findById(it.id);
  }
}
