# RichGene Clothing

A shop website with two sides:

- **Public side** (`index.html`): anyone can browse items, then tap **Order on WhatsApp** or **Ask a question**. The order opens in your WhatsApp with all the details filled in. You send your payment details in the chat.
- **Admin side** (`admin.html`): only you can sign in. Post items with photos, mark things sold out, see orders, change your WhatsApp number.

Hosting is free: GitHub Pages serves the pages, and Firebase stores the items and your login.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The public shop page |
| `shop.js` | Public shop logic (browse, order, WhatsApp link) |
| `admin.html` | The owner login and dashboard page |
| `admin.js` | Admin logic (login, items, orders, settings) |
| `common.js` | Helpers shared by both pages |
| `style.css` | Colours and layout for both pages |
| `config.js` | **The one file you edit** (Firebase keys, owner email, defaults) |
| `firestore.rules` | Security rules. These are what keep the admin owner-only |

## Setup, step by step

### Step 1. Create the Firebase project (5 minutes)
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project**, name it (for example `nyame-tease-shop`), skip Google Analytics, click **Create project**.

### Step 2. Connect the website to Firebase
1. On the project home page click the web icon `</>` (Add app).
2. Name it `shop`. Do not tick Firebase Hosting. Click **Register app**.
3. Firebase shows a block of code called `firebaseConfig`. Copy each value into `config.js` where it says `PASTE_...`.

### Step 3. Turn on the database
1. Left menu: **Build > Firestore Database > Create database**.
2. Pick the location nearest Ghana that is offered (for example `africa-south1`, or a Europe one).
3. Choose **Start in production mode**, then **Create**.

### Step 4. Create your owner login
1. Left menu: **Build > Authentication > Get started**.
2. Open **Sign-in method**, choose **Email/Password**, switch on the first toggle, **Save**.
3. Open the **Users** tab, click **Add user**, enter your email and a strong password. This is how you will sign in to `admin.html`. Nobody else gets an account.

### Step 5. Lock the database to you
1. Go back to **Firestore Database > Rules**.
2. Delete what is there and paste the whole of `firestore.rules`.
3. Change `owner@example.com` to your email from Step 4 (lowercase).
4. Click **Publish**.

### Step 6. Edit `config.js`
- `OWNER_EMAIL`: the same email as Step 4.
- `DEFAULTS.whatsapp`: your WhatsApp number, for example `0241234567`.
- `DEFAULTS.shopName`, `tagline`, `pickupAddress`: set what you like. You can change these later in the admin Settings tab.

### Step 7. Put the files on GitHub
1. Create an account at https://github.com if you do not have one.
2. Click **New repository**, name it (for example `shop`), set it to **Public**, tick **Add a README file**, click **Create repository**.
3. Click **Add file > Upload files**, drag in all the files from this folder (not the folder itself, the files inside it), and click **Commit changes**.

### Step 8. Publish the site
1. In the repository open **Settings > Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, click **Save**.
3. Wait one or two minutes. The page shows your address: `https://YOUR-USERNAME.github.io/shop/`.

### Step 9. Allow your site address in Firebase
1. In Firebase: **Authentication > Settings > Authorized domains > Add domain**.
2. Add `YOUR-USERNAME.github.io` (just the domain, no `https://`, no `/shop`).

### Step 10. Add your first items
1. Open `https://YOUR-USERNAME.github.io/shop/admin.html` and sign in.
2. Check the **Settings** tab (WhatsApp number, MoMo number, address) and save.
3. Open the **Items** tab, tap **Add an item**, add photos, name, price, delivery and pick-up options, and post.
4. Open the shop page on your phone and place a test order. WhatsApp should open with the message ready.

### Step 11. Share it
Put the shop link in your WhatsApp status, Facebook page and on the shop door.

## How an order works
1. The buyer picks an item and taps **Order on WhatsApp**, chooses delivery or pick-up and sends.
2. The message arrives in your WhatsApp. A copy also appears in the admin **Orders** tab.
3. You check the price and stock, then tap **Reply on WhatsApp** in the admin to send your payment details.
4. After payment, set the order to **Paid**, then **Delivered / collected**.

The price in an order is copied from the item when the buyer sends it. Always check it in the chat before the buyer pays.

## Good to know
- **Photos** are shrunk and stored inside Firebase. Up to 4 per item.
- **Free limits** (Firebase Spark plan) are far above what a shop this size needs.
- **Opening the files by double-clicking** will not work, because browsers block this kind of script from local files. Use the GitHub address, or run `python -m http.server` in this folder and open `http://localhost:8000`. For local testing, also add `localhost` to Firebase Authorized domains.
- **Admin security** comes from the rules in Step 5, not from hiding the admin page. Keep your password private and do not reuse it.
- **Custom domain** (for example `nyametease.com`): add it in GitHub Pages settings, then add it in Firebase Authorized domains.

## Possible next steps
- Add a custom domain.
- Add Paystack or Flutterwave for in-site MoMo and card payments.
- Add an automatic WhatsApp Business greeting message. 
