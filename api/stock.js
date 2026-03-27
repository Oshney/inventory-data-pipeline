export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/stock?select=*",
      {
        method: "GET",
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
