const CONFIG = {
  API_BASE:         "https://inventory-api-indol.vercel.app/api",
  API_KEY:          "123",
  LOW_STOCK:        10,
  MED_STOCK:        20,
  EMAIL:            "OSHNEYTHAKUR@gmail.com",
  TELEGRAM_TOKEN:   "8619267992:AAGsZ_i8_PjOfi5uBC6CSmO0JRFgXY-Z83M",
  TELEGRAM_CHAT_ID: "1343606539",
  EMAIL_ENABLED:    false,
  TELEGRAM_ENABLED: true,
};

function sendInventory() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const inwardSheet  = ss.getSheetByName("INWARDS");
  const outwardSheet = ss.getSheetByName("OUTWARDS");
  if (!inwardSheet || !outwardSheet) { showToast("❌ Sheet not found!", "Error"); return; }

  const props        = PropertiesService.getScriptProperties();
  let lastInwardRow  = parseInt(props.getProperty("lastInwardRow")  || "1");
  let lastOutwardRow = parseInt(props.getProperty("lastOutwardRow") || "1");

  const inwardData = inwardSheet.getDataRange().getValues();
  let inSent = 0;
  for (let i = lastInwardRow; i < inwardData.length; i++) {
    const r = inwardData[i];
    const payload = {
      sno: r[0], grn_no: String(r[1]).trim(), po_no: String(r[2]).trim(),
      bill_no: String(r[3]).trim(), bill_date: formatDate(r[4]),
      supplier_name: String(r[5]).trim(), supplier_mobile: String(r[6]).trim(),
      shop_name: String(r[7]).trim(), category: String(r[8]).trim(),
      hsn_code: String(r[9]).trim(), item_name: String(r[10]).trim(),
      brand: String(r[11]).trim(), unit: String(r[12]).trim(),
      qty: Number(r[13]), rate: Number(r[14]), amount: Number(r[15]),
      gst_percent: Number(r[16]), gst_amount: Number(r[17]), total_amount: Number(r[18]),
      payment_mode: String(r[19]).trim(), payment_status: String(r[20]).trim(),
      warehouse: String(r[21]).trim(), batch_no: String(r[22]).trim(),
      expiry_date: formatDate(r[23]), received_by: String(r[24]).trim(),
      verified_by: String(r[25]).trim(), note: String(r[26] || "").trim()
    };
    if (!payload.item_name || isNaN(payload.qty) || payload.qty <= 0) continue;
    const result = postToAPI("/addInward", payload);
    if (result.ok) inSent++;
    Logger.log("IN " + (i+1) + ": " + result.text);
  }
  props.setProperty("lastInwardRow", inwardData.length.toString());

  const outwardData = outwardSheet.getDataRange().getValues();
  let outSent = 0;
  for (let i = lastOutwardRow; i < outwardData.length; i++) {
    const r = outwardData[i];
    const payload = {
      sno: r[0], challan_no: String(r[1]).trim(), bill_no: String(r[2]).trim(),
      bill_date: formatDate(r[3]), customer_name: String(r[4]).trim(),
      department: String(r[5]).trim(), receiver_mobile: String(r[6]).trim(),
      authorized_by: String(r[7]).trim(), purpose: String(r[8]).trim(),
      category: String(r[9]).trim(), hsn_code: String(r[10]).trim(),
      item_name: String(r[11]).trim(), brand: String(r[12]).trim(),
      unit: String(r[13]).trim(), qty: Number(r[14]), rate: Number(r[15]),
      amount: Number(r[16]), discount_pct: Number(r[17]), discount_amt: Number(r[18]),
      net_amount: Number(r[19]), gst_percent: Number(r[20]), gst_amount: Number(r[21]),
      total_amount: Number(r[22]), payment_mode: String(r[23]).trim(),
      payment_status: String(r[24]).trim(), return_date: formatDate(r[25]),
      issued_by: String(r[26]).trim(), note: String(r[27] || "").trim()
    };
    if (!payload.item_name || isNaN(payload.qty) || payload.qty <= 0) continue;
    const result = postToAPI("/addOutward", payload);
    if (result.ok) outSent++;
    Logger.log("OUT " + (i+1) + ": " + result.text);
  }
  props.setProperty("lastOutwardRow", outwardData.length.toString());

  Logger.log("✅ Synced! IN=" + inSent + " OUT=" + outSent);
  showToast("✅ Synced! IN: " + inSent + " | OUT: " + outSent, "Done");
  syncStock();
}

