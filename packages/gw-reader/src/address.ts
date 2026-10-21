// @ff/gw-reader — stable message address (ADR-0018 D2).
//
//   gw:<chatAlias>/t<thread>/m<channelMessageId>
//
// chatAlias = first 6 hex of sha256(chatId) — short, not the 13-digit chat id. thread = Telegram
// message_thread_id, or 0 for a chat without topics (Telegram never issues thread 0). Only inbound rows
// with a channelMessageId are addressable. Ambiguity (alias collision) is detected at resolve time.

import { createHash } from 'node:crypto';

export interface SessionCoords {
  chatId: string;
  thread: number;
}

export interface Address {
  chatAlias: string;
  thread: number;
  mid: string;
}

export function chatAlias(chatId: string): string {
  return createHash('sha256').update(chatId).digest('hex').slice(0, 6);
}

/**
 * Parses the gateway sessionKey `telegram:<chatId>[:<threadId>]:<agentId>`.
 * Unknown shapes return null (fail-closed: such rows are never returned).
 */
export function parseSessionKey(sessionKey: string): SessionCoords | null {
  const parts = sessionKey.split(':');
  if (parts[0] !== 'telegram') return null;
  const chatId = parts[1];
  if (chatId === undefined || !/^-?\d+$/u.test(chatId)) return null;
  if (parts.length === 3) return { chatId, thread: 0 };
  if (parts.length === 4) {
    const t = parts[2] ?? '';
    if (!/^\d+$/u.test(t)) return null;
    return { chatId, thread: Number(t) };
  }
  return null;
}

export function topicKey(chatId: string, thread: number): string {
  return `gw:${chatAlias(chatId)}/t${thread}`;
}

export function formatAddress(chatId: string, thread: number, mid: string): string {
  return `${topicKey(chatId, thread)}/m${mid}`;
}

const ADDRESS_RE = /^gw:([0-9a-f]{6})\/t(\d+)\/m(\d+)$/u;

export function parseAddress(address: string): Address | null {
  const m = ADDRESS_RE.exec(address.trim());
  if (!m) return null;
  return { chatAlias: m[1] as string, thread: Number(m[2]), mid: m[3] as string };
}

export interface TopicFilter {
  chatAlias?: string;
  thread: number;
}

/** Accepts `gw:<alias>/t<n>`, `<alias>/t<n>`, `t<n>` or `<n>` (thread in any chat). */
export function parseTopicFilter(topic: string): TopicFilter | null {
  const s = topic.trim().replace(/^gw:/u, '');
  let m = /^([0-9a-f]{6})\/t(\d+)$/u.exec(s);
  if (m) return { chatAlias: m[1] as string, thread: Number(m[2]) };
  m = /^t?(\d+)$/u.exec(s);
  if (m) return { thread: Number(m[1]) };
  return null;
}
