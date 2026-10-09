import { Router } from "express";
import { createOrder, listOrders } from "../services/orders";

export const orderRouter = Router();

orderRouter.post("/orders", async (req, res) => {
  const order = await createOrder(req.user!.id, req.body.items);
  res.json(order);
});

orderRouter.get("/orders", async (req, res) => {
  res.json(await listOrders(req.user!.id));
});
