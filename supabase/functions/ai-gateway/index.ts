// The AI gateway as a Supabase Edge Function (ARC-014; SEC-001, SEC-008). Deno, not Node: this
// file only connects the tested logic in packages/ai (gateway.ts, anthropic.ts) to Supabase Auth,
// the Anthropic SDK and HTTP. The AI key is read here, from the function's secret
// ANTHROPIC_API_KEY entered by the owner, and goes nowhere else. Browsers may call it only from
// the origins listed in ALLOWED_ORIGINS (set when the apps are hosted, OD-018); none by default.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { anthropicComplete } from "../../../packages/ai/src/anthropic.ts";
import { handleGatewayRequest } from "../../../packages/ai/src/gateway.ts";

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (value === undefined || value === "")
    throw new Error(`${name} is not set`);
  return value;
};

const complete = anthropicComplete(
  new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") }),
);
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin !== "");

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") ?? "";
  const cors: Record<string, string> = allowedOrigins.includes(origin)
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST",
        "access-control-allow-headers":
          "authorization, content-type, apikey, x-client-info",
        vary: "origin",
      }
    : {};
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const result = await handleGatewayRequest(
    {
      method: req.method,
      authorization: req.headers.get("authorization"),
      body,
    },
    {
      verifyUser: async (token) => {
        const { data, error } = await supabase.auth.getUser(token);
        return error === null && data.user !== null;
      },
      complete: (request) => complete({ ...request, signal: req.signal }),
    },
  );
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...cors, "content-type": "application/json" },
  });
});
