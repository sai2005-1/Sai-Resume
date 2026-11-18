/**
 * Freebuff Sites entrypoint for the static portfolio.
 * Static files are served from the ASSETS binding; the Worker only
 * handles requests the asset layer does not satisfy.
 */
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // Single-page site: an unknown path gets the page, not a bare 404.
    const url = new URL(request.url);
    if (/\.[a-z0-9]+$/i.test(url.pathname)) return response;
    return env.ASSETS.fetch(new Request(new URL("/", url), request));
  }
};
