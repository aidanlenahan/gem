// Cloudflare Worker: branded error pages for GEM.
//
// FIXED VERSION of the deployed `cf-error-pages` worker.
//
// Bug in the deployed version: it replaced EVERY 4xx/5xx response — including
// JSON responses from api-gem.aidanlenahan.com — with an HTML page that has no
// headers. Browsers then saw a CORS failure (no Access-Control-Allow-Origin),
// so the app showed "You appear to be offline" for a wrong password, for a
// logged-out /users/me check, for rate limits (Retry-After was dropped too),
// for validation errors, etc. Set-Cookie headers on error responses were lost.
//
// Rule now: only browser page navigations to the web hosts get the branded
// page. API hosts, fetch()/XHR, assets and anything that isn't asking for
// HTML pass through untouched. If the origin is unreachable we still return a
// branded 503 for navigations and a JSON 503 (with CORS) for API calls.

const DEV_HOSTS = new Set(["gem-dev.aidanlenahan.com", "api-gem-dev.aidanlenahan.com"]);
const API_HOSTS = new Set(["api-gem.aidanlenahan.com", "api-gem-dev.aidanlenahan.com"]);

const PROD_ERRORS = {
  400: ["Bad Request", "The request was malformed or invalid."],
  401: ["Unauthorized", "You need to log in to view this page."],
  403: ["Forbidden", "You don't have permission to view this page."],
  404: ["Not Found", "This page doesn't exist."],
  429: ["Too Many Requests", "You're sending requests too quickly. Wait a moment and try again."],
  500: ["Server Error", "Something went wrong on our end. We've been notified and are working on it."],
  502: ["Bad Gateway", "The server returned an unexpected response. This is usually temporary."],
  503: ["Service Unavailable", "Gem is temporarily offline for maintenance or is experiencing issues."],
  504: ["Gateway Timeout", "The server took too long to respond. Please try again in a moment."],
  524: ["Request Timeout", "The connection to the server timed out. Please try again."],
  530: ["Service Unavailable", "Gem is temporarily offline. Check the status page for updates."],
};

const DEV_ERRORS = {
  400: ["Bad Request", "The request was malformed. Check the request body and headers."],
  401: ["Unauthorized", "Missing or invalid auth token. Check your session or JWT."],
  403: ["Forbidden", "Auth succeeded but access was denied. Check role/permission logic."],
  404: ["Not Found", "Route not found. Check the API route or page path is registered."],
  429: ["Too Many Requests", "Rate limit hit. Check rate limiting config or reduce request frequency."],
  500: ["Server Error", "Unhandled exception in the API. Check server logs for the stack trace."],
  502: ["Bad Gateway", "The API server is down or crashed. Redeploy dev to fix this."],
  503: ["Service Unavailable", "The API server is not running. Redeploy dev to fix this."],
  504: ["Gateway Timeout", "The API server stopped responding. Check for a hung process or deadlock."],
  524: ["Request Timeout", "Connection timed out. The server may be overloaded or stuck."],
  530: ["Service Unavailable", "Cloudflare cannot reach the tunnel. Ensure the dev tunnel is running."],
};

const ALLOWED_ORIGINS = new Set([
  "https://gem.aidanlenahan.com",
  "https://gem-dev.aidanlenahan.com",
]);

/** True only for a top-level browser page load that wants HTML. */
function isHtmlNavigation(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const mode = request.headers.get("Sec-Fetch-Mode");
  if (mode && mode !== "navigate") return false;
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html");
}

/** JSON 503 for API callers when the origin/tunnel is unreachable. */
function apiUnavailable(request) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "30" };
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return new Response(
    JSON.stringify({ error: "Service temporarily unavailable", code: "SERVICE_UNAVAILABLE" }),
    { status: 503, headers }
  );
}

