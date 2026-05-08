import fs from "node:fs";
import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-03-25.dahlia";

const CATALOG = [
  {
    key: "planner",
    name: "Kiaros Planner",
    description:
      "A personalized planning system built from your chart, your goals, and your real timing, with ongoing guidance as the year unfolds.",
    prices: [
      { accessPlan: "monthly", amount: 1400, recurring: { interval: "month" } },
      { accessPlan: "yearly", amount: 14000 },
    ],
  },
  {
    key: "planner_oracle",
    name: "Kiaros Planner + Oracle",
    description:
      "Everything in the Planner tier, plus Oracle access with journal memory, astrological pattern recognition, and higher-touch decision support throughout the year.",
    prices: [
      { accessPlan: "monthly", amount: 2200, recurring: { interval: "month" } },
      { accessPlan: "yearly", amount: 22000 },
    ],
  },
];

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

function priceLookupKey(tierKey, accessPlan) {
  return `kiaros_${tierKey}_${accessPlan}_usd`;
}

async function findProduct(stripe, tier) {
  const existing = await stripe.products.search({
    query: `metadata['product_tier']:'${tier.key}'`,
    limit: 1,
  });

  if (existing.data[0]) {
    return stripe.products.update(existing.data[0].id, {
      name: tier.name,
      description: tier.description,
      metadata: { product_tier: tier.key },
      active: true,
    });
  }

  return stripe.products.create({
    name: tier.name,
    description: tier.description,
    metadata: { product_tier: tier.key },
  });
}

async function ensurePrice(stripe, product, tier, price) {
  const lookupKey = priceLookupKey(tier.key, price.accessPlan);
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 10,
  });

  const match = existing.data.find(
    (candidate) =>
      candidate.unit_amount === price.amount &&
      candidate.currency === "usd" &&
      candidate.product === product.id &&
      candidate.recurring?.interval === price.recurring?.interval
  );

  if (match) return match;

  await Promise.all(
    existing.data.map((candidate) => stripe.prices.update(candidate.id, { active: false }))
  );

  return stripe.prices.create({
    currency: "usd",
    unit_amount: price.amount,
    lookup_key: lookupKey,
    product: product.id,
    recurring: price.recurring,
    nickname: `${tier.name} ${price.accessPlan}`,
    metadata: {
      product_tier: tier.key,
      access_plan: price.accessPlan,
    },
  });
}

async function archiveUnmanagedActivePrices(stripe, managedPriceIds) {
  const activePrices = await stripe.prices.list({ active: true, limit: 100 });
  const stalePrices = activePrices.data.filter((price) => !managedPriceIds.has(price.id));

  await Promise.all(stalePrices.map((price) => stripe.prices.update(price.id, { active: false })));
  return stalePrices;
}

async function archiveUnmanagedProducts(stripe, managedProductIds) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const staleProducts = products.data.filter((product) => !managedProductIds.has(product.id));

  await Promise.all(
    staleProducts.map((product) => stripe.products.update(product.id, { active: false }))
  );
  return staleProducts;
}

async function main() {
  const env = { ...loadEnvFile(".env.local"), ...process.env };
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const managedProductIds = new Set();
  const managedPriceIds = new Set();
  const synced = [];

  for (const tier of CATALOG) {
    const product = await findProduct(stripe, tier);
    managedProductIds.add(product.id);

    for (const price of tier.prices) {
      const stripePrice = await ensurePrice(stripe, product, tier, price);
      managedPriceIds.add(stripePrice.id);
      synced.push({
        tier: tier.key,
        accessPlan: price.accessPlan,
        amount: stripePrice.unit_amount,
        priceId: stripePrice.id,
        productId: product.id,
      });
    }
  }

  const stalePrices = await archiveUnmanagedActivePrices(stripe, managedPriceIds);
  const staleProducts = await archiveUnmanagedProducts(stripe, managedProductIds);

  console.log(
    JSON.stringify(
      {
        mode: env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test",
        synced,
        archivedPrices: stalePrices.map((price) => price.id),
        archivedProducts: staleProducts.map((product) => product.id),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
