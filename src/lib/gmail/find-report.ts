import { flattenGmailBody, type GmailPart, gmailFetch } from "./client";
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

export async function findFactsReportCandidates(
  userId: string,
): Promise<FactsSourceCandidate[]> {
  const list = await gmailFetch<MessageList>(userId, "users/me/messages", {
    q: 'newer_than:30d ("Gradebook Progress Report" OR "Progress Report")',
    maxResults: "20",
  });
  const candidates: FactsSourceCandidate[] = [];
  for (const item of list.messages ?? []) {
    const message = await gmailFetch<Message>(
      userId,
      `users/me/messages/${encodeURIComponent(item.id)}`,
      { format: "full" },
    );
    for (const url of extractFactsUrls(flattenGmailBody(message.payload))) {
      candidates.push({
        messageId: message.id,
        receivedAt: new Date(Number(message.internalDate)),
        url,
      });
    }
  }
  return candidates.sort(
    (left, right) => right.receivedAt.getTime() - left.receivedAt.getTime(),
  );
}
