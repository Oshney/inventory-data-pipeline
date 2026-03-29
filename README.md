# 📦 Inventory Management Data Pipeline

A real-world automated data pipeline built to solve 
inventory tracking problems at a school store.

---

## 🎯 Problem

As a Store Incharge at a school, I was manually tracking 
stationery and hardware stock using basic Google Sheets formulas.

Key problems:
- Could not search stock by item, date, or supplier easily
- No alerts when stock was running low
- Data had no permanent backup or database
- Could not run SQL queries for business analysis

---

## ✅ Solution

Built an end-to-end automated data pipeline where:
- Staff enters data in Google Sheets as usual
- Data automatically syncs to a PostgreSQL database every 5 minutes
- Stock is calculated and color-coded in real time
- Instant Telegram alerts when stock drops below threshold
- Full SQL analysis available on live data

---

## 🛠️ Tech Stack

| Tool | Role |
|------|------|
| Google Sheets | Data entry interface |
| Google Apps Script | Automation and scheduling |
| Vercel | REST API server |
| Supabase (PostgreSQL) | Database |
| GitHub | Code repository |
| Telegram Bot | Real-time alerts |
| Postman | API testing |

---

## 🔄 How It Works
```
Google Sheets → Apps Script → Vercel API → Supabase PostgreSQL
                                                  ↓
                             SQL Analysis ← Stock Calculation
                                                  ↓
                             Telegram Alert ← Low Stock Monitor
```

1. Staff fills INWARDS or OUTWARDS sheet
2. Apps Script runs every 5 minutes automatically
3. New rows are sent to Vercel REST API
4. Vercel saves data to Supabase PostgreSQL
5. Stock is calculated per item automatically
6. Color coding applied — 🟢 Green / 🟡 Yellow / 🔴 Red
7. If stock drops below 10 → Telegram alert sent instantly

---

## 📸 Screenshots

### INWARDS Sheet — Stock Entry from Supplier
![Inwards](INWARDS%20GOOGLE%20SHEET%20.jpg)
### OUTWARDS Sheet — Sales Entry to Customer
![Outwards](OUTWARDS%20GOOGLE%20SHEET.jpg)
### STOCK Sheet — Real-time Color Coded Stock
![Stock](STOCK%20COUNT%20SHEET.jpg)

### Supabase Database — PostgreSQL Tables
![Supabase](SUPABASE%20DATABASE%20STRUCTURE.jpg)

### Apps Script — Execution Log
![Apps Script](APP%20SCRIPT%20WORKING%20SCREENSHORT.jpg)

### Vercel — Live Deployment
![Vercel](VERCEL%20DEPLOYMENT.jpg)

### Telegram — Low Stock Alert
![Telegram](BOT%20ALERT%20LOW%20STOCK%20TELEGRAM.jpg)

### Gmail — Low Stock Alert
![Gmail](GMAIL%20ALERT%20SYSTEM%20LOW%20STOCK.jpg)
---

## 📊 SQL Analysis Examples
```sql
-- Current stock per item
SELECT 
  i.item,
  SUM(i.qty) as total_in,
  COALESCE(SUM(o.qty), 0) as total_out,
  SUM(i.qty) - COALESCE(SUM(o.qty), 0) as current_stock
FROM inwards i
LEFT JOIN outwards o ON i.item = o.item
GROUP BY i.item;

-- Top selling items
SELECT item, SUM(qty) as total_sold
FROM outwards
GROUP BY item
ORDER BY total_sold DESC;

-- Sales by customer
SELECT customer_name, 
       COUNT(*) as total_orders,
       SUM(net_amount) as total_spent
FROM outwards
GROUP BY customer_name
ORDER BY total_spent DESC;

-- Items needing reorder
SELECT i.item,
       SUM(i.qty) - COALESCE(SUM(o.qty), 0) as current_stock
FROM inwards i
LEFT JOIN outwards o ON i.item = o.item
GROUP BY i.item
HAVING SUM(i.qty) - COALESCE(SUM(o.qty), 0) < 10;
```

---

## 🌐 Live API
```
GET  https://inventory-api-indol.vercel.app/api/stock
POST https://inventory-api-indol.vercel.app/api/addInward
POST https://inventory-api-indol.vercel.app/api/addOutward
```

---

## 📁 Project Structure
```
inventory-api/
├── pages/
│   └── api/
│       ├── addInward.js    ← Save inward entries to Supabase
│       ├── addOutward.js   ← Save outward entries to Supabase
│       └── stock.js        ← Return all stock data
├── apps-script/
│   └── Code.gs             ← Google Apps Script automation
└── package.json
```

---

## 🚀 Key Features

- ✅ Auto sync every 5 minutes — no manual effort
- ✅ Duplicate entry prevention using row counter
- ✅ Real-time stock calculation
- ✅ Color coded stock levels in Google Sheets
- ✅ Telegram instant alerts on low stock
- ✅ Auto REORDER sheet entries
- ✅ Email alerts — configurable on/off
- ✅ Full SQL access on live data via Supabase

---

## 🐛 Key Challenges Solved

| Problem | Solution |
|---------|----------|
| API returning 404 | Moved file to correct `pages/api/` folder |
| Supabase blocking inserts | Disabled Row Level Security |
| Duplicate entries | Row counter system + unique constraints |
| Date format error | Used `Utilities.formatDate()` in Apps Script |
| WhatsApp API slow | Switched to Telegram Bot — instant delivery |

---

## 👤 Author

**Oshney Singh Thakur**  
Aspiring Data Analyst  
[GitHub](https://github.com/Oshney)
```

---

**Ab screenshots add karne ke liye:**

GitHub pe ek folder banao:

**Add file → Create new file → naam likho:**
```
screenshots/inwards.png
