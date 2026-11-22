/**
 * Landing Page Lead Capture: Google Apps Script backend
 *
 * Receives form submissions from index.html, saves each lead to a Google Sheet,
 * and can optionally forward it to Salesforce (Web-to-Lead), any CRM webhook
 * (for example Sell.Do, Zapier or Make) and an email inbox.
 *
 * Setup: see README.md. Deploy as a Web app ("Execute as: Me", "Who has access: Anyone").
 */

const CONFIG = {
  SHEET_NAME: 'Leads',
  NOTIFY_EMAIL: '',        // Optional: email address that gets a message for every new lead
  SALESFORCE_OID: '',      // Optional: your Salesforce org ID for Web-to-Lead
  CRM_WEBHOOK_URL: '',     // Optional: any endpoint that accepts a JSON POST (Sell.Do lead API, Zapier, Make...)
  DEFAULT_COMPANY: 'Website lead', // Salesforce requires a company; used when the form has none
};

const COLUMNS = [
  'timestamp', 'name', 'email', 'phone', 'message', 'project',
  'utm_source', 'utm_medium', 'utm_campaign', 'page_url',
];

/** Entry point for POST requests from the landing page. */
function doPost(e) {
  try {
    const data = parseBody_(e);

    // Honeypot: real visitors never fill the hidden "website" field.
    if (data.website) return json_({ ok: true });

    const errors = validate_(data);
    if (errors.length) return json_({ ok: false, errors: errors });

    const lead = normalise_(data);
    const results = { sheet: appendToSheet_(lead) };

    if (CONFIG.SALESFORCE_OID) results.salesforce = sendToSalesforce_(lead);
    if (CONFIG.CRM_WEBHOOK_URL) results.webhook = sendToWebhook_(lead);
    if (CONFIG.NOTIFY_EMAIL) results.email = notify_(lead);

    return json_({ ok: true, results: results });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, errors: ['Something went wrong. Please try again.'] });
  }
}

/** Simple health check, so you can open the Web app URL in a browser. */
function doGet() {
  return json_({ ok: true, service: 'landing-page-lead-capture' });
}

function parseBody_(e) {
  if (!e) return {};
  const type = (e.postData && e.postData.type) || '';
  if (type.indexOf('application/json') === 0) return JSON.parse(e.postData.contents || '{}');
  return e.parameter || {};
}

function validate_(data) {
  const errors = [];
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const phoneDigits = String(data.phone || '').replace(/\D/g, '');

  if (name.length < 2) errors.push('Please enter your name.');
  if (!email && !phoneDigits) errors.push('Please enter an email or phone number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email.');
  if (phoneDigits && (phoneDigits.length < 7 || phoneDigits.length > 15)) errors.push('Please enter a valid phone number.');
  return errors;
}

function normalise_(data) {
  const lead = { timestamp: new Date().toISOString() };
  COLUMNS.slice(1).forEach(function (key) {
    lead[key] = String(data[key] || '').trim().slice(0, 2000);
  });
  return lead;
}

/** Stops spreadsheet formula injection (values starting with = + - @). */
function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function appendToSheet_(lead) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      sheet.appendRow(COLUMNS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(COLUMNS.map(function (key) { return safeCell_(lead[key] || ''); }));
    return 'ok';
  } finally {
    lock.releaseLock();
  }
}

function splitName_(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** Salesforce Web-to-Lead. Salesforce requires last_name and company. */
function sendToSalesforce_(lead) {
  const name = splitName_(lead.name);
  const response = UrlFetchApp.fetch('https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8', {
    method: 'post',
    payload: {
      oid: CONFIG.SALESFORCE_OID,
      first_name: name.first,
      last_name: name.last,
      email: lead.email,
      phone: lead.phone,
      company: CONFIG.DEFAULT_COMPANY,
      lead_source: 'Website',
      description: [lead.message, lead.project && 'Project: ' + lead.project, lead.page_url && 'Page: ' + lead.page_url]
        .filter(Boolean).join('\n'),
    },
    muteHttpExceptions: true,
  });
  return response.getResponseCode();
}

/** Generic JSON webhook, for Sell.Do, Zapier, Make or your own API. */
function sendToWebhook_(lead) {
  const response = UrlFetchApp.fetch(CONFIG.CRM_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(lead),
    muteHttpExceptions: true,
  });
  return response.getResponseCode();
}

function notify_(lead) {
  const body = COLUMNS.map(function (key) { return key + ': ' + (lead[key] || '-'); }).join('\n');
  MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, 'New lead: ' + lead.name, body);
  return 'sent';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
