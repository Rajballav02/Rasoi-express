# Rasoi Express — Ab Database + CRUD ke saath 🎉

Aapki original website (design, UI, cart, checkout — sab **same** hai) ab
ek **real SQLite database** se chal rahi hai, aur menu items/categories ko
**Create, Read, Update, Delete (CRUD)** karne ke liye ek Admin Panel bhi
add kar diya gaya hai.

## 🆕 Ab ye ek "real" website hai

Pehle checkout/contact/newsletter forms sirf ek "Thank you" toast dikhate
the aur data kahin save nahi hota tha. Ab ye **sab real backend se juda
hai**:

- **Checkout** → order database me save hota hai, ek real **Order ID** milta hai, aur ek confirmation popup dikhta hai.
- **Contact form** → message database me save hota hai, admin panel me dikhता hai.
- **Newsletter** → email database me subscribe hoti hai (duplicate bhi handle hoti hai).
- **Admin Panel** me 3 naye tabs: **Orders** (status update: Pending → Preparing → Out for Delivery → Delivered/Cancelled, order detail popup, delete), **Messages** (read/unread, delete), **Subscribers** (list, remove).

## 📧📱 Email (Nodemailer) + SMS (Twilio) Notifications

Ab jab koi order place karta hai, use **real SMS aapke phone pe aata hai**
(order confirmation + jab bhi admin status update kare — "Preparing",
"Out for Delivery" etc.), aur agar customer ne email di hai to **email
confirmation bhi** jaata hai (Nodemailer se). Contact form bharne par
admin ko bhi email notification milta hai (agar `ADMIN_EMAIL` set hai).

**Zaroori baat**: Agar aap `.env` file set nahi karte, to app crash
nahi hogi — SMS/email bas terminal console me print ho jayenge (dev
mode), taaki bina kisi paid account ke bhi test kar sakein.

### Setup (asli SMS/Email bhejne ke liye)

1. `.env.example` ko copy karke `.env` banayein:
   ```bash
   cp .env.example .env
   ```
2. **Email (Gmail ka use karte hue)**:
   - Google Account → Security → 2-Step Verification ON karein.
   - https://myaccount.google.com/apppasswords par jaake ek **App Password** banayein.
   - `.env` me `SMTP_USER` (aapka Gmail) aur `SMTP_PASS` (16-character app password) bharein.
   - `ADMIN_EMAIL` me apna email daalein — har naya order/message yahan bhi aayega.
3. **SMS (Twilio)**:
   - https://www.twilio.com/try-twilio par free trial account banayein.
   - Twilio Console se `Account SID`, `Auth Token`, aur trial phone number milega.
   - `.env` me `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` bharein.
   - **Note**: Twilio trial account me sirf un numbers par SMS jaata hai jo aapne Twilio console me *verify* kiye hon. Live sabko bhejne ke liye account upgrade (paid) karna hoga.
4. Server restart karein — startup log me confirm hoga:
   ```
   Email (Nodemailer)   → configured ✅
   SMS (Twilio)         → configured ✅
   ```

### Konsa event kya bhejta hai
| Event | SMS | Email |
|---|---|---|
| Order place hua | ✅ Customer ko | ✅ Customer ko (agar email di ho) + ✅ Admin ko |
| Order status update hua (admin) | ✅ Customer ko | ✅ Customer ko (agar email di ho) |
| Contact form submit hua | — | ✅ Admin ko |

## Kya naya add hua hai

- **Database**: SQLite (file: `db/rasoi.db`), do tables — `categories` aur `menu_items`.
  Engine ke roop me Node.js ka **built-in `node:sqlite` module** use ho raha hai —
  isme koi native/C++ compilation nahi lagti, isliye Node.js v24 par
  Visual Studio Build Tools ke bina bhi seedha `npm install` chal jata hai.
- **Backend server**: Node.js + Express (`server.js`), jo:
  - static website serve karta hai (`public/` folder)
  - CRUD REST API expose karta hai
- **Admin Panel**: `admin.html` — yahan se aap menu items aur categories
  add / edit / delete kar sakte ho, bina code chhue.
- **Frontend**: `index.html` ab hardcoded arrays ki jagah API se data
  fetch karta hai (`loadAppData()`), baaki UI/logic **bilkul same** hai.

## 🚀 3 Naye Functions (fully working, demo nahi)

1. **⭐ Ratings & Reviews** — har dish ke "Quick View" popup me customers
   apna naam, star rating (1-5) aur comment ke saath review de sakte hain.
   Average rating turant calculate hoke dikhta hai. Admin panel ke **Reviews**
   tab se spam/galat review delete ki ja sakti hai.
2. **🎟️ Coupon Codes** — Checkout page par coupon box hai. 3 ready-made
   codes seed kiye hue hain: `WELCOME10` (10% off), `RASOI20` (20% off, min
   order ₹499), `FLAT50` (5% off, min order ₹300). Admin panel ke **Coupons**
   tab se naye code bana/edit/delete kar sakte ho.
3. **📦 Order Tracking** — Navbar me "Track Order" link se ek dedicated page
   khulta hai jahan Order ID + phone number daal kar order ka live status
   (Pending → Preparing → Out for Delivery → Delivered) ek timeline me dikhta
   hai. Security ke liye phone number match karna zaroori hai, warna order
   nahi dikhega.

## Chalane ka tarika (Setup)

```bash
npm install       # dependencies install karega (Express, SQLite, CORS)
npm start         # server start karega
```

Fir browser me kholein:

- Website: **http://localhost:3000**
- Admin Panel: **http://localhost:3000/admin.html**

