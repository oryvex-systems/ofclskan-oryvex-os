import { NextResponse } from "next/server";

type SupabaseProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  metadata: { badge?: string } | null;
};

type SupabaseBranch = {
  id: string;
  name: string;
  slug: string;
  full_address: string | null;
  district: string | null;
  delivery_fee: number | string;
  prep_minutes_min: number;
  prep_minutes_max: number;
};

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Katalog bağlantısı yapılandırılmadı" }, { status: 503 });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const sellerResponse = await fetch(
    `${url}/rest/v1/sellers?slug=eq.burgermy&select=id&limit=1`,
    { headers },
  );
  if (!sellerResponse.ok) {
    return NextResponse.json({ error: "Marka bulunamadı" }, { status: 502 });
  }

  const sellers = await sellerResponse.json() as Array<{ id: string }>;
  if (!sellers[0]) {
    return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
  }

  const sellerId = encodeURIComponent(sellers[0].id);
  const [productsResponse, branchesResponse] = await Promise.all([
    fetch(
      `${url}/rest/v1/products?seller_id=eq.${sellerId}&is_active=eq.true&select=id,name,description,price,image_url,metadata&order=created_at.asc`,
      { headers },
    ),
    fetch(
      `${url}/rest/v1/branches?seller_id=eq.${sellerId}&is_active=eq.true&select=id,name,slug,full_address,district,delivery_fee,prep_minutes_min,prep_minutes_max&order=created_at.asc`,
      { headers },
    ),
  ]);

  if (!productsResponse.ok || !branchesResponse.ok) {
    return NextResponse.json({ error: "Katalog verisi alınamadı" }, { status: 502 });
  }

  const productRows = await productsResponse.json() as SupabaseProduct[];
  const branchRows = await branchesResponse.json() as SupabaseBranch[];

  const products = productRows.map(product => ({
    id: product.id,
    name: product.name,
    desc: product.description ?? "",
    price: Number(product.price),
    image: (product.image_url || "/products/classic.png").replace(/\.png$/, ".webp"),
    badge: product.metadata?.badge,
  }));

  const branches = branchRows.map(branch => ({
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    address: branch.full_address ?? branch.district ?? "",
    district: branch.district ?? "",
    deliveryFee: Number(branch.delivery_fee),
    prepMin: branch.prep_minutes_min,
    prepMax: branch.prep_minutes_max,
  }));

  return NextResponse.json(
    { products, branches },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
