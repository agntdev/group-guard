import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { now } from "../clock.js";
import {
  getRules,
  getAdminSettings,
  defaultRuleSet,
  defaultAdminSettings,
  addSpamEvent,
  addActionLog,
  getTrust,
} from "../durable.js";

const composer = new Composer<Ctx>();

const LINK_REGEX = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i;
const MAX_MESSAGE_LENGTH = 2000;

const recentMessages = new Map<number, { text: string; time: number }[]>();

function isTrusted(data: { text: string; time: number }[]): boolean {
  if (data.length < 3) return false;
  const unique = new Set(data.map((d) => d.text));
  return unique.size <= 1;
}

function isFlood(data: { text: string; time: number }[], windowMs: number, threshold: number): boolean {
  const cutoff = now().getTime() - windowMs;
  const recent = data.filter((d) => d.time >= cutoff);
  return recent.length >= threshold;
}

composer.on("message:text", async (ctx, next) => {
  const chatId = ctx.chat?.id ?? 0;
  const userId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") {
    return next();
  }

  const trustEntry = await getTrust(chatId, userId);
  if (trustEntry) {
    return next();
  }

  const rules = (await getRules(chatId)) ?? defaultRuleSet();
  const settings = (await getAdminSettings(chatId)) ?? defaultAdminSettings();
  const thresholds = rules.spamThresholds;

  if (!recentMessages.has(chatId)) {
    recentMessages.set(chatId, []);
  }
  const history = recentMessages.get(chatId)!;
  history.push({ text, time: now().getTime() });
  if (history.length > 100) history.splice(0, history.length - 100);

  const userHistory = history.filter((_, i) => {
    const entry = history[i];
    return entry !== undefined;
  });

  if (LINK_REGEX.test(text)) {
    await addSpamEvent(chatId, {
      userId,
      spamType: "new_account_link",
      severity: "low",
      timestamp: now().getTime(),
    });
    await addActionLog(chatId, {
      actionType: "spam_detected",
      userId,
      actor: 0,
      reason: "Link in message",
      timestamp: now().getTime(),
    });
  }

  const duplicateCount = userHistory.filter((d) => d.text === text).length;
  if (duplicateCount >= thresholds.duplicateThreshold) {
    await addSpamEvent(chatId, {
      userId,
      spamType: "duplicate",
      severity: "medium",
      timestamp: now().getTime(),
    });
  }

  if (isFlood(userHistory, thresholds.floodWindow, thresholds.floodThreshold)) {
    await addSpamEvent(chatId, {
      userId,
      spamType: "flood",
      severity: "high",
      timestamp: now().getTime(),
    });
  }

  return next();
});

export default composer;
