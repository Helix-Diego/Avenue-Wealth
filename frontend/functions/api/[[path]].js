// Cloudflare Pages Function: Reverse Proxy for /api/* requests to Render FastAPI backend
// Intercepts all calls to /api/* and routes them transparently to https://avenue-wealth.onrender.com

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight OPTIONS requests directly at the edge
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, User-Agent",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Construct target URL to Render backend preserving path and full query string
  const targetUrl = `https://avenue-wealth.onrender.com${url.pathname}${url.search}`;

  // Clone headers and rewrite the Host header to match the Render service
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set("Host", "avenue-wealth.onrender.com");
  forwardHeaders.set("X-Forwarded-Host", url.host);
  forwardHeaders.set("X-Forwarded-Proto", "https");

  const init = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "follow",
  };

  // Only pass body for mutation methods (GET and HEAD must not have body)
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const backendResponse = await fetch(targetUrl, init);

    // Clone backend headers and ensure permissive CORS for frontend consumption
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Gateway Proxy Error",
        message: "Failed to connect to Avenue Wealth backend on Render.",
        details: error.message,
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