function syncStock() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName("STOCK");
  if (!stockSheet) return;

  const res     = UrlFetchApp.fetch(CONFIG.API_BASE + "/stock", {
    method: "get", headers: { "x-api-key": CONFIG.API_KEY }, muteHttpExceptions: true
  });
  const json    = JSON.parse(res.getContentText());
  const inData  = json.inwards  || [];
  const outData = json.outwards || [];
  const stockMap = {};

  inData.forEach(row => {
    const item = String(row.item_name || "").trim();
    const qty  = Number(row.qty)  || 0;
    const rate = Number(row.rate) || 0;
    const unit = String(row.unit  || "").trim();
    const brand= String(row.brand || "").trim();
    if (!item) return;
    if (!stockMap[item]) stockMap[item] = { totalIn: 0, totalOut: 0, unit, brand, rates: [] };
    stockMap[item].totalIn += qty;
    if (rate > 0) stockMap[item].rates.push(rate);
  });

  outData.forEach(row => {
    const item = String(row.item_name || "").trim();
    const qty  = Number(row.qty) || 0;
    if (!item) return;
    if (!stockMap[item]) stockMap[item] = { totalIn: 0, totalOut: 0, unit: "", brand: "", rates: [] };
    stockMap[item].totalOut += qty;
  });

  stockSheet.clearContents();
  stockSheet.clearFormats();
  const header = stockSheet.getRange(1, 1, 1, 9);
  header.setValues([["ITEM NAME","BRAND","UNIT","TOTAL IN","TOTAL OUT","CURRENT STOCK","AVG RATE","STOCK VALUE","STATUS"]]);
  header.setBackground("#1a1a2e").setFontColor("#ffffff").setFontWeight("bold");

  const rows = [];
  for (const item in stockMap) {
    const d       = stockMap[item];
    const current = d.totalIn - d.totalOut;
    const avgRate = d.rates.length > 0 ? d.rates.reduce((a,b)=>a+b,0)/d.rates.length : 0;
    const value   = current * avgRate;
    const status  = current<=0?"🔴 OUT":current<=CONFIG.LOW_STOCK?"🔴 LOW":current<=CONFIG.MED_STOCK?"🟡 MED":"🟢 OK";
    rows.push([item, d.brand, d.unit, d.totalIn, d.totalOut, current, avgRate.toFixed(2), value.toFixed(2), status]);
  }

  if (rows.length > 0) {
    stockSheet.getRange(2, 1, rows.length, 9).setValues(rows);
    applyStockColors(stockSheet, rows.length);
  }

  buildDashboard();
  checkLowStock(stockSheet);
  Logger.log("✅ Stock updated!");
}

function applyStockColors(stockSheet, rowCount) {
  for (let i = 2; i <= rowCount + 1; i++) {
    const stock = stockSheet.getRange(i, 6).getValue();
    const row   = stockSheet.getRange(i, 1, 1, 9);
    if (stock <= 0) { row.setBackground("#000000"); row.setFontColor("#FF4444"); }
    else if (stock <= CONFIG.LOW_STOCK) { row.setBackground("#FF4444"); row.setFontColor("#FFFFFF"); }
    else if (stock <= CONFIG.MED_STOCK) { row.setBackground("#FFD700"); row.setFontColor("#000000"); }
    else { row.setBackground("#00C851"); row.setFontColor("#FFFFFF"); }
  }
}

