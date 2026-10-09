import { db } from "../../db";
import { reserveStock } from "./inventory";

export async function createOrder(userId: string, items: { id: string; qty: number }[]) {
  await reserveStock(items);
  const total = await priceItems(items);
  const order = await db.orders.insert({ userId, items, total, status: "pending" });
  return order;
}

export async function listOrders(userId: string) {
  return db.orders.findByUser(userId);
}

async function priceItems(items: { id: string; qty: number }[]) {
  let total = 0;
  for (const it of items) {
    const product = await db.products.findById(it.id);
    total += product.price * it.qty;
  }
  return total;
}
