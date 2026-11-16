// The server-side AI gateway (ARC-014, SEC-001, SEC-008): only signed-in users, only a valid
// request, the key never leaves the server, and the browser's client sends the user's token.
// No network: the model and the sign-in check are fakes, and the SDK gets a fake fetch.
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  anthropicComplete,
  MAX_OUTPUT_TOKENS,
  MODEL,
} from "../src/anthropic.ts";
import { handleGatewayRequest, type GatewayDeps } from "../src/gateway.ts";
import { gatewayClient } from "../src/gateway-client.ts";

const VALID = {
  stepId: "AIC-301",
  tier: "cheap",
  prompt: "Parse: SWP-1000-1 x2",
};

function deps(over: Partial<GatewayDeps> = {}) {
  const calls: { tier: string; prompt: string }[] = [];
  const base: GatewayDeps = {
    verifyUser: (token) => Promise.resolve(token === "good-token"),
    complete: ({ tier, prompt }) => {
      calls.push({ tier, prompt });
      return Promise.resolve('{"parts": []}');
    },
  };
  return { deps: { ...base, ...over }, calls };
}

const request = (
  body: unknown,
  authorization: string | null = "Bearer good-token",
  method = "POST",
) => ({
  method,
  authorization,
  body,
});

describe("AI gateway", () => {
  it("[TC-028] Given a signed-in user and a valid request, then the model is called once with the step's tier and prompt, and its text is returned", async () => {
    const { deps: d, calls } = deps();
    expect(await handleGatewayRequest(request(VALID), d)).toEqual({
      status: 200,
      body: { text: '{"parts": []}' },
    });
    expect(calls).toEqual([{ tier: "cheap", prompt: VALID.prompt }]);
  });

  it("[TC-028] Given no sign-in, a token that does not check out, or a sign-in check that fails, then the request is refused with 401 and the model is never called", async () => {
    for (const authorization of [
      null,
      "",
      "good-token",
      "Bearer ",
      "Bearer bad-token",
      "Basic good-token",
    ]) {
      const { deps: d, calls } = deps();
      expect(
        await handleGatewayRequest(request(VALID, authorization), d),
        String(authorization),
      ).toEqual({
        status: 401,
        body: { error: "sign in to use the AI steps" },
      });
      expect(calls).toEqual([]);
    }
    const { deps: d, calls } = deps({
      verifyUser: () => Promise.reject(new Error("auth down")),
    });
    expect((await handleGatewayRequest(request(VALID), d)).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("[TC-028] Given a method other than POST, or a body that is not a known step, tier and non-empty prompt, then it is refused and the model is never called", async () => {
    const { deps: d, calls } = deps();
    expect(
      await handleGatewayRequest(request(VALID, "Bearer good-token", "GET"), d),
    ).toEqual({
      status: 405,
      body: { error: "use POST" },
    });
    for (const body of [
      null,
      "text",
      { ...VALID, stepId: "AIC-999" },
      { ...VALID, tier: "premium" },
      { ...VALID, prompt: "" },
      { ...VALID, extra: 1 },
      { stepId: "AIC-301", tier: "cheap" },
    ]) {
      expect(
        await handleGatewayRequest(request(body), d),
        JSON.stringify(body),
      ).toEqual({
        status: 400,
        body: { error: "not a valid AI step request" },
      });
    }
    expect(calls).toEqual([]);
  });

  it("[TC-028] Given the AI service fails, then 502 is returned without its details, so nothing it said reaches the browser", async () => {
    const { deps: d } = deps({
      complete: () => Promise.reject(new Error("secret detail")),
    });
    const response = await handleGatewayRequest(request(VALID), d);
    expect(response).toEqual({
      status: 502,
      body: { error: "the AI service did not answer" },
    });
    expect(JSON.stringify(response)).not.toContain("secret");
  });
});

/** A fake fetch for the SDK: records each request and answers from a script. */
function fakeFetch(answers: readonly Response[]) {
  const sent: { url: string; body: unknown }[] = [];
  const fetch = (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const body = init?.body;
    sent.push({
      url: url instanceof Request ? url.url : url.toString(),
      body: typeof body === "string" ? (JSON.parse(body) as unknown) : body,
    });
    const answer = answers[sent.length - 1];
    return answer === undefined
      ? Promise.reject(new Error("no answer"))
      : Promise.resolve(answer);
  };
  return { fetch, sent };
}

const message = (
  stop_reason: string,
  texts: readonly string[] = ['{"ok": true}'],
) =>
  new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: MODEL,
      content: [
        { type: "thinking", thinking: "", signature: "s" },
        ...texts.map((text) => ({ type: "text", text })),
      ],
      stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("Anthropic call from the gateway", () => {
  it("[TC-029] Given a prompt, then the lowest-cost model is called once at low effort with no retries of its own, and only the text is returned", async () => {
    const { fetch, sent } = fakeFetch([message("end_turn", ['{"a": ', "1}"])]);
    const complete = anthropicComplete(
      new Anthropic({ apiKey: "test-key", fetch }),
    );
    const text = await complete({
      tier: "strong",
      prompt: "Explain",
      signal: new AbortController().signal,
    });
    expect(text).toBe('{"a": 1}');
    expect(MODEL).toBe("claude-haiku-5-5");
    // A call without a cancel signal works the same way.
    const second = fakeFetch([message("end_turn", ["plain"])]);
    expect(
      await anthropicComplete(
        new Anthropic({ apiKey: "test-key", fetch: second.fetch }),
      )({ tier: "cheap", prompt: "P" }),
    ).toBe("plain");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toEqual({
      model: "claude-haiku-5-5",
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Explain" }],
    });
  });

  it("[TC-029] Given an answer cut off, refused or otherwise not finished, or a server error, then it fails once without retrying, and the runner decides what happens next", async () => {
    for (const stop of ["max_tokens", "refusal", "pause_turn"]) {
      const { fetch } = fakeFetch([message(stop)]);
      const complete = anthropicComplete(
        new Anthropic({ apiKey: "test-key", fetch }),
      );
      await expect(
        complete({
          tier: "cheap",
          prompt: "x",
          signal: new AbortController().signal,
        }),
        stop,
      ).rejects.toThrow(`AI answer not finished: ${stop}`);
    }
    const { fetch, sent } = fakeFetch([
      new Response(
        '{"type":"error","error":{"type":"api_error","message":"x"}}',
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      ),
      message("end_turn"),
    ]);
    const complete = anthropicComplete(
      new Anthropic({ apiKey: "test-key", fetch }),
    );
    await expect(
      complete({
        tier: "cheap",
        prompt: "x",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow();
    expect(sent).toHaveLength(1);
  });
});

describe("Browser client for the gateway", () => {
  it("[TC-030] Given a signed-in user, then the client posts the step to the gateway with the user's token and returns the text; it never holds the AI key", async () => {
    const seen: { url: string; init: RequestInit | undefined }[] = [];
    const client = gatewayClient({
      url: "https://example.org/functions/v1/ai-gateway",
      stepId: "AIC-301",
      accessToken: () => Promise.resolve("user-token"),
      fetch: (url, init) => {
        seen.push({ url, init });
        return Promise.resolve(
          new Response(JSON.stringify({ text: "answer" }), { status: 200 }),
        );
      },
    });
    const signal = new AbortController().signal;
    expect(await client.complete({ tier: "cheap", prompt: "p", signal })).toBe(
      "answer",
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe("https://example.org/functions/v1/ai-gateway");
    expect(seen[0]?.init).toMatchObject({
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ stepId: "AIC-301", tier: "cheap", prompt: "p" }),
      signal,
    });
  });

  it("[TC-030] Given no sign-in, a refusal, or an answer without text, then the client fails and the runner sends the person to manual entry", async () => {
    const answer = (response: Response) => () => Promise.resolve(response);
    const call = (
      fetch: (url: string, init?: RequestInit) => Promise<Response>,
      token: string | null = "t",
    ) =>
      gatewayClient({
        url: "https://example.org/g",
        stepId: "AIC-101",
        accessToken: () => Promise.resolve(token),
        fetch,
      }).complete({
        tier: "cheap",
        prompt: "p",
        signal: new AbortController().signal,
      });
    await expect(
      call(answer(new Response("{}", { status: 200 })), null),
    ).rejects.toThrow("not signed in");
    await expect(
      call(answer(new Response('{"error": "x"}', { status: 401 }))),
    ).rejects.toThrow("AI gateway answered 401");
    await expect(
      call(answer(new Response('{"text": 5}', { status: 200 }))),
    ).rejects.toThrow("AI gateway answer has no text");
    await expect(
      call(answer(new Response("not json", { status: 200 }))),
    ).rejects.toThrow();
  });
});
