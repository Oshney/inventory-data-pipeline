export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { sno, shop_name, name, item, qty, order_date, note } = body;

    if (!item || !qty) {
      return res.status(400).json({ error: "Missing fields", received: body });
    }

    const response = await fetch(
      "https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/inwards",
      {
        method: "POST",
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify([
          { sno, shop_name, name, item, qty, order_date, note }
        ])
      }
    );

    const text = await response.text();
    console.log("SUPABASE RESPONSE:", text);

    return res.status(200).json({ ok: true, text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
