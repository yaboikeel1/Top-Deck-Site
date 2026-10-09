// Stripe starter for Netlify Functions.
// Install Stripe and add STRIPE_SECRET_KEY + SITE_URL before going live.
/*
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
exports.handler = async (event) => {
  try {
    const { items } = JSON.parse(event.body);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map(i => ({ price: i.stripePriceId, quantity: i.quantity })),
      success_url: `${process.env.SITE_URL}/success.html`,
      cancel_url: `${process.env.SITE_URL}/merch.html`,
      shipping_address_collection: { allowed_countries: ["US"] }
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
*/
exports.handler = async () => ({statusCode:501,body:JSON.stringify({error:"Stripe is not connected yet."})});