Pehli baar chalane par database khud-b-khud ban jayega aur original
49 menu items + 8 categories seed ho jayenge.

## Folder Structure

```
rasoi-express/
├── server.js              # Express server (entry point)
├── .env.example           # copy to .env and fill in SMTP/Twilio credentials
├── db/
│   ├── database.js        # SQLite schema + auto-seed + migrations
│   ├── seed-categories.json
│   ├── seed-menu-items.json
│   └── rasoi.db           # (auto-created on first run)
├── routes/
│   ├── categories.js      # CRUD API: /api/categories
│   ├── menuItems.js       # CRUD API: /api/menu-items
│   ├── orders.js          # CRUD API: /api/orders (+ triggers notifications, + /track/:id)
│   ├── contact.js         # CRUD API: /api/contact (+ triggers admin email)
│   ├── newsletter.js      # CRUD API: /api/newsletter
│   ├── reviews.js         # CRUD API: /api/reviews (ratings & reviews per dish)
│   └── coupons.js         # CRUD API: /api/coupons (+ /apply for checkout)
├── services/
│   ├── email.js           # Nodemailer wrapper (console fallback if unconfigured)
│   ├── sms.js              # Twilio wrapper (console fallback if unconfigured)
│   └── notify.js           # composes order/contact email+SMS messages
└── public/
    ├── index.html         # main site (unchanged design, now API-driven)
    ├── style.css
    ├── admin.html          # CRUD admin panel
    └── admin.js
```

## CRUD API Reference

### Categories — `/api/categories`
| Method | Endpoint              | Kaam                      |
|--------|-----------------------|---------------------------|
| GET    | `/api/categories`     | Saari categories dikhaye  |
| GET    | `/api/categories/:id` | Ek category dikhaye       |
| POST   | `/api/categories`     | Nayi category banaye      |
| PUT    | `/api/categories/:id` | Category update kare      |
| DELETE | `/api/categories/:id` | Category delete kare *(sirf tab jab uski category ka koi item na ho)* |

### Menu Items — `/api/menu-items`
| Method | Endpoint                | Kaam                                     |
|--------|--------------------------|-------------------------------------------|
| GET    | `/api/menu-items`        | Saare items (`?category=` & `?search=` filter supported) |
| GET    | `/api/menu-items/:id`    | Ek item dikhaye                           |
| POST   | `/api/menu-items`        | Naya item add kare                        |
| PUT    | `/api/menu-items/:id`    | Item update kare                          |
| DELETE | `/api/menu-items/:id`    | Item delete kare                          |

Example (curl):
```bash
curl -X POST http://localhost:3000/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{"name":"Tandoori Momos","category":"starters","veg":true,"price":179,"rating":4.5,"desc":"Steamed momos, tandoor-charred."}'
```

### Orders — `/api/orders`
| Method | Endpoint           | Kaam                                               |
|--------|--------------------|-----------------------------------------------------|
| GET    | `/api/orders`      | Saare orders (`?status=Pending` se filter bhi)      |
| GET    | `/api/orders/:id`  | Ek order dekhein                                    |
| POST   | `/api/orders`      | Naya order place karein (checkout se automatic)     |
| PUT    | `/api/orders/:id`  | Status update karein (admin)                        |
| DELETE | `/api/orders/:id`  | Order record delete karein (admin)                  |

### Contact Messages — `/api/contact`
| Method | Endpoint            | Kaam                             |
|--------|----------------------|-----------------------------------|
| GET    | `/api/contact`       | Saare messages (admin)           |
| POST   | `/api/contact`       | Naya message submit karein       |
| PUT    | `/api/contact/:id`   | Read/unread mark karein (admin)  |
| DELETE | `/api/contact/:id`   | Message delete karein (admin)    |

### Newsletter — `/api/newsletter`
| Method | Endpoint               | Kaam                          |
|--------|-------------------------|---------------------------------|
| GET    | `/api/newsletter`       | Saare subscribers (admin)     |
| POST   | `/api/newsletter`       | Subscribe karein               |
| DELETE | `/api/newsletter/:id`   | Unsubscribe karein (admin)    |

### Reviews — `/api/reviews`
| Method | Endpoint                          | Kaam                                      |
|--------|-----------------------------------|--------------------------------------------|
| GET    | `/api/reviews?menuItemId=5`       | Ek dish ke reviews + average rating        |
| GET    | `/api/reviews`                    | Saare reviews (admin moderation)           |
| POST   | `/api/reviews`                    | Naya review submit karein                  |
| DELETE | `/api/reviews/:id`                | Review delete karein (admin)               |

### Coupons — `/api/coupons`
| Method | Endpoint                | Kaam                                              |
|--------|--------------------------|----------------------------------------------------|
| GET    | `/api/coupons`           | Saare coupons (admin)                              |
| POST   | `/api/coupons/apply`     | Checkout par coupon validate + discount nikaalein  |
| POST   | `/api/coupons`           | Naya coupon banaye (admin)                         |
| PUT    | `/api/coupons/:code`     | Coupon update karein (admin)                       |
| DELETE | `/api/coupons/:code`     | Coupon delete karein (admin)                       |

### Order Tracking — `/api/orders/track/:id`
| Method | Endpoint                               | Kaam                                         |
|--------|------------------------------------------|-----------------------------------------------|
| GET    | `/api/orders/track/:id?phone=98765...`   | Order ID + phone match ho tabhi order dikhega |

## Note
- `db/rasoi.db` file me hi aapka saara data persist hota hai — server restart
  karne par data delete nahi hoga.
