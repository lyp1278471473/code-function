import { useState } from "react";
import { api } from "../api/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.login({ email, password });
      location.href = "/";
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="login">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
      {error && <p className="error">{error}</p>}
      <button type="submit">登录</button>
    </form>
  );
}
