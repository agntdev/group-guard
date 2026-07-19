import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getGroupLogKeys,
  getActionLog,
  type ActionLogEntry,
} from "../durable.js";

const composer = new Composer<Ctx>();

const NO_LOGS = "📜 No moderation logs yet.";

function formatLog(entry: ActionLogEntry): string {
  const date = new Date(entry.timestamp).toISOString().slice(0, 16);
  return `[${date}] ${entry.actionType} — actor: ${entry.actor}, reason: ${entry.reason}`;
}

composer.command("logs", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const m = text.match(/^\/logs(?:\s+(\d+))?/);
  const limit = m?.[1] ? parseInt(m[1], 10) : 10;

  const keys = await getGroupLogKeys(chatId);
  if (keys.length === 0) {
    await ctx.reply(NO_LOGS);
    return;
  }

  const recentKeys = keys.slice(-limit);
  const lines = ["📜 Recent moderation logs:\n"];
  for (const key of recentKeys) {
    const entry = await getActionLog(chatId, key);
    if (entry) lines.push(formatLog(entry));
  }

  await ctx.reply(lines.join("\n"));
});

composer.callbackQuery("admin:logs", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const keys = await getGroupLogKeys(chatId);

  if (keys.length === 0) {
    const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
    await ctx.editMessageText(NO_LOGS, { reply_markup: kb });
    return;
  }

  const recentKeys = keys.slice(-5);
  const lines = ["📜 Recent moderation logs:\n"];
  for (const key of recentKeys) {
    const entry = await getActionLog(chatId, key);
    if (entry) lines.push(formatLog(entry));
  }

  lines.push(`\nShowing last ${recentKeys.length} of ${keys.length} total.`);
  lines.push("\nType /logs [N] to see more.");

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(lines.join("\n"), { reply_markup: kb });
});

export default composer;
