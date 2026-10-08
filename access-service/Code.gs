const ADMIN_EMAIL = 'jordan.b.lane84@gmail.com';
const SITE_URL = 'https://jordylane.github.io/cursor-test/';

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'decide';

  try {
    if (action === 'request') {
      return jsonp(params, handleRequest(params));
    }
    if (action === 'validate') {
      return jsonp(params, handleValidate(params));
    }
    return handleDecide(params);
  } catch (error) {
    if (action === 'decide') {
      return page('Something went wrong', escapeHtml(String(error)));
    }
    return jsonp(params, { ok: false, error: String(error) });
  }
}

function handleRequest(params) {
  const name = clean(params.name, 80);
  const email = clean(params.email, 120).toLowerCase();

  if (!name) {
    return { ok: false, error: 'Name is required.' };
  }
  if (!isEmail(email)) {
    return { ok: false, error: 'A valid email is required.' };
  }

  const token = Utilities.getUuid();
  const store = PropertiesService.getScriptProperties();
  store.setProperty(
    'req_' + token,
    JSON.stringify({
      name: name,
      email: email,
      status: 'pending',
      createdAt: Date.now(),
    })
  );

  const decideBase = ScriptApp.getService().getUrl();
  const acceptUrl = decideBase + '?action=decide&decision=accept&token=' + encodeURIComponent(token);
  const denyUrl = decideBase + '?action=decide&decision=deny&token=' + encodeURIComponent(token);

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: 'Access request from ' + name,
    htmlBody:
      '<div style="font-family:Georgia,serif;line-height:1.5;color:#111">' +
      '<p>Someone requested access to the Hello World site.</p>' +
      '<p><strong>Name:</strong> ' +
      escapeHtml(name) +
      '<br><strong>Email:</strong> ' +
      escapeHtml(email) +
      '</p>' +
      '<p>' +
      button(acceptUrl, 'Accept access', '#1f7a46') +
      '&nbsp;&nbsp;' +
      button(denyUrl, 'Deny access', '#a33131') +
      '</p>' +
      '<p style="color:#555;font-size:13px">These links only work for this request.</p>' +
      '</div>',
  });

  return { ok: true };
}

function handleDecide(params) {
  const token = clean(params.token, 80);
  const decision = clean(params.decision, 16).toLowerCase();
  const store = PropertiesService.getScriptProperties();
  const raw = store.getProperty('req_' + token);

  if (!raw) {
    return page('Request not found', 'This accept/deny link is invalid or has already been used.');
  }

  const request = JSON.parse(raw);
  if (request.status !== 'pending') {
    return page(
      'Already handled',
      'You already ' + escapeHtml(request.status) + ' access for ' + escapeHtml(request.name) + '.'
    );
  }

  if (decision === 'accept') {
    const accessKey = Utilities.getUuid();
    request.status = 'accepted';
    request.accessKey = accessKey;
    store.setProperty('req_' + token, JSON.stringify(request));
    store.setProperty(
      'key_' + accessKey,
      JSON.stringify({ email: request.email, name: request.name })
    );

    const accessUrl = SITE_URL + '?access=' + encodeURIComponent(accessKey);
    MailApp.sendEmail({
      to: request.email,
      subject: 'Your access was approved',
      htmlBody:
        '<div style="font-family:Georgia,serif;line-height:1.5;color:#111">' +
        '<p>Hi ' +
        escapeHtml(request.name) +
        ',</p>' +
        '<p>Your request to access the Hello World site was approved.</p>' +
        '<p>' +
        button(accessUrl, 'Open the site', '#3d5aab') +
        '</p>' +
        '</div>',
    });

    return page(
      'Access accepted',
      'You approved <strong>' +
        escapeHtml(request.name) +
        '</strong> (' +
        escapeHtml(request.email) +
        '). They have been emailed a link to the site.'
    );
  }

  if (decision === 'deny') {
    request.status = 'denied';
    store.setProperty('req_' + token, JSON.stringify(request));
    MailApp.sendEmail({
      to: request.email,
      subject: 'Your access request was denied',
      htmlBody:
        '<div style="font-family:Georgia,serif;line-height:1.5;color:#111">' +
        '<p>Hi ' +
        escapeHtml(request.name) +
        ',</p>' +
        '<p>Your request to access the Hello World site was denied.</p>' +
        '</div>',
    });

    return page(
      'Access denied',
      'You denied <strong>' +
        escapeHtml(request.name) +
        '</strong> (' +
        escapeHtml(request.email) +
        '). They have been emailed.'
    );
  }

  return page('Unknown decision', 'Use the Accept or Deny button in the request email.');
}

function handleValidate(params) {
  const access = clean(params.access, 80);
  const raw = PropertiesService.getScriptProperties().getProperty('key_' + access);
  if (!raw) {
    return { ok: false };
  }
  const granted = JSON.parse(raw);
  return { ok: true, name: granted.name };
}

function jsonp(params, payload) {
  const callback = String(params.callback || 'callback');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    throw new Error('Invalid callback');
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ')').setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function page(title, bodyHtml) {
  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' +
    escapeHtml(title) +
    '</title></head><body style="font-family:Georgia,serif;background:#0b1020;color:#f4f7ff;display:grid;place-items:center;min-height:100vh;margin:0">' +
    '<main style="width:min(36rem,calc(100% - 3rem));padding:2rem;border:1px solid rgba(255,255,255,.12);border-radius:1.25rem;background:rgba(8,12,28,.85)">' +
    '<h1 style="margin-top:0">' +
    escapeHtml(title) +
    '</h1><p style="color:#b8c2e0">' +
    bodyHtml +
    '</p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function button(href, label, color) {
  return (
    '<a href="' +
    escapeHtml(href) +
    '" style="display:inline-block;background:' +
    color +
    ';color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-family:sans-serif;font-weight:600">' +
    escapeHtml(label) +
    '</a>'
  );
}

function clean(value, max) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
