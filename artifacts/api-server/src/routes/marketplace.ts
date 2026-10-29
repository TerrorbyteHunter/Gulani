import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddCartItemBody,
  CreateCheckoutBody,
  GetDeliveryOptionsQueryParams,
  GetDeliveryOptionsResponse,
  GetProductParams,
  GetProductResponse,
  GetCatalogSummaryResponse,
  GetCartResponse,
  GetOrderParams,
  GetOrderResponse,
  GetAdminDashboardResponse,
  GetAdminSettingsResponse,
  GetFulfillmentOverviewResponse,
  GetSalesOverviewResponse,
  GetVendorDashboardResponse,
  ListPricingRulesResponse,
  ListAdminOrdersQueryParams,
  ListAdminOrdersResponse,
  ListAdminVendorApplicationsQueryParams,
  ListAdminVendorApplicationsResponse,
  ListSupportTicketsQueryParams,
  ListSupportTicketsResponse,
  ListCategoriesResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListOrdersResponse,
  RemoveCartItemParams,
  SubmitVendorApplicationBody,
  SubmitVendorApplicationResponse,
  UpdateCartItemBody,
  UpdateCartItemParams,
  UpdateAdminOrderStatusBody,
  UpdateAdminOrderStatusParams,
  UpdateAdminOrderStatusResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
  UpdateSupportTicketBody,
  UpdateSupportTicketParams,
  UpdateSupportTicketResponse,
  UpdateVendorApplicationStatusBody,
  UpdateVendorApplicationStatusParams,
  UpdateVendorApplicationStatusResponse,
  UpdatePricingRuleBody,
  UpdatePricingRuleParams,
  UpdatePricingRuleResponse,
  type Cart as CartData,
  type CartItem,
  type Order as OrderData,
  type Product as ProductData,
  type DeliveryOption,
  type GetDeliveryOptionsParams,
  type AdminOrder,
  type AdminVendorApplication,
  type AdminVendor,
  type AdminMessage,
  type SupportAccount,
  type MarketplaceSettings,
  type SupportTicket,
  type PricingRule,
  ListAdminVendorsResponse,
  UpdateAdminVendorParams,
  UpdateAdminVendorBody,
  UpdateAdminVendorResponse,
  ListAdminVendorMessagesParams,
  ListAdminVendorMessagesResponse,
  CreateAdminVendorMessageParams,
  CreateAdminVendorMessageBody,
  CreateAdminVendorMessageResponse,
  ListSupportTicketMessagesParams,
  ListSupportTicketMessagesResponse,
  CreateSupportTicketMessageParams,
  CreateSupportTicketMessageBody,
  CreateSupportTicketMessageResponse,
  ListSupportAccountsResponse,
  CreateSupportAccountBody,
  CreateSupportAccountResponse,
  UpdateSupportAccountParams,
  UpdateSupportAccountBody,
  UpdateSupportAccountResponse,
  ListVendorProductsResponse,
  CreateVendorProductBody,
  CreateVendorProductResponse,
  UpdateVendorProductParams,
  UpdateVendorProductBody,
  UpdateVendorProductResponse,
  ArchiveVendorProductParams,
  ArchiveVendorProductResponse,
  BulkUpdateVendorProductsBody,
  BulkUpdateVendorProductsResponse,
  ListVendorOrdersResponse,
  UpdateVendorOrderStatusParams,
  UpdateVendorOrderStatusBody,
  UpdateVendorOrderStatusResponse,
  ListVendorReviewsResponse,
  ReplyToVendorReviewParams,
  ReplyToVendorReviewBody,
  ReplyToVendorReviewResponse,
  ListVendorPromotionsResponse,
  CreateVendorPromotionBody,
  CreateVendorPromotionResponse,
  UpdateVendorPromotionParams,
  UpdateVendorPromotionBody,
  UpdateVendorPromotionResponse,
  GetVendorAnalyticsResponse,
  GetVendorStorefrontResponse,
  UpdateVendorStorefrontBody,
  UpdateVendorStorefrontResponse,
  GetPublicVendorStorefrontParams,
  GetPublicVendorStorefrontResponse,
  GetVendorVerificationResponse,
  UpdateVendorVerificationBody,
  UpdateVendorVerificationResponse,
  GetVendorSettingsResponse,
  UpdateVendorSettingsBody,
  UpdateVendorSettingsResponse,
  ListVendorSupportTicketsResponse,
  CreateVendorSupportTicketBody,
  CreateVendorSupportTicketResponse,
  type VendorProduct,
  type VendorOrder,
  type VendorReview,
  type VendorPromotion,
  type VendorAnalytics,
  type VendorStorefront,
  type VendorVerification,
  type VendorSettings,
  type VendorCustomer,
  type VendorInventoryItem,
  type VendorSupportTicket,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Product = ProductData;
type Cart = CartData;
type Order = OrderData;

const pricingRules: PricingRule[] = [
  {
    id: "rule-default",
    source: "*",
    label: "All imported products",
    markupRate: 35,
    active: true,
    updatedAt: "2026-09-11T08:00:00.000Z",
  },
  {
    id: "rule-taobao",
    source: "taobao",
    label: "Taobao imports",
    markupRate: 42,
    active: true,
    updatedAt: "2026-09-11T08:00:00.000Z",
  },
  {
    id: "rule-local",
    source: "local-vendors",
    label: "Local vendor products",
    markupRate: 12,
    active: true,
    updatedAt: "2026-09-11T08:00:00.000Z",
  },
];

