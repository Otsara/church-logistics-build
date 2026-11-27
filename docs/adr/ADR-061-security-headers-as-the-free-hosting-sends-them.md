---
id: ADR-061
title: For this build, the published app's security headers are those the free hosting sends
status: Accepted
date: 2026-11-27
decided: owner, 2026-11-27
---

# ADR-061 Security headers as the free hosting sends them

## Context

SEC-003 asks for HTTPS, and for headers that block framing and third-party scripts, with the set fixed when hosting is set up (OD-018). On 2026-11-27 Prepped was published at https://prepped-for-anything.lovable.app. It is served over HTTPS with three headers:

- `strict-transport-security: max-age=31536000; includeSubDomains`;
- `x-content-type-options: nosniff`;
- `referrer-policy: strict-origin-when-cross-origin`.

There is no `X-Frame-Options`, `frame-ancestors` or `Content-Security-Policy`. The free lovable.app hosting lets no app set response headers.

## Options

- (a) Record the hosting's set as this build's, and list the missing framing and script protection as a known limitation.
- (b) Also add a Content-Security-Policy as a `<meta>` tag through Lovable on the deadline day. It would block third-party scripts but cannot block framing, and it risks breaking the published app.
- (c) Leave TC-015 failing.

## Decision

Option (a) (owner, 2026-11-27).

## Consequences

- TC-015 carries a recorded check of the published app (ADR-058's rule), and the strict gate no longer lists it.
- Before real-world use, the app moves to hosting that sets a Content-Security-Policy and `frame-ancestors`. Until then a page could, in principle, show the app inside a frame. No data reaches a third-party script: the app loads none, and its bundle and fonts are served from its own address.
