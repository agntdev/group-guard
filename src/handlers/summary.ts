import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { now } from "../clock.js";
import {
  getGroupLogKeys,
  getActionLog,
  type ActionLogEntry,
} from "../durable.js";

registerMainMenuItem({ label: "📊 Summary", data: "admin:summary", order: 40 });

const composer = new Composer<Ctx>();

const NO_DATA = "📊 No moderation activity to report yet.";

function formatSummary(logs: ActionLogEntry[]): string {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    counts[log.actionType] = (counts[log.actionType] ?? 0) + 1;
  }
  const lines = ["📊 Moderation summary:"];
  for (const [type, count] of Object.entries(counts)) {
    lines.push(`• ${type}: ${count}`);
  }
  lines.push(`\nTotal actions: ${logs.length}`);
  return lines.join("\n");
}

async function buildSummary(chatId: number): Promise<string> {
  const keys = await getGroupLogKeys(chatId);
  if (keys.length === 0) return NO_DATA;

  const logs: ActionLogEntry[] = [];
  for (const key of keys) {
    const entry = await getActionLog(chatId, key);
    if (entry) logs.push(entry);
  }

  if (logs.length === 0) return NO_DATA;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayLogs = logs.filter((l) => l.timestamp >= todayMs);
  if (todayLogs.length === 0) return NO_DATA;

  return formatSummary(todayLogs);
}

composer.command("summary", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = await buildSummary(chatId);
  await ctx.reply(text);
});

composer.callbackQuery("admin:summary", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const text = await buildSummary(chatId);
  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(text, { reply_markup: kb });
});

export default composer;
