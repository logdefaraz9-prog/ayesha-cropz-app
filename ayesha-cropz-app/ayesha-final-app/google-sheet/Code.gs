/**
 * Ayesha Cropz: live stock, order recording and order tracking for the website and app.
 * Paste this into Extensions > Apps Script of your Google Sheet. See SETUP.md.
 *
 * Sheet tab "Stock":  A = Flavor, B = Bottles in stock, C = Crates in stock (header in row 1, flavors from row 2)
 * Sheet tab "Orders": created automatically. Change the Status column (a dropdown) to update what customers see.
 */
var CONFIG = {
  STOCK_SHEET: 'Stock',
  ORDERS_SHEET: 'Orders',
  PRICES: { bottle: 10, crate: 170 },     // what customers pay (crate offer price; normal price is 240)
  MAX_QTY: { bottle: 240, crate: 20 },    // largest quantity allowed per order
  NOTIFY_EMAIL: ''                        // optional: an email address to notify from Google for each order
};

var STATUSES = ['New order', 'Awaiting payment', 'Paid, please verify in UPI app', 'Confirmed', 'Packed',
                'Out for delivery', 'Ready for pickup', 'Delivered', 'Cancelled'];

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'track') return json_(track_(p));
  return json_({ ok: true, updated: new Date().toISOString(), stock: readStock_() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'paid') return json_(markPaid_(d));
    return json_(placeOrder_(d));
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  } finally {
    lock.releaseLock();
  }
}

/** Runs by itself when you edit the sheet by hand. Stamps the time and returns stock when you set an order to Cancelled. */
function onEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== CONFIG.ORDERS_SHEET || e.range.getColumn() !== 12 || e.range.getRow() < 2) return;
    var row = e.range.getRow();
    sh.getRange(row, 14).setValue(new Date());
    if (String(e.value) === 'Cancelled' && sh.getRange(row, 15).getValue() !== 'yes') {
      var o = sh.getRange(row, 1, 1, 15).getValues()[0];
      var stock = SpreadsheetApp.getActive().getSheetByName(CONFIG.STOCK_SHEET);
      var rows = stock.getRange(2, 1, Math.max(stock.getLastRow() - 1, 1), 3).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toLowerCase() === String(o[6]).trim().toLowerCase()) {
          var col = /^crate/i.test(String(o[7])) ? 3 : 2;
          stock.getRange(i + 2, col).setValue((Number(rows[i][col - 1]) || 0) + Number(o[8]));
          sh.getRange(row, 15).setValue('yes');
          break;
        }
      }
    }
  } catch (err) { /* never block the sheet */ }
}

function readStock_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(CONFIG.STOCK_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  return v.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    return { flavor: String(r[0]).trim(), bottles: Number(r[1]) || 0, crates: Number(r[2]) || 0 };
  });
}

function ordersSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.ORDERS_SHEET);
    sh.appendRow(['Time', 'Order ID', 'Name', 'Phone', 'Delivery or pickup', 'Address', 'Flavor', 'Item', 'Qty', 'Total (INR)',
                  'Payment', 'Status', 'UPI reference', 'Status updated', 'Stock returned']);
    sh.setFrozenRows(1);
    sh.getRange(2, 12, 1000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  }
  return sh;
}

function clean_(s, max) {
  s = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // stop spreadsheet formulas being injected
}

function placeOrder_(d) {
  var type = d.type === 'crate' ? 'crate' : (d.type === 'bottle' ? 'bottle' : null);
  var qty = Math.floor(Number(d.qty));
  var phone = String(d.phone || '').replace(/\D/g, '');
  if (!type || !(qty >= 1) || qty > CONFIG.MAX_QTY[type] || phone.length !== 10 || !String(d.name || '').trim()) {
    return { ok: false, error: 'invalid_order' };
  }
  var sh = SpreadsheetApp.getActive().getSheetByName(CONFIG.STOCK_SHEET);
  var rows = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 3).getValues();
  var rowIndex = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === String(d.flavor || '').trim().toLowerCase()) { rowIndex = i; break; }
  }
  if (rowIndex < 0) return { ok: false, error: 'unknown_flavor' };
  var col = type === 'bottle' ? 2 : 3;                       // sheet column B or C
  var available = Number(rows[rowIndex][col - 1]) || 0;
  if (qty > available) return { ok: false, error: 'out_of_stock', available: available };
  sh.getRange(rowIndex + 2, col).setValue(available - qty);   // take the items out of stock

  var total = CONFIG.PRICES[type] * qty;                      // price is always worked out here, not trusted from the page
  var orders = ordersSheet_();
  var id = 'ORD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + ('000' + orders.getLastRow()).slice(-3);
  var upi = d.payment === 'upi';
  var now = new Date();
  orders.appendRow([
    now, id, clean_(d.name, 80), "'" + phone, clean_(d.mode, 40), clean_(d.address, 300),
    clean_(rows[rowIndex][0], 60), type === 'crate' ? 'Crate (24 x 300 ml)' : 'Bottle (300 ml)', qty, total,
    upi ? 'UPI' : 'Pay on delivery or pickup', upi ? 'Awaiting payment' : 'New order', '', now, ''
  ]);
  if (CONFIG.NOTIFY_EMAIL) {
    MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, 'New order ' + id,
      clean_(d.name, 80) + ' (' + phone + ')\n' + rows[rowIndex][0] + ', ' + type + ' x ' + qty + '\nTotal INR ' + total + '\n' + (upi ? 'UPI, awaiting payment' : 'Pay on delivery or pickup'));
  }
  return { ok: true, orderId: id, total: total };
}

function markPaid_(d) {
  var orders = ordersSheet_();
  var id = String(d.orderId || '');
  if (!id || orders.getLastRow() < 2) return { ok: false, error: 'not_found' };
  var ids = orders.getRange(2, 2, orders.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      orders.getRange(i + 2, 12).setValue('Paid, please verify in UPI app');
      orders.getRange(i + 2, 13).setValue(clean_(d.ref, 40));
      orders.getRange(i + 2, 14).setValue(new Date());
      return { ok: true };
    }
  }
  return { ok: false, error: 'not_found' };
}

/** Order tracking: needs BOTH the order ID and the phone number. Never returns the name or address. */
function track_(p) {
  var id = String(p.id || '').trim().toLowerCase();
  var ph = String(p.phone || '').replace(/\D/g, '').slice(-10);
  var sh = ordersSheet_();
  if (!id || ph.length !== 10 || sh.getLastRow() < 2) return { ok: false, error: 'not_found' };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    var r = v[i];
    if (String(r[1]).trim().toLowerCase() === id && String(r[3]).replace(/\D/g, '').slice(-10) === ph) {
      return { ok: true, order: {
        id: r[1], status: String(r[11]), flavor: r[6], item: r[7], qty: r[8], total: r[9], payment: r[10], mode: r[4],
        placed: new Date(r[0]).toISOString(), updated: new Date(r[13] || r[0]).toISOString()
      } };
    }
  }
  return { ok: false, error: 'not_found' };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
