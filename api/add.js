export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { item, qty } = req.body;

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
        body: JSON.stringify([{ item, qty }]),
      }
    );

    const data = await response.json();

    res.status(200).json({
      message: "Added successfully",
      data: data
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
}
