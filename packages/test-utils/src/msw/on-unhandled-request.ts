type UnhandledRequest = {
  url: string;
};

type MswPrint = {
  error: () => void;
};

export type ExternalOnlyOnUnhandledRequestOptions = {
  allowHostnames?: string[];
};

const DEFAULT_ALLOWED_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

export function externalOnlyOnUnhandledRequest(
  options: ExternalOnlyOnUnhandledRequestOptions = {},
): (request: UnhandledRequest, print: MswPrint) => void {
  const allowedHostnames = new Set([
    ...DEFAULT_ALLOWED_HOSTNAMES,
    ...(options.allowHostnames ?? []),
  ]);

  return (request, print) => {
    const url = new URL(request.url);

    if (allowedHostnames.has(url.hostname)) {
      return;
    }

    print.error();
  };
}
