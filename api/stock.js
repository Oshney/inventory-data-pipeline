export default async function handler(req, res) {
  try {
    const [inRes, outRes] = await Promise.all([
      fetch("https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/inwards?select=*&order=created_at.desc", {
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`
        }
      }),
      fetch("https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/outwards?select=*&order=created_at.desc", {
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`
        }
      })
    ]);

    const inData  = await inRes.json();
    const outData = await outRes.json();

    res.status(200).json({ inwards: inData, outwards: outData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
