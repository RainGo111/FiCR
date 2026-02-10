import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function toBase64(str: string): string {
  return btoa(str);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'query' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const graphdbUrl =
      Deno.env.get("GRAPHDB_URL") ??
      "http://RainWin:7200/repositories/FiCR_Query";
    const graphdbUser = Deno.env.get("GRAPHDB_USER") ?? "admin";
    const graphdbPass = Deno.env.get("GRAPHDB_PASS") ?? "Hello@graphdb123!";

    const basicAuth = toBase64(`${graphdbUser}:${graphdbPass}`);

    const response = await fetch(graphdbUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json",
      },
      body: query,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `GraphDB error [${response.status}]:`,
        errorBody
      );
      return new Response(
        JSON.stringify({
          error: `SPARQL endpoint error: ${response.status}`,
          details: errorBody,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    console.error("SPARQL proxy error:", message, stack);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
