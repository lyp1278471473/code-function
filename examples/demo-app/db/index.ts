export const db = {
  users: { findByEmail: async (email: string) => ({ id: "u1", email, passwordHash: "..." }) },
  products: { findById: async (id: string) => ({ id, price: 100 }) },
  orders: {
    insert: async (row: unknown) => ({ id: "o1", ...(row as object) }),
    findByUser: async (_userId: string) => [] as unknown[],
    findStalePending: async (_mins: number) => [] as unknown[],
    update: async (_id: string, _patch: unknown) => undefined,
  },
};
