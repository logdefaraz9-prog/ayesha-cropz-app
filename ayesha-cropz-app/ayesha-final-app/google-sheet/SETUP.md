# Live stock + online ordering with Google Sheets

This connects the app and website to a Google Sheet. When you change the stock numbers in the sheet, customers see "In stock", "Only a few left" or "Out of stock" within a minute. Every order is saved in the sheet and taken out of stock automatically.

## 1. Make the sheet
1. Go to sheets.google.com and create a new spreadsheet. Name it "Ayesha Cropz Stock".
2. Rename the first tab to **Stock** (exactly).
3. Import `stock-template.csv` into it (File > Import > Upload > "Replace current sheet"), or type the same five rows: Flavor, Bottles, Crates.
4. Type your real stock numbers under Bottles and Crates. The flavor names must stay exactly as they are.

## 2. Add the script
1. In the sheet, open **Extensions > Apps Script**.
2. Delete the sample code and paste in everything from `Code.gs`. Click **Save**.
3. Optional: put your email in `NOTIFY_EMAIL` near the top if you want Google to email you each order.
4. Click **Deploy > New deployment**. Choose the gear icon > **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**. Google asks you to allow access: choose your account, then **Advanced > Go to project (unsafe) > Allow**. This is normal for your own script.
6. Copy the **Web app URL** (it ends in `/exec`).

## 3. Connect the app
1. Open `www/index.html` and find the lines `var ORDER_ENDPOINT=''` and `var UPI_ID=''`.
2. Paste the Web app URL between the first quotes, and your business UPI ID (for example `ayeshacropz@okhdfcbank`) between the second quotes.
3. Commit the change on GitHub. The app rebuilds. Upload the same file to your website hosting too.

## Daily use
- Change the numbers in the **Stock** tab whenever stock arrives or runs out. Zero means "Out of stock". Five or fewer shows "Only N left".
- New orders appear in the **Orders** tab. UPI orders show "Awaiting payment", then "Paid, please verify in UPI app" once the customer taps "I have paid". Always check your UPI app or bank before dispatching.
- If you change prices, edit `PRICES` in `Code.gs` and in `www/index.html` (search for `PRICE=`), then **Deploy > Manage deployments > Edit > New version**.

## Order tracking
Customers open **Track your order** and enter their order ID and mobile number. They see a progress line: Order placed, Confirmed, Packed, On the way (or Ready for pickup), Delivered.
- You control it from the **Orders** tab. Click the **Status** cell of an order and pick a new value from the dropdown. The customer sees it within a minute.
- Suggested flow: New order (or Awaiting payment), Confirmed, Packed, Out for delivery (or Ready for pickup), Delivered.
- Choosing **Cancelled** puts the quantity back into the Stock tab automatically (once).
- Tracking needs both the order ID and the phone number, and it never shows the customer's name or address.
- After pasting the updated `Code.gs`, deploy a new version: **Deploy > Manage deployments > Edit > New version**.

## Good to know
- Orders reserve stock straight away. If a UPI customer never pays, add the quantity back in the Stock tab and mark the order cancelled.
- Customers can only order one flavor and one item type per order.
- UPI links do not confirm payment automatically. For automatic confirmation you need a payment gateway account (for example Razorpay or Cashfree) and a small server, which can be added later.