const products: Product[] = [
  {
    id: "p-001",
    vendorId: "vendor-1001",
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
    vendorId: "vendor-1002",
    title: "Everyday Linen Set",
    slug: "everyday-linen-set",
    description:
      "Soft, breathable linen bedding in a relaxed neutral palette, sourced with care and delivered to your door.",
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
    vendorId: "vendor-1004",
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
    vendorId: "vendor-1005",
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
    vendorId: "vendor-1003",
    title: "Citrus & Cedar Candle",
    slug: "citrus-cedar-candle",
    description:
      "Hand-poured soy wax with bright citrus top notes and a grounded cedarwood finish.",
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
    vendorId: "vendor-1002",
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

const getPricingRule = (source: string) =>
  pricingRules.find((rule) => rule.source === source && rule.active) ??
  pricingRules.find((rule) => rule.source === "*" && rule.active);

const repriceCatalog = () => {
  for (const product of products) {
    const source = product.source ?? (product.fulfillment === "sourced" ? "taobao" : "local-vendors");
    const rule = getPricingRule(source);
    const markupRate = rule?.markupRate ?? 0;
    const existingRate = product.markupRate ?? markupRate;
    const basePrice = product.basePrice ?? product.price / (1 + existingRate / 100);
    product.source = source;
    product.basePrice = Math.round(basePrice * 100) / 100;
    product.markupRate = markupRate;
    product.price = Math.round(basePrice * (1 + markupRate / 100) * 100) / 100;
    product.variants = product.variants.map((variant) => {
      const variantBasePrice = variant.basePrice ?? variant.price / (1 + existingRate / 100);
      return {
        ...variant,
        basePrice: Math.round(variantBasePrice * 100) / 100,
        markupRate,
        price: Math.round(variantBasePrice * (1 + markupRate / 100) * 100) / 100,
      };
    });
  }
};

repriceCatalog();

const vendorProducts: VendorProduct[] = [
  {
    id: "vp-001",
    title: "Handwoven Lupita Basket",
    description: "A generous, handwoven basket made by makers in Western Zambia.",
    category: "Home & Living",
    subcategory: "Storage",
    price: 285,
    salePrice: null,
    sku: "MOSI-LUP-L",
    stockQty: 14,
    lowStockThreshold: 5,
    status: "active",
    images: [products[0].imageUrl],
    videoUrl: null,
    variants: [{ id: "vv-001", name: "Natural / Large", sku: "MOSI-LUP-L", price: 285, stockQty: 14 }],
    weight: "1.4 kg",
    dimensions: "52 × 38 × 32 cm",
    shippingInformation: "Ships in 1–2 business days from the local pickup point.",
    views: 1820,
    purchases: 42,
    returns: 1,
  },
  {
    id: "vp-002",
    title: "Lupita Basket · Medium",
    description: "The smaller everyday version of our signature handwoven basket.",
    category: "Home & Living",
    subcategory: "Storage",
    price: 220,
    salePrice: 195,
    sku: "MOSI-LUP-M",
    stockQty: 4,
    lowStockThreshold: 5,
    status: "active",
    images: [products[0].imageUrl],
    videoUrl: null,
    variants: [],
    weight: "0.9 kg",
    dimensions: "40 × 30 × 26 cm",
    shippingInformation: "Ships in 1–2 business days from the local pickup point.",
    views: 940,
    purchases: 17,
    returns: 0,
  },
  {
    id: "vp-003",
    title: "Mosi Seasonal Gift Set",
    description: "A curated gift set assembled for housewarmings and celebrations.",
    category: "Gifts",
    subcategory: "Gift sets",
    price: 620,
    salePrice: null,
    sku: "MOSI-GIFT-01",
    stockQty: 0,
    lowStockThreshold: 3,
    status: "out_of_stock",
    images: [products[0].imageUrl],
    videoUrl: null,
    variants: [],
    weight: "2.2 kg",
    dimensions: "60 × 42 × 35 cm",
    shippingInformation: "Ships when stock is replenished.",
    views: 610,
    purchases: 9,
    returns: 1,
  },
];
const vendorOrders: VendorOrder[] = [
  {
    id: "vo-1001",
    orderNumber: "GUL-10293",
    customerName: "Mwaka Phiri",
    customerEmail: "mwayi@example.com",
    items: [{ title: "Handwoven Lupita Basket", quantity: 2, unitPrice: 285 }],
    total: 615,
    currency: "ZMW",
    deliveryAddress: "Plot 18, Kabulonga, Lusaka",
    paymentStatus: "paid",
    status: "ready_for_dispatch",
    vendorEarnings: 542,
    platformCommission: 73,
    shippingFee: 45,
    orderDate: "2026-09-16T08:34:00.000Z",
    expectedDelivery: "2026-09-18",
    trackingNumber: null,
  },
  {
    id: "vo-1002",
    orderNumber: "GUL-10287",
    customerName: "Chanda Mwale",
    customerEmail: "chanda@example.com",
    items: [{ title: "Lupita Basket · Medium", quantity: 1, unitPrice: 195 }],
    total: 240,
    currency: "ZMW",
    deliveryAddress: "House 42, Roma, Lusaka",
    paymentStatus: "paid",
    status: "processing",
    vendorEarnings: 218,
    platformCommission: 22,
    shippingFee: 45,
    orderDate: "2026-09-15T09:12:00.000Z",
    expectedDelivery: "2026-09-18",
    trackingNumber: null,
  },
  {
    id: "vo-1003",
    orderNumber: "GUL-10244",
    customerName: "Thandiwe Banda",
    customerEmail: "thandiwe@example.com",
    items: [{ title: "Handwoven Lupita Basket", quantity: 1, unitPrice: 285 }],
    total: 330,
    currency: "ZMW",
    deliveryAddress: "14 Independence Avenue, Lusaka",
    paymentStatus: "paid",
    status: "completed",
    vendorEarnings: 296,
    platformCommission: 34,
    shippingFee: 45,
    orderDate: "2026-09-08T10:05:00.000Z",
    expectedDelivery: "2026-09-10",
    trackingNumber: "GUL-RD-9182",
  },
  {
    id: "vo-1004",
    orderNumber: "GUL-10192",
    customerName: "Lombe Zulu",
    customerEmail: "lombe@example.com",
    items: [{ title: "Lupita Basket · Medium", quantity: 1, unitPrice: 220 }],
    total: 265,
    currency: "ZMW",
    deliveryAddress: "Flat 3, Woodlands, Lusaka",
    paymentStatus: "refunded",
    status: "refunded",
    vendorEarnings: 0,
    platformCommission: 0,
    shippingFee: 45,
    orderDate: "2026-09-02T16:45:00.000Z",
    expectedDelivery: "2026-09-05",
    trackingNumber: null,
  },
];
const vendorReviews: VendorReview[] = [
  {
    id: "vr-1001",
    productId: "vp-001",
    productTitle: "Handwoven Lupita Basket",
    customerName: "Mwaka Phiri",
    rating: 5,
    comment: "Beautifully made and even better in person. The size is perfect.",
    reply: null,
    createdAt: "2026-09-15T12:10:00.000Z",
    repliedAt: null,
  },
  {
    id: "vr-1002",
    productId: "vp-002",
    productTitle: "Lupita Basket · Medium",
    customerName: "Chanda Mwale",
    rating: 4,
    comment: "Lovely finish. I would appreciate a little more packaging protection.",
    reply: "Thank you for the thoughtful feedback. We are improving the packaging this week.",
    createdAt: "2026-09-08T10:30:00.000Z",
    repliedAt: "2026-09-09T08:20:00.000Z",
  },
];
const vendorPromotions: VendorPromotion[] = [
  {
    id: "promo-1001",
    name: "Weekend Basket Sale",
    type: "percentage",
    value: 20,
    code: "BASKET20",
    startsAt: "2026-09-17T00:00:00.000Z",
    endsAt: "2026-09-20T23:59:00.000Z",
    status: "active",
    productIds: ["vp-001", "vp-002"],
    maximumDiscount: 200,
  },
];
const vendorAnalytics: VendorAnalytics = {
  sales: [
    { label: "Mon", sales: 920, orders: 3 },
    { label: "Tue", sales: 1460, orders: 5 },
    { label: "Wed", sales: 1180, orders: 4 },
    { label: "Thu", sales: 2090, orders: 7 },
    { label: "Fri", sales: 1730, orders: 6 },
    { label: "Sat", sales: 980, orders: 3 },
    { label: "Sun", sales: 760, orders: 2 },
  ],
  mostViewed: vendorProducts.slice(0, 3),
  mostPurchased: vendorProducts.slice(0, 2),
  newCustomers: 24,
  returningCustomers: 18,
  averageOrderValue: 384,
};
const vendorStorefront: VendorStorefront = {
  vendorId: "vendor-1001",
  businessName: "Mosi Home",
  logoUrl: null,
  bannerUrl: products[0].imageUrl,
  description: "Handwoven home goods made slowly and designed to live with you.",
  contactInformation: "hello@mosihome.zm · +260 97 210 4411",
  businessHours: "Monday–Saturday · 08:00–17:00",
  storePolicies: "Returns accepted within 7 days for unused items.",
  averageRating: 4.9,
  reviewCount: 324,
  orderSatisfaction: 98,
  approvalStatus: "approved",
};
const vendorVerification: VendorVerification = {
  overallStatus: "under_review",
  phoneVerified: true,
  emailVerified: true,
  idSubmitted: true,
  businessDocumentsSubmitted: false,
  rejectionReason: null,
};
const vendorSettings: VendorSettings = {
  businessAddress: "Plot 11, Northmead, Lusaka",
  pickupLocations: "Mosi Home studio · Northmead",
  operatingHours: "Mon–Sat, 08:00–17:00",
  shippingSettings: "Local delivery with Gulani dispatch",
  returnPolicy: "Unused items may be returned within 7 days.",
  refundPolicy: "Refunds are issued after inspection.",
  notificationSettings: "Order alerts, customer messages, weekly earnings summary",
  payoutMethod: "MTN Mobile Money ending 4411",
};
const vendorCustomers: VendorCustomer[] = [
  { id: "customer-1001", name: "Mwaka Phiri", email: "mwayi@example.com", orders: 4, totalSpent: 1280, lastPurchase: "2026-09-16", currentOrders: 1, reviews: 2 },
  { id: "customer-1002", name: "Chanda Mwale", email: "chanda@example.com", orders: 2, totalSpent: 435, lastPurchase: "2026-09-15", currentOrders: 1, reviews: 1 },
  { id: "customer-1003", name: "Thandiwe Banda", email: "thandiwe@example.com", orders: 3, totalSpent: 980, lastPurchase: "2026-09-08", currentOrders: 0, reviews: 1 },
];
const vendorSupportTickets: VendorSupportTicket[] = [
  {
    id: "vendor-ticket-1001",
    subject: "Need help updating pickup location",
    category: "Store settings",
    status: "in_progress",
    lastMessage: "A member of the Gulani team is reviewing your request.",
    updatedAt: "2026-09-16T11:20:00.000Z",
  },
];
const vendorVerificationStatus = () => vendorVerification;
const vendorSettingsStatus = () => vendorSettings;

const categories = [
  { id: "c-001", name: "Home & Living", slug: "home-living", productCount: 18, imageUrl: products[0].imageUrl },
  { id: "c-002", name: "Fashion", slug: "fashion", productCount: 12, imageUrl: products[2].imageUrl },
  { id: "c-003", name: "Kitchen", slug: "kitchen", productCount: 9, imageUrl: products[3].imageUrl },
  { id: "c-004", name: "Wellness", slug: "wellness", productCount: 15, imageUrl: products[4].imageUrl },
];

let cart: Cart = { items: [], subtotal: 0, deliveryFee: 0, total: 0, currency: "ZMW" };
const orders: Order[] = [];
const adminOrders: AdminOrder[] = [
  {
    id: "ord-1001",
    orderNumber: "GUL-2026-000917",
    customerName: "Mwaka Phiri",
    vendorName: "Mosi Home",
    total: 825,
    currency: "ZMW",
    status: "PACKED",
    fulfillment: "local",
    placedAt: "2026-09-11T08:34:00.000Z",
    itemCount: 2,
  },
  {
    id: "ord-1002",
    orderNumber: "GUL-2026-000918",
    customerName: "Chanda Mwale",
    vendorName: "Noma Living",
    total: 690,
    currency: "ZMW",
    status: "SOURCING",
    fulfillment: "sourced",
    placedAt: "2026-09-11T09:12:00.000Z",
    itemCount: 1,
  },
  {
    id: "ord-1003",
    orderNumber: "GUL-2026-000919",
    customerName: "Thandiwe Banda",
    vendorName: "Kaya Botanics",
    total: 330,
    currency: "ZMW",
    status: "OUT_FOR_DELIVERY",
    fulfillment: "local",
    placedAt: "2026-09-11T10:05:00.000Z",
    itemCount: 3,
  },
  {
    id: "ord-1004",
    orderNumber: "GUL-2026-000920",
    customerName: "Lombe Zulu",
    vendorName: "Copper & Clay",
    total: 350,
    currency: "ZMW",
    status: "CUSTOMS_CLEARANCE",
    fulfillment: "sourced",
    placedAt: "2026-09-10T16:45:00.000Z",
    itemCount: 1,
  },
];
const vendorApplications: AdminVendorApplication[] = [
  {
    id: "app-1001",
    businessName: "Chalo Ceramics",
    contactName: "Chipo Chalo",
    email: "hello@chaloceramics.zm",
    phone: "+260 97 441 8821",
    category: "Home & Living",
    description: "Hand-shaped ceramic tableware and planters made by independent makers.",
    status: "pending",
    submittedAt: "2026-09-11T07:48:00.000Z",
  },
  {
    id: "app-1002",
    businessName: "Munda Pantry",
    contactName: "Mwamba Tembo",
    email: "orders@mundapantry.zm",
    phone: "+260 96 130 2290",
    category: "Food & Pantry",
    description: "Small-batch pantry staples, spice blends, and preserves.",
    status: "pending",
    submittedAt: "2026-09-10T14:20:00.000Z",
  },
  {
    id: "app-1003",
    businessName: "Bemba Streetwear",
    contactName: "Tapiwa Mulenga",
    email: "studio@bembastreetwear.zm",
    phone: "+260 95 332 0041",
    category: "Fashion",
    description: "Everyday pieces inspired by contemporary Zambian street culture.",
    status: "approved",
    submittedAt: "2026-09-09T11:05:00.000Z",
  },
];
const adminVendors: AdminVendor[] = [
  {
    id: "vendor-1001",
    businessName: "Mosi Home",
    contactName: "Mwaka Mosi",
    email: "hello@mosihome.zm",
    phone: "+260 97 210 4411",
    category: "Home & Living",
    description: "Handwoven home goods and considered everyday storage.",
    verificationStatus: "approved",
    accountStatus: "active",
    joinedAt: "2026-08-15T09:00:00.000Z",
    productCount: 18,
    orderCount: 42,
    lastActiveAt: "2026-09-11T10:12:00.000Z",
  },
  {
    id: "vendor-1002",
    businessName: "Noma Living",
    contactName: "Noma Banda",
    email: "team@nomaliving.zm",
    phone: "+260 96 700 1890",
    category: "Home & Living",
    description: "Relaxed linen and home essentials for slower mornings.",
    verificationStatus: "approved",
    accountStatus: "active",
    joinedAt: "2026-07-20T09:00:00.000Z",
    productCount: 12,
    orderCount: 31,
    lastActiveAt: "2026-09-10T15:40:00.000Z",
  },
  {
    id: "vendor-1003",
    businessName: "Kaya Botanics",
    contactName: "Kaya Tembo",
    email: "hello@kayabotanics.zm",
    phone: "+260 95 008 3371",
    category: "Wellness",
    description: "Small-batch candles and botanical care goods.",
    verificationStatus: "approved",
    accountStatus: "suspended",
    joinedAt: "2026-06-04T09:00:00.000Z",
    productCount: 8,
    orderCount: 19,
    lastActiveAt: "2026-09-08T11:25:00.000Z",
  },
  {
    id: "vendor-1004",
    businessName: "Sable Studio",
    contactName: "Sable Phiri",
    email: "studio@sablestudio.zm",
    phone: "+260 97 333 4100",
    category: "Fashion",
    description: "Small-batch leather goods made for everyday use.",
    verificationStatus: "approved",
    accountStatus: "active",
    joinedAt: "2026-06-18T09:00:00.000Z",
    productCount: 6,
    orderCount: 14,
    lastActiveAt: "2026-09-09T13:20:00.000Z",
  },
  {
    id: "vendor-1005",
    businessName: "Copper & Clay",
    contactName: "Tandiwe Chileshe",
    email: "hello@copperandclay.zm",
    phone: "+260 96 215 8200",
    category: "Kitchen",
    description: "Thoughtful coffee and kitchen pieces from independent makers.",
    verificationStatus: "approved",
    accountStatus: "active",
    joinedAt: "2026-07-02T09:00:00.000Z",
    productCount: 9,
    orderCount: 21,
    lastActiveAt: "2026-09-10T09:40:00.000Z",
  },
];
const supportTickets: SupportTicket[] = [
  {
    id: "ticket-1001",
    subject: "My order has not moved from sourcing",
    customerName: "Chanda Mwale",
    category: "order",
    priority: "high",
    status: "open",
    assignedTo: null,
    lastMessage: "Could you please confirm when the supplier expects to ship?",
    updatedAt: "2026-09-11T11:20:00.000Z",
  },
  {
    id: "ticket-1002",
    subject: "Mobile Money payment reversed",
    customerName: "Mwaka Phiri",
    category: "payment",
    priority: "urgent",
    status: "in_progress",
    assignedTo: "Finance desk",
    lastMessage: "The amount was deducted but my order still says pending.",
    updatedAt: "2026-09-11T10:47:00.000Z",
  },
  {
    id: "ticket-1003",
    subject: "Can I change my delivery address?",
    customerName: "Thandiwe Banda",
    category: "order",
    priority: "normal",
    status: "open",
    assignedTo: "Customer service",
    lastMessage: "I will be at a different address this afternoon.",
    updatedAt: "2026-09-11T09:16:00.000Z",
  },
  {
    id: "ticket-1004",
    subject: "Product arrived with a damaged box",
    customerName: "Lombe Zulu",
    category: "product",
    priority: "normal",
    status: "resolved",
    assignedTo: "Customer service",
    lastMessage: "Thanks for arranging the replacement.",
    updatedAt: "2026-09-10T15:02:00.000Z",
  },
];
const vendorMessages: Record<string, AdminMessage[]> = {
  "vendor-1001": [
    {
      id: "message-vendor-1001-1",
      senderType: "admin",
      senderName: "Operations desk",
      body: "Your new product photos are approved and ready for review.",
      sentAt: "2026-09-10T08:30:00.000Z",
    },
    {
      id: "message-vendor-1001-2",
      senderType: "vendor",
      senderName: "Mwaka Mosi",
      body: "Thank you. We will refresh the remaining listings this week.",
      sentAt: "2026-09-10T09:04:00.000Z",
    },
  ],
};
const ticketMessages: Record<string, AdminMessage[]> = Object.fromEntries(
  supportTickets.map((ticket) => [
    ticket.id,
    [
      {
        id: `${ticket.id}-initial`,
        senderType: "customer" as const,
        senderName: ticket.customerName,
        body: ticket.lastMessage,
        sentAt: ticket.updatedAt,
      },
    ],
  ]),
) as Record<string, AdminMessage[]>;
const supportAccounts: SupportAccount[] = [
  {
    id: "support-1001",
    name: "Chipo Mwansa",
    email: "chipo@gulani.zm",
    role: "master_admin",
    status: "active",
    createdAt: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "support-1002",
    name: "Finance desk",
    email: "finance@gulani.zm",
    role: "finance",
    status: "active",
    createdAt: "2026-08-02T08:00:00.000Z",
  },
  {
    id: "support-1003",
    name: "Customer service",
    email: "care@gulani.zm",
    role: "support",
    status: "active",
    createdAt: "2026-08-04T08:00:00.000Z",
  },
];
let adminSettings: MarketplaceSettings = {
  storeName: "Gulani Marketplace",
  defaultCurrency: "ZMW",
  deliveryZone: "Global",
  standardDeliveryFee: 45,
  freeDeliveryThreshold: 600,
  vatRate: 16,
  vendorCommissionRate: 12,
  supportEmail: "support@gulani.zm",
  maintenanceMode: false,
};

const deliveryRates: Record<GetDeliveryOptionsParams["deliveryZone"], Partial<Record<DeliveryOption["id"], number>>> = {
  lusaka: {
    shop_pickup: 0,
    shop_delivery: 30,
    yango_delivery: 45,
    platinum_couriers: 100,
  },
  copperbelt: {
    shop_delivery: 75,
    platinum_couriers: 140,
  },
  other_zambia: {
    shop_delivery: 130,
    platinum_couriers: 220,
  },
};

function deliveryOptionsFor(
  deliveryZone: GetDeliveryOptionsParams["deliveryZone"],
  fulfillment: GetDeliveryOptionsParams["fulfillment"] = "local",
): DeliveryOption[] {
  const choices: Omit<DeliveryOption, "fee">[] = [
    {
      id: "shop_pickup",
      name: "Collect from shop",
      description: "Pick up directly from the seller in Lusaka.",
      estimatedDelivery: "Ready when the seller confirms",
    },
    {
      id: "shop_delivery",
      name: "Shop's own delivery",
      description: "Delivery arranged directly by the seller.",
      estimatedDelivery: deliveryZone === "lusaka" ? "Same day" : "1–3 business days",
    },
    {
      id: "yango_delivery",
      name: "Yango Delivery",
      description: "On-demand delivery within Lusaka.",
      estimatedDelivery: "About 1–3 hours",
    },
    {
      id: "platinum_couriers",
      name: "Platinum Couriers",
      description: "Tracked courier delivery to your area.",
      estimatedDelivery: deliveryZone === "lusaka" ? "Same day" : "1–3 business days",
    },
  ];

  return choices.flatMap((choice) => {
    if (choice.id === "shop_pickup" && (deliveryZone !== "lusaka" || fulfillment === "sourced")) {
      return [];
    }
    const fee = deliveryRates[deliveryZone][choice.id];
    return fee === undefined ? [] : [{ ...choice, fee }];
  });
}

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
    vendorId: product.vendorId,
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
    marketplaceMessage: "Discover independent products from local makers and international sourcing partners.",
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

router.get("/delivery-options", (req, res) => {
  const parsed = GetDeliveryOptionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const options = deliveryOptionsFor(parsed.data.deliveryZone, parsed.data.fulfillment);
  res.json(GetDeliveryOptionsResponse.parse(options));
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
  if (!cart.items.length) return res.status(400).json({ error: "Your cart is empty" });
  const deliveryParams = GetDeliveryOptionsQueryParams.safeParse({
    deliveryZone: body.deliveryZone,
    fulfillment: cart.items.some((item) => item.fulfillment === "sourced") ? "sourced" : "local",
  });
  if (!deliveryParams.success) {
    res.status(400).json({ error: "Choose a supported delivery area." });
    return;
  }
  const selectedDelivery = deliveryOptionsFor(
    deliveryParams.data.deliveryZone,
    deliveryParams.data.fulfillment,
  ).find((option) => option.id === body.deliveryMethod);
  if (!selectedDelivery) {
    res.status(400).json({ error: "That delivery method is not available for this order and area." });
    return;
  }
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  cart = {
    ...cart,
    subtotal,
    deliveryFee: selectedDelivery.fee,
    total: subtotal + selectedDelivery.fee,
  };
  const orderId = randomUUID();
  const orderNumber = `GUL-${new Date().getFullYear()}-${String(orders.length + 921).padStart(6, "0")}`;
  const order: Order = {
    id: orderId,
    orderNumber,
    status: "PAYMENT_CONFIRMED",
    createdAt: new Date().toISOString(),
    total: cart.total,
    currency: cart.currency,
    deliveryAddress: `${body.fullName}, ${body.address}, ${body.deliveryZone}`,
    deliveryFee: selectedDelivery.fee,
    deliveryMethod: selectedDelivery.name,
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
  adminOrders.unshift({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: body.fullName,
    vendorName: cart.items[0]?.vendorName ?? "Multiple vendors",
    total: order.total,
    currency: order.currency,
    status: order.status,
    fulfillment: cart.items.some((item) => item.fulfillment === "sourced") ? "sourced" : "local",
    placedAt: order.createdAt,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  });
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
    contactName: body.contactName,
    email: body.email,
    phone: body.phone,
    category: body.category,
    description: body.description,
  };
  vendorApplications.push(application);
  return res.status(201).json(SubmitVendorApplicationResponse.parse(application));
});

router.get("/admin/orders", (req, res) => {
  const params = ListAdminOrdersQueryParams.parse(req.query);
  let result = [...adminOrders];
  if (params.status) result = result.filter((order) => order.status === params.status);
  if (params.search) {
    const search = params.search.toLowerCase();
    result = result.filter((order) =>
      [order.orderNumber, order.customerName, order.vendorName].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }
  return res.json(ListAdminOrdersResponse.parse(result));
});

router.patch("/admin/orders/:orderId/status", (req, res) => {
  const { orderId } = UpdateAdminOrderStatusParams.parse(req.params);
  const { status } = UpdateAdminOrderStatusBody.parse(req.body);
  const order = adminOrders.find((entry) => entry.id === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = status;
  const customerOrder = orders.find((entry) => entry.id === orderId);
  if (customerOrder) customerOrder.status = status;
  return res.json(UpdateAdminOrderStatusResponse.parse(order));
});

router.get("/admin/vendor-applications", (req, res) => {
  const params = ListAdminVendorApplicationsQueryParams.parse(req.query);
  const result = params.status
    ? vendorApplications.filter((application) => application.status === params.status)
    : vendorApplications;
  return res.json(ListAdminVendorApplicationsResponse.parse(result));
});

router.patch("/admin/vendor-applications/:applicationId/status", (req, res) => {
  const { applicationId } = UpdateVendorApplicationStatusParams.parse(req.params);
  const { status } = UpdateVendorApplicationStatusBody.parse(req.body);
  const application = vendorApplications.find((entry) => entry.id === applicationId);
  if (!application) return res.status(404).json({ error: "Vendor application not found" });
  application.status = status;
  if (status === "approved" && !adminVendors.some((vendor) => vendor.businessName === application.businessName)) {
    adminVendors.push({
      id: `vendor-${application.id}`,
      businessName: application.businessName,
      contactName: application.contactName,
      email: application.email,
      phone: application.phone,
      category: application.category,
      description: application.description,
      verificationStatus: "approved",
      accountStatus: "active",
      joinedAt: new Date().toISOString(),
      productCount: 0,
      orderCount: 0,
      lastActiveAt: null,
    });
  }
  const matchingVendor = adminVendors.find((vendor) => vendor.businessName === application.businessName);
  if (matchingVendor && status !== "approved") matchingVendor.verificationStatus = status;
  return res.json(UpdateVendorApplicationStatusResponse.parse(application));
});

router.get("/admin/vendors", (req, res) => {
  const accountStatus = typeof req.query.accountStatus === "string" ? req.query.accountStatus : undefined;
  const result = accountStatus
    ? adminVendors.filter((vendor) => vendor.accountStatus === accountStatus)
    : adminVendors;
  return res.json(ListAdminVendorsResponse.parse(result));
});

router.patch("/admin/vendors/:vendorId", (req, res) => {
  const { vendorId } = UpdateAdminVendorParams.parse(req.params);
  const changes = UpdateAdminVendorBody.parse(req.body);
  const vendor = adminVendors.find((entry) => entry.id === vendorId);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  Object.assign(vendor, changes);
  return res.json(UpdateAdminVendorResponse.parse(vendor));
});

router.get("/admin/vendors/:vendorId/messages", (req, res) => {
  const { vendorId } = ListAdminVendorMessagesParams.parse(req.params);
  if (!adminVendors.some((vendor) => vendor.id === vendorId)) return res.status(404).json({ error: "Vendor not found" });
  if (!vendorMessages[vendorId]) vendorMessages[vendorId] = [];
  return res.json(ListAdminVendorMessagesResponse.parse(vendorMessages[vendorId]));
});

router.post("/admin/vendors/:vendorId/messages", (req, res) => {
  const { vendorId } = CreateAdminVendorMessageParams.parse(req.params);
  const { body } = CreateAdminVendorMessageBody.parse(req.body);
  if (!adminVendors.some((vendor) => vendor.id === vendorId)) return res.status(404).json({ error: "Vendor not found" });
  const message: AdminMessage = {
    id: randomUUID(),
    senderType: "admin",
    senderName: "Operations desk",
    body,
    sentAt: new Date().toISOString(),
  };
  vendorMessages[vendorId] = [...(vendorMessages[vendorId] ?? []), message];
  return res.status(201).json(CreateAdminVendorMessageResponse.parse(message));
});

router.get("/admin/support-tickets", (req, res) => {
  const params = ListSupportTicketsQueryParams.parse(req.query);
  const result = params.status
    ? supportTickets.filter((ticket) => ticket.status === params.status)
    : supportTickets;
  return res.json(ListSupportTicketsResponse.parse(result));
});

router.patch("/admin/support-tickets/:ticketId", (req, res) => {
  const { ticketId } = UpdateSupportTicketParams.parse(req.params);
  const body = UpdateSupportTicketBody.parse(req.body);
  const ticket = supportTickets.find((entry) => entry.id === ticketId);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found" });
  ticket.status = body.status;
  ticket.assignedTo = body.assignedTo ?? ticket.assignedTo;
  ticket.updatedAt = new Date().toISOString();
  return res.json(UpdateSupportTicketResponse.parse(ticket));
});

router.get("/admin/support-tickets/:ticketId/messages", (req, res) => {
  const { ticketId } = ListSupportTicketMessagesParams.parse(req.params);
  if (!supportTickets.some((ticket) => ticket.id === ticketId)) return res.status(404).json({ error: "Support ticket not found" });
  return res.json(ListSupportTicketMessagesResponse.parse(ticketMessages[ticketId] ?? []));
});

router.post("/admin/support-tickets/:ticketId/messages", (req, res) => {
  const { ticketId } = CreateSupportTicketMessageParams.parse(req.params);
  const { body } = CreateSupportTicketMessageBody.parse(req.body);
  const ticket = supportTickets.find((entry) => entry.id === ticketId);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found" });
  const message: AdminMessage = {
    id: randomUUID(),
    senderType: "admin",
    senderName: "Operations desk",
    body,
    sentAt: new Date().toISOString(),
  };
  ticketMessages[ticketId] = [...(ticketMessages[ticketId] ?? []), message];
  ticket.lastMessage = body;
  ticket.status = ticket.status === "open" ? "in_progress" : ticket.status;
  ticket.updatedAt = message.sentAt;
  return res.status(201).json(CreateSupportTicketMessageResponse.parse(message));
});

router.get("/admin/support-accounts", (_req, res) => {
  return res.json(ListSupportAccountsResponse.parse(supportAccounts));
});

router.post("/admin/support-accounts", (req, res) => {
  const body = CreateSupportAccountBody.parse(req.body);
  const account: SupportAccount = {
    id: randomUUID(),
    ...body,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  supportAccounts.push(account);
  return res.status(201).json(CreateSupportAccountResponse.parse(account));
});

router.patch("/admin/support-accounts/:accountId", (req, res) => {
  const { accountId } = UpdateSupportAccountParams.parse(req.params);
  const changes = UpdateSupportAccountBody.parse(req.body);
  const account = supportAccounts.find((entry) => entry.id === accountId);
  if (!account) return res.status(404).json({ error: "Support account not found" });
  Object.assign(account, changes);
  return res.json(UpdateSupportAccountResponse.parse(account));
});

router.get("/admin/pricing-rules", (_req, res) => {
  return res.json(ListPricingRulesResponse.parse(pricingRules));
});

router.patch("/admin/pricing-rules/:ruleId", (req, res) => {
  const { ruleId } = UpdatePricingRuleParams.parse(req.params);
  const changes = UpdatePricingRuleBody.parse(req.body);
  const rule = pricingRules.find((entry) => entry.id === ruleId);
  if (!rule) return res.status(404).json({ error: "Pricing rule not found" });
  Object.assign(rule, changes, { updatedAt: new Date().toISOString() });
  repriceCatalog();
  return res.json(UpdatePricingRuleResponse.parse(rule));
});

router.get("/admin/fulfillment", (_req, res) => {
  const queueDefinitions = [
    { status: "PACKED", label: "Awaiting shipment" },
    { status: "SOURCING", label: "Sourcing in progress" },
    { status: "IN_TRANSIT", label: "International transit" },
    { status: "CUSTOMS_CLEARANCE", label: "Customs & clearance" },
    { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  ];
  const queues = queueDefinitions.map((definition) => {
    const matching = adminOrders.filter((order) => order.status === definition.status);
    return { ...definition, count: matching.length, orders: matching };
  });
  return res.json(GetFulfillmentOverviewResponse.parse({
    queues,
    sourcedOrders: adminOrders.filter((order) => order.fulfillment === "sourced").length,
    localOrders: adminOrders.filter((order) => order.fulfillment === "local").length,
    delayedOrders: adminOrders.filter((order) => ["CUSTOMS_CLEARANCE", "IN_TRANSIT"].includes(order.status)).length,
  }));
});

router.get("/admin/sales", (_req, res) => {
  const totalSales = adminOrders.reduce((sum, order) => sum + order.total, 0);
  const byCategory = [
    { label: "Home & Living", sales: 1515 },
    { label: "Fashion", sales: 480 },
    { label: "Wellness", sales: 330 },
    { label: "Kitchen", sales: 350 },
  ];
  return res.json(GetSalesOverviewResponse.parse({
    totalSales,
    totalOrders: adminOrders.length,
    averageOrderValue: adminOrders.length ? Math.round(totalSales / adminOrders.length) : 0,
    commission: Math.round(totalSales * (adminSettings.vendorCommissionRate / 100)),
    byDay: [
      { label: "Mon", sales: 1640, orders: 3 },
      { label: "Tue", sales: 2280, orders: 4 },
      { label: "Wed", sales: 1910, orders: 3 },
      { label: "Thu", sales: 2740, orders: 5 },
      { label: "Fri", sales: totalSales, orders: adminOrders.length },
      { label: "Sat", sales: 0, orders: 0 },
      { label: "Sun", sales: 0, orders: 0 },
    ],
    byCategory,
  }));
});

router.get("/admin/settings", (_req, res) => {
  return res.json(GetAdminSettingsResponse.parse(adminSettings));
});

router.patch("/admin/settings", (req, res) => {
  const changes = UpdateAdminSettingsBody.parse(req.body);
  adminSettings = { ...adminSettings, ...changes };
  return res.json(UpdateAdminSettingsResponse.parse(adminSettings));
});

router.get("/vendor/dashboard", (_req, res) => {
  const completedOrders = vendorOrders.filter((order) => ["completed", "delivered"].includes(order.status)).length;
  const cancelledRefundedOrders = vendorOrders.filter((order) => ["cancelled", "refunded", "refund_requested"].includes(order.status)).length;
  const productsInStock = vendorProducts.filter((product) => product.stockQty > 0 && product.status !== "archived").length;
  const lowStockAlerts = vendorProducts.filter((product) => product.stockQty <= product.lowStockThreshold && product.status !== "archived").length;
  return res.json(GetVendorDashboardResponse.parse({
    vendorName: "Mosi Home",
    pendingOrders: vendorOrders.filter((order) => ["new", "confirmed", "processing"].includes(order.status)).length,
    productsLive: vendorProducts.filter((product) => product.status === "active").length,
    revenueThisMonth: 18420,
    rating: vendorStorefront.averageRating,
    totalSales: vendorOrders.reduce((sum, order) => sum + order.total, 0),
    todaySales: vendorOrders.filter((order) => order.orderDate.startsWith("2026-09-16")).reduce((sum, order) => sum + order.total, 0),
    ordersAwaitingShipment: vendorOrders.filter((order) => order.status === "ready_for_dispatch").length,
    completedOrders,
    cancelledRefundedOrders,
    productsInStock,
    lowStockAlerts,
    unreadCustomerMessages: 4,
    pendingDisputes: vendorOrders.filter((order) => order.status === "disputed").length + 1,
    availableBalance: 6200,
    pendingBalance: 2300,
    recentOrders: vendorOrders.slice(0, 4),
    salesChart: vendorAnalytics.sales,
    customers: vendorCustomers,
    inventory: vendorProducts.map((product) => ({
      productId: product.id,
      productTitle: product.title,
      sku: product.sku,
      available: product.stockQty,
      reserved: product.stockQty > 0 ? 2 : 0,
      soldToday: product.purchases > 0 ? 1 : 0,
      lowStockThreshold: product.lowStockThreshold,
    })),
    storefront: vendorStorefront,
    verification: vendorVerification,
    settings: vendorSettings,
  }));
});

router.get("/vendor/products", (_req, res) => {
  return res.json(ListVendorProductsResponse.parse(vendorProducts));
});

router.post("/vendor/products", (req, res) => {
  const body = CreateVendorProductBody.parse(req.body);
  const product: VendorProduct = {
    id: randomUUID(),
    ...body,
    views: 0,
    purchases: 0,
    returns: 0,
  };
  vendorProducts.unshift(product);
  return res.status(201).json(CreateVendorProductResponse.parse(product));
});

router.patch("/vendor/products/:productId", (req, res) => {
  const { productId } = UpdateVendorProductParams.parse(req.params);
  const body = UpdateVendorProductBody.parse(req.body);
  const product = vendorProducts.find((entry) => entry.id === productId);
  if (!product) return res.status(404).json({ error: "Vendor product not found" });
  Object.assign(product, body);
  if (product.stockQty === 0 && product.status === "active") product.status = "out_of_stock";
  return res.json(UpdateVendorProductResponse.parse(product));
});

router.delete("/vendor/products/:productId", (req, res) => {
  const { productId } = ArchiveVendorProductParams.parse(req.params);
  const product = vendorProducts.find((entry) => entry.id === productId);
  if (!product) return res.status(404).json({ error: "Vendor product not found" });
  product.status = "archived";
  return res.json(ArchiveVendorProductResponse.parse(product));
});

router.post("/vendor/products/bulk", (req, res) => {
  const body = BulkUpdateVendorProductsBody.parse(req.body);
  const selected = vendorProducts.filter((product) => body.productIds.includes(product.id));
  for (const product of selected) {
    if (body.action === "enable") product.status = product.stockQty > 0 ? "active" : "out_of_stock";
    if (body.action === "disable") product.status = "disabled";
    if (body.action === "archive") product.status = "archived";
    if (body.action === "price_update" && body.value !== undefined) product.price = body.value;
    if (body.action === "stock_update" && body.value !== undefined) {
      product.stockQty = Math.max(0, Math.round(body.value));
      product.status = product.stockQty === 0 ? "out_of_stock" : product.status === "out_of_stock" ? "active" : product.status;
    }
  }
  return res.json(BulkUpdateVendorProductsResponse.parse(selected));
});

router.get("/vendor/orders", (_req, res) => {
  return res.json(ListVendorOrdersResponse.parse(vendorOrders));
});

router.patch("/vendor/orders/:orderId/status", (req, res) => {
  const { orderId } = UpdateVendorOrderStatusParams.parse(req.params);
  const { status } = UpdateVendorOrderStatusBody.parse(req.body);
  const order = vendorOrders.find((entry) => entry.id === orderId);
  if (!order) return res.status(404).json({ error: "Vendor order not found" });
  order.status = status;
  if (status === "shipped" && !order.trackingNumber) order.trackingNumber = `GUL-TRK-${Math.floor(Math.random() * 9000) + 1000}`;
  return res.json(UpdateVendorOrderStatusResponse.parse(order));
});

router.get("/vendor/reviews", (_req, res) => {
  return res.json(ListVendorReviewsResponse.parse(vendorReviews));
});

router.patch("/vendor/reviews/:reviewId/reply", (req, res) => {
  const { reviewId } = ReplyToVendorReviewParams.parse(req.params);
  const { reply } = ReplyToVendorReviewBody.parse(req.body);
  const review = vendorReviews.find((entry) => entry.id === reviewId);
  if (!review) return res.status(404).json({ error: "Vendor review not found" });
  review.reply = reply;
  review.repliedAt = new Date().toISOString();
  return res.json(ReplyToVendorReviewResponse.parse(review));
});

router.get("/vendor/promotions", (_req, res) => {
  return res.json(ListVendorPromotionsResponse.parse(vendorPromotions));
});

router.post("/vendor/promotions", (req, res) => {
  const body = CreateVendorPromotionBody.parse(req.body);
  const promotion: VendorPromotion = { id: randomUUID(), ...body, status: "scheduled" };
  vendorPromotions.unshift(promotion);
  return res.status(201).json(CreateVendorPromotionResponse.parse(promotion));
});

router.patch("/vendor/promotions/:promotionId", (req, res) => {
  const { promotionId } = UpdateVendorPromotionParams.parse(req.params);
  const body = UpdateVendorPromotionBody.parse(req.body);
  const promotion = vendorPromotions.find((entry) => entry.id === promotionId);
  if (!promotion) return res.status(404).json({ error: "Vendor promotion not found" });
  Object.assign(promotion, body);
  return res.json(UpdateVendorPromotionResponse.parse(promotion));
});

router.get("/vendor/analytics", (_req, res) => {
  return res.json(GetVendorAnalyticsResponse.parse(vendorAnalytics));
});

router.get("/vendor/storefront", (_req, res) => {
  return res.json(GetVendorStorefrontResponse.parse(vendorStorefront));
});

router.patch("/vendor/storefront", (req, res) => {
  const body = UpdateVendorStorefrontBody.parse(req.body);
  Object.assign(vendorStorefront, body);
  return res.json(UpdateVendorStorefrontResponse.parse(vendorStorefront));
});

router.get("/stores/:vendorId", (req, res) => {
  const { vendorId } = GetPublicVendorStorefrontParams.parse(req.params);
  if (vendorId !== vendorStorefront.vendorId || vendorStorefront.approvalStatus !== "approved") {
    return res.status(404).json({ error: "Storefront not found" });
  }
  return res.json(GetPublicVendorStorefrontResponse.parse({
    storefront: vendorStorefront,
    products: vendorProducts.filter((product) => product.status === "active"),
    reviews: vendorReviews,
  }));
});

router.get("/vendor/verification", (_req, res) => {
  return res.json(GetVendorVerificationResponse.parse(vendorVerificationStatus()));
});

router.patch("/vendor/verification", (req, res) => {
  const body = UpdateVendorVerificationBody.parse(req.body);
  Object.assign(vendorVerification, body);
  if (vendorVerification.idSubmitted && vendorVerification.businessDocumentsSubmitted) {
    vendorVerification.overallStatus = "under_review";
  } else if (vendorVerification.idSubmitted || vendorVerification.businessDocumentsSubmitted) {
    vendorVerification.overallStatus = "submitted";
  }
  return res.json(UpdateVendorVerificationResponse.parse(vendorVerification));
});

router.get("/vendor/settings", (_req, res) => {
  return res.json(GetVendorSettingsResponse.parse(vendorSettingsStatus()));
});

router.patch("/vendor/settings", (req, res) => {
  const body = UpdateVendorSettingsBody.parse(req.body);
  Object.assign(vendorSettings, body);
  return res.json(UpdateVendorSettingsResponse.parse(vendorSettings));
});

router.get("/vendor/support-tickets", (_req, res) => {
  return res.json(ListVendorSupportTicketsResponse.parse(vendorSupportTickets));
});

router.post("/vendor/support-tickets", (req, res) => {
  const body = CreateVendorSupportTicketBody.parse(req.body);
  const ticket: VendorSupportTicket = {
    id: randomUUID(),
    subject: body.subject,
    category: body.category,
    status: "open",
    lastMessage: body.message,
    updatedAt: new Date().toISOString(),
  };
  vendorSupportTickets.unshift(ticket);
  return res.status(201).json(CreateVendorSupportTicketResponse.parse(ticket));
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