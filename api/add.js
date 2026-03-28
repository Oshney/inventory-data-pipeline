export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    // ✅ YEH LINE ADD KARO - body parse karne ke liye
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { item, qty, type } = body;

    // ✅ YEH BHI ADD KARO - debug ke liye
    console.log("Received:", { item, qty, type });

    if (!item || !qty || !type) {
      return res.status(400).json({ error: "Missing fields", received: body });
    }

    const response = await fetch(
      "https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/stock",
      {
        method: "POST",
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify([{ item, qty, type }])
      }
    );

    const data = await response.json();
    res.status(200).json({ message: "Added successfully", data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
