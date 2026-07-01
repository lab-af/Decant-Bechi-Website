# Ador Perfumes — Price List Site

A perfume price-list site with per-size pricing, a cart, Dhaka/outside-Dhaka
delivery charges, and an order summary you can send on WhatsApp or copy to
paste anywhere (Messenger, SMS, etc).

## Files

```
fragranza-clone/
├── index.html     structure of the page
├── styles.css     all visual styling
├── script.js      product data + cart + order logic
└── README.md      this file
```

## Run it locally in VS Code

1. Open the `fragranza-clone` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
4. The site opens in your browser and updates live as you edit.

(Or just double-click `index.html` — it works with no server, but Live
Server gives you auto-refresh while you edit.)

## Put in your own perfumes

Open `script.js` and edit the `PRODUCTS` array near the top:

```js
{
  id: "p1",                 // unique, no spaces
  name: "Bleu Intense",
  brand: "Chanel",
  gender: "male",           // "male" | "female" | "unisex"
  notes: "Citrus, Woody, Amber",
  status: "available",      // "available" | "sale" | "out"
  sizes: [
    { ml: 2,  price: 350 },
    { ml: 5,  price: 750 },
    { ml: 10, price: 1400 },
    { ml: 30, price: 3600 }
  ]
}
```

To put an item on sale, add `salePrice` to any size:

```js
{ ml: 5, price: 680, salePrice: 560 }
```

The original price shows with a strikethrough next to the sale price.

Set `status: "out"` to grey the whole card out and disable its size buttons.

## Set your delivery charges

Near the top of `script.js`:

```js
const DELIVERY_CHARGE = {
  inside: 70,
  outside: 130
};
```

## Connect "Send Order to Our Page" (Facebook Messenger)

Still near the top of `script.js`:

```js
const FB_PAGE_USERNAME = "YourPageUsername";
```

Replace with your Facebook Page's username — the part after `facebook.com/`
in your Page's web address. You can find or set it under
**Page Settings → Username**.

Clicking **Send Order to Our Page** opens Messenger (the app on mobile,
messenger.com in browser on desktop) in a chat with your Page, with the
full order text already typed into the message box — items, sizes,
quantities, delivery method, total, and the customer's name/phone/address
if they filled those in. The customer just has to tap **Send**.

**One limitation to know about:** the pre-filled text only appears if the
person is logged into Facebook/Messenger in that browser or app. If they
aren't logged in, the link still opens your Page's Messenger chat, but they
may need to log in first and the text box can come up empty — that's a
Facebook/Meta restriction, not something this site controls. This is also
why the **Copy Order Summary** button exists as a reliable fallback: it
always works, regardless of login state, and the customer can paste the
order into any chat manually.

## "Copy Order Summary"

This button copies the same order text to the clipboard using
`navigator.clipboard`, so the customer can paste it into Messenger,
SMS, email, or anywhere else. It has a fallback for older browsers.

## Cart persistence

The cart is saved to the browser's `localStorage`, so if someone closes
the tab and comes back, their selections are still there. Clearing it
happens automatically when they remove all items.

## Customizing the look

All colors, fonts, and spacing are defined as CSS variables at the top of
`styles.css` under `:root`. Change `--amber`, `--ink`, `--cream`, etc. to
re-theme the whole site without touching the rest of the file.

The small vertical "vial" gauge that appears on each size button is
generated automatically — its fill height is proportional to that size's
ml relative to the largest size the perfume comes in, so bigger bottles
visibly show a fuller vial.

## Deploying it (free) with GitHub Pages

1. Create a new GitHub repository and push these files to it.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. Your site will be live at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

That's the same way the reference site (Fragranza) is hosted.
