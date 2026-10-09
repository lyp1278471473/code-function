const BASE = "/api";

async function req(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}

export const api = {
  login: (body: { email: string; password: string }) =>
    req("/login", { method: "POST", body: JSON.stringify(body) }),
  getCart: () => req("/cart"),
  createOrder: (body: unknown) =>
    req("/orders", { method: "POST", body: JSON.stringify(body) }),
};
