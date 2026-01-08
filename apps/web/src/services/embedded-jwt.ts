let bufferedJwt: string | null = null;
let listenerInitialized = false;

function extractJwtFromUnknown(value: unknown): string | null {
  const isProbablyJwt = (candidate: string): boolean =>
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(candidate);

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && isProbablyJwt(trimmed) ? trimmed : null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const candidate =
    record.jwt ??
    record.JWT ??
    record.token ??
    record.access_token ??
    record.accessToken ??
    record.ssoToken ??
    record.sso_token;

  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed && isProbablyJwt(trimmed) ? trimmed : null;
}

export function startEmbeddedJwtListener(): void {
  if (listenerInitialized || typeof window === "undefined") return;
  listenerInitialized = true;

  window.addEventListener("message", (event: MessageEvent) => {
    const jwt = extractJwtFromUnknown(event.data);
    if (!jwt) return;
    bufferedJwt = jwt;
  });
}

export function consumeEmbeddedJwt(): string | null {
  const jwt = bufferedJwt;
  bufferedJwt = null;
  return jwt;
}

