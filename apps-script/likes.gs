/**
 * theznprojects - megaZN Likes backend
 * ------------------------------------------------------------------
 * Google Apps Script Web App backing per-post like counts, stored in
 * a Google Sheet. Reads and writes both go through doGet + JSONP so
 * the browser on theznprojects.com can call it cross-origin without
 * CORS headers (Apps Script Web Apps don't send them).
 *
 * SETUP
 *  1. In the Google Sheet, create a tab named exactly: Likes
 *     Row 1 headers:  A1 = slug   B1 = count
 *  2. Extensions > Apps Script, paste this file, Save.
 *  3. Deploy > New deployment > Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Deploy, authorize, and copy the /exec Web app URL.
 *
 * ENDPOINTS (all GET, all JSONP via &callback=)
 *   ?action=likes&slug=<slug>&callback=cb   -> current count (read only)
 *   ?action=like&slug=<slug>&callback=cb    -> increment, return new count
 *
 * Comments are intentionally not implemented yet (parked); this file
 * is structured so a Comments tab + actions can be added later.
 */

var LIKES_TAB = 'Likes';

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || '').toLowerCase();
  var slug = normalizeSlug_(p.slug);
  var out;

  try {
    if (action === 'likes') {
      out = { ok: true, slug: slug, likes: getLikes_(slug) };
    } else if (action === 'like') {
      out = { ok: true, slug: slug, likes: incrementLike_(slug) };
    } else {
      out = { ok: false, error: 'unknown action' };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }

  return respond_(out, p.callback);
}

/* ---------- data ---------- */

function likesSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LIKES_TAB);
}

function normalizeSlug_(slug) {
  // Keep it tight: lowercase, only a-z 0-9 and hyphens. Stops junk keys.
  return String(slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120);
}

function findSlugRow_(sh, slug) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var values = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === slug) return i + 2;
  }
  return -1;
}

function getLikes_(slug) {
  if (!slug) return 0;
  var sh = likesSheet_();
  var row = findSlugRow_(sh, slug);
  if (row === -1) return 0;
  return Number(sh.getRange(row, 2).getValue()) || 0;
}

function incrementLike_(slug) {
  if (!slug) return 0;
  var sh = likesSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000); // serialize concurrent likes so counts never clash
  try {
    var row = findSlugRow_(sh, slug);
    if (row === -1) {
      sh.appendRow([slug, 1]);
      return 1;
    }
    var n = (Number(sh.getRange(row, 2).getValue()) || 0) + 1;
    sh.getRange(row, 2).setValue(n);
    return n;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- response ---------- */

function respond_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
