// ============================================================
//  INVENTORY SYNC — FINAL VERSION
//  Features: Telegram + Email + Color Coding + Auto Reorder
// ============================================================

const CONFIG = {
  API_BASE:          "https://inventory-api-indol.vercel.app/api",
  API_KEY:           "123",
  LOW_STOCK:         10,
  MED_STOCK:         20,
  EMAIL:             "OSHNEYTHAKUR@gmail.com",     // ← Apni email daalo
  TELEGRAM_TOKEN:    "8619267992:AAGsZ_i8_PjOfi5uBC6CSmO0JRFgXY-Z83M",
  TELEGRAM_CHAT_ID:  "1343606539",
  ALERTS_ENABLED:    true,        // ← YEH ADD KARO
  EMAIL_ENABLED:     false,       // ← YEH ADD KARO
  TELEGRAM_ENABLED:  true,        // ← YEH ADD KARO
};

// ─────────────────────────────────────────────
//  MAIN ENTRY
// ─────────────────────────────────────────────
function sendInventory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inwardSheet  = ss.getSheetByName("INWARDS");
  const outwardSheet = ss.getSheetByName("OUTWARDS");

  if (!inwardSheet || !outwardSheet) {
    showToast("❌ INWARDS or OUTWARDS sheet not found!", "Error");
    return;
  }

  const props = PropertiesService.getScriptProperties();
  let lastInwardRow  = parseInt(props.getProperty("lastInwardRow")  || "1");
  let lastOutwardRow = parseInt(props.getProperty("lastOutwardRow") || "1");

  Logger.log("▶ Starting sync | lastInward=" + lastInwardRow + " | lastOutward=" + lastOutwardRow);

  // ── 📥 INWARD ──────────────────────────────
  const inwardData = inwardSheet.getDataRange().getValues();
  let inSent = 0, inSkipped = 0;

  for (let i = lastInwardRow; i < inwardData.length; i++) {
    const row        = inwardData[i];
    const sno        = row[0];
    const shop_name  = String(row[1]).trim();
    const name       = String(row[2]).trim();
    const item       = String(row[3]).trim();
    const qty        = Number(row[4]);
    const order_date = formatDate(row[5]);
    const note       = String(row[6] || "").trim();

    if (!item || isNaN(qty) || qty <= 0) {
      inSkipped++;
      continue;
    }

    const payload = { sno, shop_name, name, item, qty, order_date, note };
    Logger.log("📤 Sending INWARD row " + (i+1) + ": " + JSON.stringify(payload));

    const result = postToAPI("/addInward", payload);
    if (result.ok) {
      Logger.log("✅ Inward OK: " + result.text);
      inSent++;
    } else {
      Logger.log("❌ Inward FAILED row " + (i+1) + ": " + result.text);
    }
  }

  props.setProperty("lastInwardRow", inwardData.length.toString());
  Logger.log("📥 Inward done | sent=" + inSent + " | skipped=" + inSkipped);

  // ── 📤 OUTWARD ─────────────────────────────
  const outwardData = outwardSheet.getDataRange().getValues();
  let outSent = 0, outSkipped = 0;

  for (let i = lastOutwardRow; i < outwardData.length; i++) {
    const row           = outwardData[i];
    const order_date    = formatDate(row[0]);
    const customer_name = String(row[1]).trim();
    const sub_category  = String(row[2]).trim();
    const item          = String(row[3]).trim();
    const qty           = Number(row[4]);
    const rate          = Number(row[5]);
    const net_amount    = Number(row[6]);
    const note          = String(row[7] || "").trim();

    if (!item || isNaN(qty) || qty <= 0) {
      outSkipped++;
      continue;
    }

    const payload = { order_date, customer_name, sub_category, item, qty, rate, net_amount, note };
    Logger.log("📤 Sending OUTWARD row " + (i+1) + ": " + JSON.stringify(payload));

    const result = postToAPI("/addOutward", payload);
    if (result.ok) {
      Logger.log("✅ Outward OK: " + result.text);
      outSent++;
      sendEmailAlert(item, qty, customer_name);
    } else {
      Logger.log("❌ Outward FAILED row " + (i+1) + ": " + result.text);
    }
  }

  props.setProperty("lastOutwardRow", outwardData.length.toString());
  Logger.log("📤 Outward done | sent=" + outSent + " | skipped=" + outSkipped);

  Logger.log("✅ Inventory Synced! IN=" + inSent + " OUT=" + outSent);
  showToast("✅ Synced! IN: " + inSent + " | OUT: " + outSent, "Done");

  syncStock();
}