function buildDashboard() {
  const ss             = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet     = ss.getSheetByName("STOCK");
  const dashboardSheet = ss.getSheetByName("DASHBOARD");
  if (!stockSheet || !dashboardSheet) return;

  dashboardSheet.getCharts().forEach(c => dashboardSheet.removeChart(c));
  dashboardSheet.clearContents();
  dashboardSheet.clearFormats();

  const lastRow = stockSheet.getLastRow();
  if (lastRow < 2) return;

  const stockData = stockSheet.getRange(2, 1, lastRow-1, 9).getValues();
  let totalValue=0, lowCount=0, outCount=0;
  stockData.forEach(r => {
    totalValue += Number(r[7])||0;
    if (Number(r[5])<=0) outCount++;
    else if (Number(r[5])<=CONFIG.LOW_STOCK) lowCount++;
  });

  dashboardSheet.getRange("A1").setValue("📊 INVENTORY DASHBOARD — " + new Date().toLocaleDateString());
  dashboardSheet.getRange("A1").setFontSize(14).setFontWeight("bold").setFontColor("#1a1a2e");

  const summary = [
    ["💰 Total Stock Value", "₹ " + totalValue.toFixed(2)],
    ["📦 Total Items",       stockData.length],
    ["⚠️ Low Stock Items",   lowCount],
    ["🔴 Out of Stock",      outCount],
    ["🕐 Last Updated",      new Date().toLocaleString()]
  ];
  dashboardSheet.getRange(3, 1, summary.length, 2).setValues(summary);
  dashboardSheet.getRange(3, 1, summary.length, 2).setFontWeight("bold").setFontSize(11);

  const totalIn  = stockData.reduce((a,r)=>a+(Number(r[3])||0),0);
  const totalOut = stockData.reduce((a,r)=>a+(Number(r[4])||0),0);
  dashboardSheet.getRange("H3:I5").setValues([["TYPE","QTY"],["TOTAL IN",totalIn],["TOTAL OUT",totalOut]]);

  dashboardSheet.insertChart(dashboardSheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(stockSheet.getRange(1,1,lastRow,1))
    .addRange(stockSheet.getRange(1,6,lastRow,1))
    .setPosition(10,1,0,0)
    .setOption("title","📦 Current Stock per Item")
    .setOption("width",550).setOption("height",350)
    .setOption("colors",["#00C851"]).build());

  dashboardSheet.insertChart(dashboardSheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dashboardSheet.getRange("H3:I5"))
    .setPosition(10,8,0,0)
    .setOption("title","🥧 IN vs OUT")
    .setOption("width",400).setOption("height",350)
    .setOption("colors",["#00C851","#FF4444"]).build());

  dashboardSheet.insertChart(dashboardSheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(stockSheet.getRange(1,1,lastRow,1))
    .addRange(stockSheet.getRange(1,4,lastRow,2))
    .setPosition(30,1,0,0)
    .setOption("title","📊 Item wise IN vs OUT")
    .setOption("width",650).setOption("height",350)
    .setOption("colors",["#00C851","#FF4444"]).build());

  Logger.log("✅ Dashboard built!");
  showToast("📊 Dashboard updated!", "Charts");
}

function checkLowStock(stockSheet) {
  const data     = stockSheet.getDataRange().getValues();
  const lowItems = [];
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][5]) <= CONFIG.LOW_STOCK) lowItems.push({ item: data[i][0], stock: data[i][5] });
  }
  if (lowItems.length === 0) { Logger.log("✅ Stock OK"); return; }

  let msg = "⚠️ LOW STOCK ALERT!\n\n";
  lowItems.forEach(r => { msg += "📦 " + r.item + " → " + r.stock + " bachi\n"; });
  msg += "\n🕐 " + new Date().toLocaleString();

  if (CONFIG.TELEGRAM_ENABLED) sendTelegram(msg);
  if (CONFIG.EMAIL_ENABLED)    sendLowStockEmail(lowItems);
  addReorderEntry(lowItems);
  showToast("⚠️ " + lowItems.length + " low stock!", "Alert");
}

function sendTelegram(message) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.TELEGRAM_TOKEN + "/sendMessage", {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text: message }),
      muteHttpExceptions: true
    });
    Logger.log("📱 Telegram sent!");
  } catch(e) { Logger.log("❌ Telegram: " + e.message); }
}

function sendLowStockEmail(lowItems) {
  try {
    let body = "Low stock:\n\n";
    lowItems.forEach(r => { body += "📦 " + r.item + " → " + r.stock + "\n"; });
    GmailApp.sendEmail(CONFIG.EMAIL, "⚠️ Low Stock Alert", body);
  } catch(e) { Logger.log("❌ Email: " + e.message); }
}

function addReorderEntry(lowItems) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("REORDER");
    if (!sheet) {
      sheet = ss.insertSheet("REORDER");
      const h = sheet.getRange(1,1,1,4);
      h.setValues([["DATE","ITEM","CURRENT STOCK","STATUS"]]);
      h.setBackground("#1a1a2e").setFontColor("#ffffff").setFontWeight("bold");
    }
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    lowItems.forEach(r => { sheet.appendRow([today, r.item, r.stock, "PENDING"]); });
  } catch(e) { Logger.log("❌ Reorder: " + e.message); }
}

function postToAPI(endpoint, payload) {
  try {
    const res = UrlFetchApp.fetch(CONFIG.API_BASE + endpoint, {
      method: "post", contentType: "application/json",
      headers: { "x-api-key": CONFIG.API_KEY },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    return { ok: res.getResponseCode() < 300, text: res.getContentText() };
  } catch(e) { return { ok: false, text: e.message }; }
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(value).trim();
}

function showToast(message, title) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(message, title || "Inventory", 5); } catch(e) {} 
}

function resetSync() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("✅ Reset Done!");
  showToast("✅ Reset done!", "Reset");
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sendInventory").timeBased().everyMinutes(5).create();
  showToast("✅ Trigger set!", "Trigger");
}

function testTelegram() {
  sendTelegram("✅ Test! System connected! 🎉");
}
