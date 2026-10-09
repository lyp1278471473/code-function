import { useEffect, useState } from "react";
import { api } from "../api/auth";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.getCart().then((c) => { setItems(c.items); setTotal(c.total); });
  }, []);

  async function checkout() {
    const order = await api.createOrder({ items });
    location.href = `/orders/${order.id}`;
  }

  return (
    <div className="cart">
      {items.map((it) => <div key={it.id}>{it.name} × {it.qty}</div>)}
      <p>合计 ¥{total}</p>
      <button onClick={checkout}>结算</button>
    </div>
  );
}
