export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      sno, challan_no, bill_no, bill_date,
      customer_name, department, receiver_mobile,
      authorized_by, purpose, category, hsn_code,
      item_name, brand, unit, qty, rate, amount,
      discount_pct, discount_amt, net_amount,
      gst_percent, gst_amount, total_amount,
      payment_mode, payment_status, return_date,
      issued_by, note
    } = body;

    if (!item_name || !qty) return res.status(400).json({ error: "Missing fields" });

    const response = await fetch(
      "https://locrzxuubbbiwtoefyht.supabase.co/rest/v1/outwards",
      {
        method: "POST",
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify([{
          sno, challan_no, bill_no, bill_date,
          customer_name, department, receiver_mobile,
          authorized_by, purpose, category, hsn_code,
          item_name, brand, unit, qty, rate, amount,
          discount_pct, discount_amt, net_amount,
          gst_percent, gst_amount, total_amount,
          payment_mode, payment_status, return_date,
          issued_by, note
        }])
      }
    );

    const data = await response.json();
    res.status(200).json({ message: "Outward added", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
