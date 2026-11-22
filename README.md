# Landing Page Lead Capture

A lightweight landing page template that saves every enquiry to **Google Sheets** and can forward it to **Salesforce**, any **CRM webhook** (for example Sell.Do, Zapier or Make) and your **email inbox**. No server, no monthly fees: the backend is a free Google Apps Script.

This is the same pattern I use on real-estate and business landing pages, where every lead must reach the sales team's CRM instantly.

## Features

- **Responsive landing page** in plain HTML, CSS and JavaScript. No framework, no build step.
- **Google Sheets as the database.** Each lead becomes a row with a timestamp.
- **Optional CRM forwarding:**
  - Salesforce Web-to-Lead (just add your org ID)
  - Any JSON webhook: Sell.Do lead API, Zapier, Make or your own endpoint
  - Email notification for every new lead
- **UTM tracking.** `utm_source`, `utm_medium`, `utm_campaign` and the page URL are saved with each lead, so you know which ad worked.
- **Spam protection** with a hidden honeypot field.
- **Validation** on both the page and the server (name, plus a valid email or phone).
- **Safe Sheets writes.** Values starting with `= + - @` are escaped, which blocks spreadsheet formula injection.
- **WhatsApp fallback link** for visitors who prefer to chat.

## How it works

```
Visitor fills the form ─▶ index.html (fetch POST)
                              │
                              ▼
               Google Apps Script Web app (Code.gs)
                 ├─▶ Google Sheet: "Leads" tab
                 ├─▶ Salesforce Web-to-Lead   (optional)
                 ├─▶ CRM webhook, e.g. Sell.Do (optional)
                 └─▶ Email notification       (optional)
```

## Setup (about 10 minutes)

1. **Create the sheet.** Make a new Google Sheet, then open **Extensions → Apps Script**.
2. **Add the backend.** Replace the default code with [`apps-script/Code.gs`](apps-script/Code.gs). Fill in `CONFIG` at the top if you want CRM forwarding or email alerts.
3. **Deploy.** Click **Deploy → New deployment → Web app**. Set *Execute as: Me* and *Who has access: Anyone*, then authorise and copy the Web app URL.
4. **Connect the page.** In [`index.html`](index.html), paste the URL into `ENDPOINT` and set your `WHATSAPP_NUMBER`.
5. **Publish.** Host `index.html` anywhere: GitHub Pages, Netlify, cPanel or a WordPress custom HTML block.

Submit a test lead. A **Leads** tab with headers appears in your sheet automatically.

### Optional: Salesforce

Set `SALESFORCE_OID` to your Salesforce organisation ID (Setup → Company Information). Leads are posted to Salesforce Web-to-Lead with name, email, phone, the message and the page URL.

### Optional: Sell.Do or any other CRM

Set `CRM_WEBHOOK_URL` to an endpoint that accepts a JSON POST. Every lead is sent as:

```json
{
  "timestamp": "2026-01-01T10:00:00.000Z",
  "name": "Ravi Kumar",
  "email": "ravi@example.com",
  "phone": "+971 50 123 4567",
  "message": "Interested in a site visit",
  "project": "3 BHK",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "launch",
  "page_url": "https://example.com/?utm_source=google"
}
```

If your CRM expects different field names, map them in `sendToWebhook_()`.

## Project structure

```
├── index.html          # Landing page and form (HTML, CSS, JS)
└── apps-script/
    └── Code.gs         # Google Apps Script backend
```

## Tech

HTML5 · CSS · Vanilla JavaScript · Google Apps Script · Google Sheets · Salesforce Web-to-Lead

## License

MIT. Free to use for client and personal projects.

---

Built by **Vinay Prasad M**, web developer in Dubai · [Portfolio](https://vinayprasadm-portfolio.framer.website/) · [LinkedIn](https://www.linkedin.com/in/vinay-prasad-m)
