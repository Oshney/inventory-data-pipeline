import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  const supabase = createClient(
    process.env.URL,
    process.env.KEY,
    {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          apikey: process.env.KEY,
          Authorization: `Bearer ${process.env.KEY}`
        }
      }
    }
  );

  const { data, error } = await supabase
    .from("stock")
    .select("*");

  if (error) {
    return res.status(500).json(error);
  }

  res.status(200).json(data);
}
