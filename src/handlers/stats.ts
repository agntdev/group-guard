import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getGroupLogKeys,
  getActionLog,
  getGroupMemberIds,
  getMember,
  type ActionLogEntry,
} from "../durable.js";

const composer = new Composer<Ctx>();

const NO_DATA = "📈 No statistics available yet.";

composer.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = await buildStats(chatId);
  await ctx.reply(text);
});

composer.callbackQuery("admin:stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const text = await buildStats(chatId);
  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(text, { reply_markup: kb });
});

async function buildStats(chatId: number): Promise<string> {
  const logKeys = await getGroupLogKeys(chatId);
  if (logKeys.length === 0) return NO_DATA;

  const logs: ActionLogEntry[] = [];
  for (const key of logKeys) {
    const entry = await getActionLog(chatId, key);
    if (entry) logs.push(entry);
  }

  if (logs.length === 0) return NO_DATA;

  const actionCounts: Record<string, number> = {};
  for (const log of logs) {
    actionCounts[log.actionType] = (actionCounts[log.actionType] ?? 0) + 1;
  }

  const memberIds = await getGroupMemberIds(chatId);
  let verifiedCount = 0;
  for (const id of memberIds) {
    const m = await getMember(id);
    if (m?.verificationStatus === "verified") verifiedCount++;
  }

  const lines = [
    "📈 Moderation statistics:",
    "",
    "Actions taken:",
  ];

  for (const [type, count] of Object.entries(actionCounts)) {
    lines.push(`• ${type}: ${count}`);
  }

  lines.push(`\nTotal actions: ${logs.length}`);
  lines.push(`Members tracked: ${memberIds.length}`);
  if (memberIds.length > 0) {
    lines.push(`Verified: ${verifiedCount}/${memberIds.length}`);
  }

  return lines.join("\n");
}

export default composer;
