import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

// First byte identifies the format so existing history survives codec changes.
export function packGradebook(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value));
  const compressed = brotliCompressSync(json, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 3 },
  });
  return compressed.length < json.length
    ? Buffer.concat([Buffer.from([1]), compressed])
    : Buffer.concat([Buffer.from([0]), json]);
}

export function unpackGradebook<T>(value: Uint8Array): T {
  const data = Buffer.from(
    value.buffer,
    value.byteOffset + 1,
    value.length - 1,
  );
  switch (value[0]) {
    case 0:
      return JSON.parse(data.toString("utf8")) as T;
    case 1:
      return JSON.parse(brotliDecompressSync(data).toString("utf8")) as T;
    default:
      throw new Error("UNKNOWN_GRADEBOOK_FORMAT");
  }
}
