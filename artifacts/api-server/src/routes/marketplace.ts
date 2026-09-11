import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddCartItemBody,
  CreateCheckoutBody,
  GetProductParams,
  GetProductResponse,
  GetCatalogSummaryResponse,
  GetCartResponse,
  GetOrderParams,
  GetOrderResponse,
  GetAdminDashboardResponse,
  GetVendorDashboardResponse,
  ListCategoriesResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListOrdersResponse,
  RemoveCartItemParams,
  SubmitVendorApplicationBody,
  SubmitVendorApplicationResponse,
  UpdateCartItemBody,
  UpdateCartItemParams,
  type Cart as CartData,
  type CartItem,
  type Order as OrderData,
  type Product as ProductData,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Product = ProductData;
type Cart = CartData;
type Order = OrderData;

const products: Product[] = [
  {
    id: "p-001",
    title: "Handwoven Lupita Basket",
    slug: "handwoven-lupita-basket",
    description:
      "A generous, handwoven basket made by makers in Western Zambia. Built for blankets, toys, or a beautiful everyday catch-all.",
    category: "Home & Living",
    vendorName: "Mosi Home",
    vendorRating: 4.9,
    price: 285,
    compareAtPrice: 340,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=85",
    badge: "Local maker",
    fulfillment: "local",
    variants: [
      { id: "v-001", name: "Natural / Large", price: 285, compareAtPrice: 340, sku: "MOSI-LUP-L", stockQty: 14 },
      { id: "v-002", name: "Natural / Medium", price: 220, compareAtPrice: null, sku: "MOSI-LUP-M", stockQty: 9 },
    ],
  },
  {
    id: "p-002",
    title: "Everyday Linen Set",
    slug: "everyday-linen-set",
    description:
      "Soft, breathable linen bedding in a relaxed neutral palette, sourced with care and delivered to your door in Lusaka.",
    category: "Home & Living",
    vendorName: "Noma Living",
    vendorRating: 4.7,
    price: 690,
    compareAtPrice: 820,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
    badge: "Most loved",
    fulfillment: "sourced",
    variants: [
      { id: "v-003", name: "Queen / Sand", price: 690, compareAtPrice: 820, sku: "NOMA-LIN-QS", stockQty: 20 },
      { id: "v-004", name: "King / Sand", price: 790, compareAtPrice: 930, sku: "NOMA-LIN-KS", stockQty: 8 },
    ],
  },
  {
    id: "p-003",
    title: "Sable Leather Crossbody",
    slug: "sable-leather-crossbody",
    description:
      "A compact vegetable-tanned leather bag designed for the essentials, with an adjustable strap and a warm, polished finish.",
    category: "Fashion",
    vendorName: "Sable Studio",
    vendorRating: 4.8,
    price: 480,
    compareAtPrice: null,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85",
    badge: "Small batch",
    fulfillment: "local",
    variants: [
      { id: "v-005", name: "Sable", price: 480, compareAtPrice: null, sku: "SABLE-CB-SAB", stockQty: 6 },
    ],
  },
  {
    id: "p-004",
    title: "Pour Over Coffee Kit",
    slug: "pour-over-coffee-kit",
    description:
      "Everything you need for a slower morning: ceramic dripper, glass carafe, and a reusable stainless filter.",
    category: "Kitchen",
    vendorName: "Copper & Clay",
    vendorRating: 4.6,
    price: 350,
    compareAtPrice: 410,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85",
    badge: "New",
    fulfillment: "sourced",
    variants: [
      { id: "v-006", name: "Terracotta", price: 350, compareAtPrice: 410, sku: "CC-PO-TERRA", stockQty: 18 },
    ],
  },
  {
    id: "p-005",
    title: "Citrus & Cedar Candle",
    slug: "citrus-cedar-candle",
    description:
      "Hand-poured soy wax with bright citrus top notes and a grounded cedarwood finish. Made in Lusaka.",
    category: "Wellness",
    vendorName: "Kaya Botanics",
    vendorRating: 4.9,
    price: 165,
    compareAtPrice: null,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85",
    badge: "Local maker",
    fulfillment: "local",
    variants: [
      { id: "v-007", name: "220g", price: 165, compareAtPrice: null, sku: "KAYA-CC-220", stockQty: 24 },
    ],
  },
  {
    id: "p-006",
    title: "Minimal Desk Lamp",
    slug: "minimal-desk-lamp",
    description:
      "A warm, directional lamp for late work sessions and early starts, with a clean silhouette that fits anywhere.",
    category: "Home & Living",
    vendorName: "Noma Living",
    vendorRating: 4.7,
    price: 560,
    compareAtPrice: 680,
    currency: "ZMW",
    imageUrl:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    badge: "Trending",
    fulfillment: "sourced",
    variants: [
      { id: "v-008", name: "Matte black", price: 560, compareAtPrice: 680, sku: "NOMA-DL-BLK", stockQty: 11 },
    ],
  },
];

