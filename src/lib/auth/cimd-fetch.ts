import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { isPublicRoutableHost } from "@better-auth/core/utils/host";

const bodyForbiddenResponseStatuses = new Set([204, 205, 304]);

function responseHeaders(
  headers: Record<string, string | string[] | undefined>,
) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) {
      result.append(name, value);
    }
  }
  return result;
}

/**
 * Fetch a CIMD document with public-DNS validation and a pinned connection.
 *
 * This mirrors @better-auth/cimd's Node transport, while handling Node 24's
 * lookup callback shape when `autoSelectFamily` requests all addresses.
 */
export async function fetchClientMetadataResource(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const webRequest = new Request(input, init);
  const url = new URL(webRequest.url);

  if (url.protocol !== "https:") {
    throw new TypeError("CIMD Node transport requires an HTTPS URL");
  }
  if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
    throw new TypeError("CIMD Node transport supports only GET and HEAD");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new TypeError("metadata hostname returned no DNS addresses");
  }
  for (const address of addresses) {
    if (!isPublicRoutableHost(address.address)) {
      throw new TypeError(
        "metadata hostname must resolve only to public-routable addresses",
      );
    }
  }

  const pinnedAddress = addresses[0];
  const headers = Object.fromEntries(webRequest.headers.entries());
  headers.host = url.host;
  const signal = init?.signal ?? webRequest.signal;

  return new Promise((resolve, reject) => {
    const httpsRequest = request(
      url,
      {
        agent: false,
        headers,
        method: webRequest.method,
        servername:
          isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0
            ? url.hostname
            : undefined,
        signal,
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [pinnedAddress]);
            return;
          }
          callback(null, pinnedAddress.address, pinnedAddress.family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const body =
          webRequest.method === "HEAD" ||
          bodyForbiddenResponseStatuses.has(status)
            ? null
            : Readable.toWeb(response);
        resolve(
          new Response(body as ReadableStream<Uint8Array> | null, {
            headers: responseHeaders(response.headers),
            status,
            statusText: response.statusMessage,
          }),
        );
      },
    );
    httpsRequest.once("error", reject);
    httpsRequest.end();
  });
}
