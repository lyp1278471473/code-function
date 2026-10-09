import { Router } from "express";
import { verifyPassword, issueToken } from "../services/auth";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await verifyPassword(email, password);
  if (!user) return res.status(401).json({ message: "邮箱或密码错误" });
  const token = issueToken(user);
  return res.json({ token, user: { id: user.id, email: user.email } });
});