// ─────────────────────────────────────────────
//  SYNC STOCK SHEET
// ─────────────────────────────────────────────
function syncStock() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName("STOCK");
  if (!stockSheet) return;

  let res;
  try {
    res = UrlFetchApp.fetch(CONFIG.API_BASE + "/stock", {
      method: "get",
      headers: { "x-api-key": CONFIG.API_KEY },
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("❌ Stock fetch error: " + e.message);
    return;
  }

  const responseCode = res.getResponseCode();
  if (responseCode !== 200) return;

  const json    = JSON.parse(res.getContentText());
  const inData  = json.inwards  || [];
  const outData = json.outwards || [];

  const stockMap = {};

  inData.forEach(row => {
    const item = String(row.item).trim();
    const qty  = Number(row.qty) || 0;
    if (!item) return;
    if (!stockMap[item]) stockMap[item] = { totalIn: 0, totalOut: 0 };
    stockMap[item].totalIn += qty;
  });

  outData.forEach(row => {
    const item = String(row.item).trim();
    const qty  = Number(row.qty) || 0;
    if (!item) return;
    if (!stockMap[item]) stockMap[item] = { totalIn: 0, totalOut: 0 };
    stockMap[item].totalOut += qty;
  });

  // Write header
  stockSheet.clearContents();
  stockSheet.clearFormats();
  const header = stockSheet.getRange(1, 1, 1, 4);
  header.setValues([["ITEM", "TOTAL IN", "TOTAL OUT", "CURRENT STOCK"]]);
  header.setBackground("#1a1a2e");
  header.setFontColor("#ffffff");
  header.setFontWeight("bold");

  const rows = [];
  for (const item in stockMap) {
    const totalIn  = stockMap[item].totalIn;
    const totalOut = stockMap[item].totalOut;
    rows.push([item, totalIn, totalOut, totalIn - totalOut]);
  }

  if (rows.length > 0) {
    stockSheet.getRange(2, 1, rows.length, 4).setValues(rows);
    applyStockColors(stockSheet, rows.length);
  }

  Logger.log("✅ Stock updated with " + rows.length + " items.");
  checkLowStock(stockSheet);
}

// ─────────────────────────────────────────────
//  COLOR CODING
// ─────────────────────────────────────────────
function applyStockColors(stockSheet, rowCount) {
  for (let i = 2; i <= rowCount + 1; i++) {
    const stock = stockSheet.getRange(i, 4).getValue();
    const row   = stockSheet.getRange(i, 1, 1, 4);

    if (stock <= 0) {
      row.setBackground("#000000");
      row.setFontColor("#FF4444");
    } else if (stock <= CONFIG.LOW_STOCK) {
      row.setBackground("#FF4444");
      row.setFontColor("#FFFFFF");
    } else if (stock <= CONFIG.MED_STOCK) {
      row.setBackground("#FFD700");
      row.setFontColor("#000000");
    } else {
      row.setBackground("#00C851");
      row.setFontColor("#FFFFFF");
    }
  }
}

// ─────────────────────────────────────────────
//  LOW STOCK CHECK — Email + Telegram + Reorder
// ─────────────────────────────────────────────
function checkLowStock(stockSheet) {
  const data = stockSheet.getDataRange().getValues();
  const lowItems = [];

  for (let i = 1; i < data.length; i++) {
    const item  = data[i][0];
    const stock = data[i][3];
    if (stock <= CONFIG.LOW_STOCK) {
      lowItems.push({ item, stock });
    }
  }

  if (lowItems.length === 0) {
    Logger.log("✅ All stock levels OK.");
    return;
  }

  // Build message
  let msg = "⚠️ LOW STOCK ALERT!\n\n";
  lowItems.forEach(r => {
    msg += "📦 " + r.item + " → " + r.stock + " bachi\n";
  });
  msg += "\n🕐 " + new Date().toLocaleString();

  Logger.log(msg);

  // 📧 Email
  if (CONFIG.EMAIL_ENABLED) sendLowStockEmail(lowItems);

  // 💬 Telegram
  if (CONFIG.TELEGRAM_ENABLED) sendTelegram(msg);

  // 📝 Auto Reorder Entry
  addReorderEntry(lowItems);

  showToast("⚠️ Low stock! " + lowItems.length + " items. Alert bheja!", "Low Stock");
}

// ─────────────────────────────────────────────
//  TELEGRAM ALERT
// ─────────────────────────────────────────────
function sendTelegram(message) {
  try {
    const url = "https://api.telegram.org/bot" + CONFIG.TELEGRAM_TOKEN + "/sendMessage";
    const payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML"
    };

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    Logger.log("📱 Telegram sent | code=" + code);
  } catch (e) {
    Logger.log("❌ Telegram error: " + e.message);
  }
}