const categories = [
  { id: "c-001", name: "Home & Living", slug: "home-living", productCount: 18, imageUrl: products[0].imageUrl },
  { id: "c-002", name: "Fashion", slug: "fashion", productCount: 12, imageUrl: products[2].imageUrl },
  { id: "c-003", name: "Kitchen", slug: "kitchen", productCount: 9, imageUrl: products[3].imageUrl },
  { id: "c-004", name: "Wellness", slug: "wellness", productCount: 15, imageUrl: products[4].imageUrl },
];

let cart: Cart = { items: [], subtotal: 0, deliveryFee: 0, total: 0, currency: "ZMW" };
const orders: Order[] = [];
const vendorApplications: Array<{ id: string; businessName: string; status: "pending" | "approved" | "rejected"; submittedAt: string }> = [];

function calculateCart(): Cart {
  const subtotal = cart.items.reduce((sum: number, item: CartItem) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 600 ? 0 : 45;
  cart = { ...cart, subtotal, deliveryFee, total: subtotal + deliveryFee };
  return cart;
}

function productToCartItem(product: Product, variantId: string, quantity: number) {
  const variant = product.variants.find((item: Product["variants"][number]) => item.id === variantId);
  if (!variant) return null;
  return {
    id: randomUUID(),
    productId: product.id,
    title: product.title,
    vendorName: product.vendorName,
    imageUrl: product.imageUrl,
    variantName: variant.name,
    unitPrice: variant.price,
    quantity,
    fulfillment: product.fulfillment,
  } as const;
}

router.get("/catalog/summary", (_req, res) => {
  res.json(GetCatalogSummaryResponse.parse({
    featured: products.slice(0, 4),
    trending: products.slice(2, 6),
    categories,
    lusakaDeliveryMessage: "Delivery across Lusaka from ZMW 45. Free delivery on orders over ZMW 600.",
  }));
});

router.get("/catalog/categories", (_req, res) => {
  res.json(ListCategoriesResponse.parse(categories));
});

router.get("/catalog/products", (req, res) => {
  const params = ListProductsQueryParams.parse(req.query);
  let result = [...products];
  if (params.search) {
    const search = params.search.toLowerCase();
    result = result.filter((product) =>
      [product.title, product.description, product.category, product.vendorName].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }
  if (params.category) result = result.filter((product) => product.category === params.category);
  if (params.sort === "price_asc") result.sort((a, b) => a.price - b.price);
  if (params.sort === "price_desc") result.sort((a, b) => b.price - a.price);
  if (params.sort === "top_rated") result.sort((a, b) => b.vendorRating - a.vendorRating);
  res.json(ListProductsResponse.parse(result.slice(0, params.limit)));
});

router.get("/catalog/products/:productId", (req, res) => {
  const { productId } = GetProductParams.parse(req.params);
  const product = products.find((item) => item.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json(GetProductResponse.parse(product));
});

router.get("/cart", (_req, res) => res.json(GetCartResponse.parse(calculateCart())));

router.post("/cart", (req, res) => {
  const body = AddCartItemBody.parse(req.body);
  const product = products.find((item) => item.id === body.productId);
  if (!product) return res.status(400).json({ error: "Product not found" });
  const newItem = productToCartItem(product, body.variantId, body.quantity);
  if (!newItem) return res.status(400).json({ error: "Variant not found" });
  const existing = cart.items.find((item: CartItem) => item.productId === body.productId && item.variantName === newItem.variantName);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + body.quantity, 20);
  } else {
    cart.items.push(newItem);
  }
  return res.status(201).json(GetCartResponse.parse(calculateCart()));
});

router.patch("/cart/items/:itemId", (req, res) => {
  const { itemId } = UpdateCartItemParams.parse(req.params);
  const body = UpdateCartItemBody.parse(req.body);
  const item = cart.items.find((entry: CartItem) => entry.id === itemId);
  if (!item) return res.status(404).json({ error: "Cart item not found" });
  item.quantity = body.quantity;
  return res.json(GetCartResponse.parse(calculateCart()));
});

router.delete("/cart/items/:itemId", (req, res) => {
  const { itemId } = RemoveCartItemParams.parse(req.params);
  cart = { ...cart, items: cart.items.filter((item: CartItem) => item.id !== itemId) };
  return res.json(GetCartResponse.parse(calculateCart()));
});

router.post("/checkout", (req, res) => {
  const body = CreateCheckoutBody.parse(req.body);
  calculateCart();
  if (!cart.items.length) return res.status(400).json({ error: "Your cart is empty" });
  const orderId = randomUUID();
  const orderNumber = `GUL-${new Date().getFullYear()}-${String(orders.length + 921).padStart(6, "0")}`;
  const order: Order = {
    id: orderId,
    orderNumber,
    status: "PAYMENT_CONFIRMED",
    createdAt: new Date().toISOString(),
    total: cart.total,
    currency: cart.currency,
    deliveryAddress: `${body.fullName}, ${body.address}`,
    items: cart.items.map((item: CartItem) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      vendorName: item.vendorName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
  orders.unshift(order);
  cart = { items: [], subtotal: 0, deliveryFee: 0, total: 0, currency: "ZMW" };
  return res.status(201).json({
    orderId,
    orderNumber,
    paymentStatus: "confirmed",
    nextAction: null,
  });
});

router.get("/orders", (_req, res) => res.json(ListOrdersResponse.parse(orders)));

router.get("/orders/:orderId", (req, res) => {
  const { orderId } = GetOrderParams.parse(req.params);
  const order = orders.find((item) => item.id === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(GetOrderResponse.parse(order));
});

router.post("/vendors/applications", (req, res) => {
  const body = SubmitVendorApplicationBody.parse(req.body);
  const application = {
    id: randomUUID(),
    businessName: body.businessName,
    status: "pending" as const,
    submittedAt: new Date().toISOString(),
  };
  vendorApplications.push(application);
  return res.status(201).json(SubmitVendorApplicationResponse.parse(application));
});

router.get("/vendor/dashboard", (_req, res) => {
  res.json(GetVendorDashboardResponse.parse({
    vendorName: "Mosi Home",
    pendingOrders: 3,
    productsLive: 18,
    revenueThisMonth: 18420,
    rating: 4.9,
    recentOrders: orders.slice(0, 3),
  }));
});

router.get("/admin/dashboard", (_req, res) => {
  res.json(GetAdminDashboardResponse.parse({
    ordersToday: orders.length + 24,
    salesToday: orders.reduce((sum, order) => sum + order.total, 0) + 12840,
    pendingVendorApplications: vendorApplications.length + 5,
    openSupportTickets: 7,
    fulfillmentQueue: [
      { label: "Awaiting fulfillment", count: 8 },
      { label: "Sourcing", count: 4 },
      { label: "Awaiting shipment", count: 3 },
      { label: "Delivery issues", count: 1 },
    ],
  }));
});

export default router;