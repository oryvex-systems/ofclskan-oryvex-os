export type DeliveryType = "Kurye" | "Gel-Al";

export type Product = {
  id: string | number;
  name: string;
  desc: string;
  price: number;
  image: string;
  badge?: string;
};

export type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  deliveryFee: number;
  prepMin: number;
  prepMax: number;
};

export type CartSelection = {
  size: "Normal" | "Büyük";
  drink: string;
  sauces: string[];
  removed: string[];
  extraCheese: boolean;
  extraPatty: boolean;
};

export type CartItem = {
  product: Product;
  qty: number;
  extras: number;
  selection: CartSelection;
};

export const money = (value: number) => `₺${value.toLocaleString("tr-TR")}`;

export function calculateOrder(cart: CartItem[], delivery: DeliveryType) {
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product.price + item.extras) * item.qty,
    0,
  );
  const deliveryFee = delivery === "Kurye" && cart.length ? 29 : 0;
  const discount = subtotal >= 450 ? 50 : 0;
  return { subtotal, deliveryFee, discount, total: subtotal + deliveryFee - discount };
}

export function selectionSummary(item: CartItem) {
  const values = [item.selection.size, item.selection.drink];
  if (item.selection.sauces.length) values.push(item.selection.sauces.join(", "));
  if (item.selection.removed.length) values.push(`${item.selection.removed.join(", ")} çıkarıldı`);
  return values.join(" · ");
}