// ─────────────────────────────────────────────
//  EMAIL — OUTWARD ALERT
// ─────────────────────────────────────────────
function sendEmailAlert(item, qty, customer) {
  try {
    GmailApp.sendEmail(
      CONFIG.EMAIL,
      "📤 Item OUT: " + item,
      [
        "Namaskar!",
        "",
        "Item OUT hua hai:",
        "👤 Customer : " + customer,
        "📦 Item     : " + item,
        "📉 Qty      : " + qty,
        "🕐 Time     : " + new Date().toLocaleString(),
        "",
        "— Inventory System"
      ].join("\n")
    );
    Logger.log("📧 Outward email sent: " + item);
  } catch (e) {
    Logger.log("❌ Email error: " + e.message);
  }
}

// ─────────────────────────────────────────────
//  EMAIL — LOW STOCK ALERT
// ─────────────────────────────────────────────
function sendLowStockEmail(lowItems) {
  try {
    let body = "Namaskar!\n\nNeeche items ka stock kam ho gaya hai:\n\n";
    lowItems.forEach(r => {
      body += "📦 " + r.item + " → Sirf " + r.stock + " bachi\n";
    });
    body += "\nPlease reorder karo!\n\n— Inventory System";

    GmailApp.sendEmail(
      CONFIG.EMAIL,
      "⚠️ Low Stock Alert — " + lowItems.length + " items",
      body
    );
    Logger.log("📧 Low stock email sent.");
  } catch (e) {
    Logger.log("❌ Low stock email error: " + e.message);
  }
}

// ─────────────────────────────────────────────
//  AUTO REORDER ENTRY IN SHEET
// ─────────────────────────────────────────────
function addReorderEntry(lowItems) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reorderSheet = ss.getSheetByName("REORDER");

    // Create REORDER sheet if not exists
    if (!reorderSheet) {
      reorderSheet = ss.insertSheet("REORDER");
      const header = reorderSheet.getRange(1, 1, 1, 4);
      header.setValues([["DATE", "ITEM", "CURRENT STOCK", "STATUS"]]);
      header.setBackground("#1a1a2e");
      header.setFontColor("#ffffff");
      header.setFontWeight("bold");
      Logger.log("📋 REORDER sheet created.");
    }

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    lowItems.forEach(r => {
      reorderSheet.appendRow([today, r.item, r.stock, "PENDING"]);
    });

    Logger.log("📝 Reorder entries added: " + lowItems.length);
  } catch (e) {
    Logger.log("❌ Reorder entry error: " + e.message);
  }
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function postToAPI(endpoint, payload) {
  try {
    const response = UrlFetchApp.fetch(CONFIG.API_BASE + endpoint, {
      method: "post",
      contentType: "application/json",
      headers: { "x-api-key": CONFIG.API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    const text = response.getContentText();
    return { ok: code >= 200 && code < 300, code, text };
  } catch (e) {
    return { ok: false, code: 0, text: e.message };
  }
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

function showToast(message, title) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, title || "Inventory", 5);
  } catch (e) {}
}

// ─────────────────────────────────────────────
//  TEST TELEGRAM
// ─────────────────────────────────────────────
function testTelegram() {
  sendTelegram("✅ Inventory System connected!\n\nTelegram alerts kaam kar rahe hain! 🎉");
  Logger.log("Test message bheja!");
}

// ─────────────────────────────────────────────
//  RESET
// ─────────────────────────────────────────────
function resetSync() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("✅ Reset Done!");
  showToast("✅ Reset done! Ab sendInventory run karo.", "Reset");
}

// ─────────────────────────────────────────────
//  AUTO TRIGGER — Run once
// ─────────────────────────────────────────────
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sendInventory")
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log("✅ Trigger set! Every 5 minutes.");
  showToast("✅ Auto-trigger set!", "Trigger");
}
