export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      sno, grn_no, po_no, bill_no, bill_date,
      supplier_name, supplier_mobile, shop_name,
      category, hsn_code, item_name, brand, unit,
      qty, rate, amount, gst_percent, gst_amount, total_amount,
      payment_mode, payment_status, warehouse,
      batch_no, expiry_date, received_by, verified_by, note
    } = body;

    if (!item_name || !qty) return res.status(400).json({ error: "Missing fields" });

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
        body: JSON.stringify([{
          sno, grn_no, po_no, bill_no, bill_date,
          supplier_name, supplier_mobile, shop_name,
          category, hsn_code, item_name, brand, unit,
          qty, rate, amount, gst_percent, gst_amount, total_amount,
          payment_mode, payment_status, warehouse,
          batch_no, expiry_date, received_by, verified_by, note
        }])
      }
    );

    const data = await response.json();
    res.status(200).json({ message: "Inward added", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
