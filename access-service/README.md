# Access request service setup

By default, the static site prepares an email to `jordan.b.lane84@gmail.com` in the visitor's email app. The visitor must send it, and Jordan replies manually. This fallback does not unlock the page.

To enable automated request emails and one-click decisions that grant a visitor access, deploy the Google Apps Script service below and set its URL in `config.js`.

## Deploy

1. Create a Google Apps Script project and copy `Code.gs` into it. In Project Settings, enable `appsscript.json` in the editor and copy the manifest settings from this folder.
2. Set `SITE_URL` in `Code.gs` to the deployed website's base URL, including the trailing slash.
3. Deploy the script as a **Web app**, executing as the deploying account, with access set to **Anyone**. Authorize the requested script properties and email permissions.
4. Copy the deployed web app URL ending in `/exec` into `scriptUrl` in the site's `config.js`.
5. Redeploy the web app as a new version after changing `Code.gs` or its manifest.

The Apps Script deployment URL is account-specific, so it cannot be filled in until the owner deploys the service. Until then, the site displays a setup message instead of pretending the request was sent.

## Important scope

The current site is a static page. Its access gate controls which content the browser displays, but it does not protect static files or other public hosting resources. Keep sensitive content behind a server-side access check; do not place secrets in the static site.
