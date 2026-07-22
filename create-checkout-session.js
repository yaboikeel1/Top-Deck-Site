// Netlify Function starter: create-checkout-session.js
// Add STRIPE_SECRET_KEY and SITE_URL in Netlify environment variables.
// Uncomment after installing stripe dependency in a full Node project.

/*
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  try {
    const { items } = JSON.parse(event.body);
    const line_items = items.map((item) => ({
      price: item.stripePriceId,
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
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
exports.handler = async function() {
  return { statusCode: 501, body: JSON.stringify({ error: "Stripe is not connected yet." }) };
};