export default {
  async fetch(request) {
    const host = new URL(request.url).hostname;
    const isDev = DEV_HOSTS.has(host);
    const errors = isDev ? DEV_ERRORS : PROD_ERRORS;
    const isApi = API_HOSTS.has(host);
    const navigation = !isApi && isHtmlNavigation(request);

    let response;
    try {
      response = await fetch(request);
    } catch {
      if (!navigation) return apiUnavailable(request);
      const [title, message] = errors[503];
      return errorPage(503, title, message, isDev);
    }

    // API responses and non-navigation requests always pass through as-is:
    // the app relies on their JSON bodies and headers (CORS, Retry-After, cookies).
    if (!navigation) return response;

    // Don't replace an HTML page the origin already rendered (e.g. the SPA's
    // own 404 page) — only bare/non-HTML error bodies get the branded page.
    const contentType = response.headers.get("Content-Type") || "";
    const entry = errors[response.status];
    if (entry && !contentType.includes("text/html")) {
      const [title, message] = entry;
      return errorPage(response.status, title, message, isDev);
    }
    return response;
  },
};

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="21" viewBox="0 0 48 46" fill="none" aria-hidden="true">
  <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
</svg>`;

function errorPage(status, title, message, isDev) {
  const is5xx = status >= 500;
  const statusColor = is5xx ? "#f87171" : "#863bff";
  const footer = isDev
    ? `<div class="footer">
        <span class="footer-badge">dev</span>
        <a href="/">Go home</a>
      </div>`
    : `<div class="footer">
        <a href="https://status.aidanlenahan.com/status/gem">Status page</a>
        <span class="footer-dot">&middot;</span>
        <a href="mailto:help@gem.aidanlenahan.com">help@gem.aidanlenahan.com</a>
        <span class="footer-dot">&middot;</span>
        <a href="/">Go home</a>
      </div>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${status} — ${title} \xB7 Gem</title>
  <link rel="icon" href="https://gem.aidanlenahan.com/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Work+Sans:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Work Sans', 'Segoe UI', sans-serif;
      background: #030712; color: #e2e8f0; min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 2rem; -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%; max-width: 480px; background: #0b1120; border: 1px solid #1f2937;
      border-radius: 16px; padding: 2.75rem 2.5rem 2rem; text-align: center;
    }
    .wordmark { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 2.5rem; text-decoration: none; }
    .wordmark-text { font-family: 'Fraunces', Georgia, serif; font-size: 1.1rem; font-weight: 700; color: #f1f5f9; letter-spacing: -0.02em; }
    .status-code {
      font-family: 'Fraunces', Georgia, serif; font-size: 5rem; font-weight: 700; line-height: 1;
      letter-spacing: -0.04em; color: ${statusColor}; margin-bottom: 1rem;
    }
    h1 { font-family: 'Fraunces', Georgia, serif; font-size: 1.25rem; font-weight: 600; color: #f1f5f9; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
    .message { font-size: 0.9rem; color: #64748b; line-height: 1.7; margin-bottom: 0; }
    .footer {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem;
      font-size: 0.8rem; color: #374151; border-top: 1px solid #111827; padding-top: 1.5rem; margin-top: 2rem;
    }
    .footer a { color: #4b5563; text-decoration: none; transition: color 0.15s; }
    .footer a:hover { color: #9ca3af; }
    .footer-dot { color: #1f2937; }
    .footer-badge {
      font-size: 0.7rem; font-family: 'IBM Plex Mono', ui-monospace, monospace; color: #863bff;
      background: rgba(134, 59, 255, 0.1); border: 1px solid rgba(134, 59, 255, 0.2);
      border-radius: 4px; padding: 0.1rem 0.4rem; letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="card">
    <a class="wordmark" href="/">
      ${LOGO_SVG}
      <span class="wordmark-text">Gem</span>
    </a>
    <div class="status-code">${status}</div>
    <h1>${title}</h1>
    <p class="message">${message}</p>
    ${footer}
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
