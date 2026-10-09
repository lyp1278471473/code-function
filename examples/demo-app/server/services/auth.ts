import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db";

export async function verifyPassword(email: string, password: string) {
  const user = await db.users.findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function issueToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}
