import {
  flattenGmailBody,
  type GmailPart,
  gmailFetch,
  googleAccessToken,
} from "./client";
import { extractFactsUrls } from "./extract-facts-url";

interface MessageList {
  messages?: Array<{ id: string }>;
}

interface Message {
  id: string;
  internalDate: string;
  payload: GmailPart;
}

export interface FactsSourceCandidate {
  messageId: string;
  receivedAt: Date;
  url: string;
}

export async function* findFactsReportCandidates(
  userId: string,
  newerThan?: Date | null,
): AsyncGenerator<FactsSourceCandidate> {
  const token = await googleAccessToken(userId);
  const after = newerThan
    ? ` after:${Math.floor(newerThan.getTime() / 1_000)}`
    : "";
  const list = await gmailFetch<MessageList>(token, "users/me/messages", {
    q: `newer_than:30d${after} ("Gradebook Progress Report" OR "Progress Report")`,
    maxResults: "20",
    fields: "messages(id)",
  });
  for (const item of list.messages ?? []) {
    const message = await gmailFetch<Message>(
      token,
      `users/me/messages/${encodeURIComponent(item.id)}`,
      { format: "full" },
    );
    const receivedAt = new Date(Number(message.internalDate));
    if (newerThan && receivedAt <= newerThan) continue;
    for (const url of extractFactsUrls(flattenGmailBody(message.payload))) {
      yield {
        messageId: message.id,
        receivedAt,
        url,
      };
    }
  }
}
