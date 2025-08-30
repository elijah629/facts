"use server";

export async function serverFetch(url: string): Promise<string> {
  return await fetch(url).then((x) => x.text());
}
