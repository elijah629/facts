const connectionErrors = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

export function isConnectionError(error: unknown): boolean {
  const causes = new Set<unknown>();
  while (error instanceof Error && !causes.has(error)) {
    causes.add(error);
    const code = (error as NodeJS.ErrnoException).code;
    if (
      (code && connectionErrors.has(code)) ||
      /^(?:Connection terminated|timeout exceeded when trying to connect)/i.test(
        error.message,
      )
    )
      return true;
    error = error.cause;
  }
  return false;
}

export async function databaseRead<T>(read: () => PromiseLike<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    return await read();
  }
}
