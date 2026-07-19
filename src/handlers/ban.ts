import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { now } from "../clock.js";
import { addActionLog } from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: /ban @username [duration/reason]";

function parseMentionArgs(text: string): { target: string; args: string } | null {
  const m = text.match(/^\/ban\s+(@\S+)(?:\s+(.+))?/s);
  if (!m) return null;
  return { target: m[1], args: m[2]?.trim() ?? "" };
}

composer.command("ban", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const actorId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const parsed = parseMentionArgs(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  await addActionLog(chatId, {
    actionType: "ban",
    userId: 0,
    actor: actorId,
    reason: parsed.args || "No reason given",
    timestamp: now().getTime(),
  });

  await ctx.reply(`🚫 ${parsed.target} has been banned.${parsed.args ? `\n${parsed.args}` : ""}`);
});

composer.callbackQuery("admin:ban", async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(
    "To ban a user, type:\n/ban @username [duration/reason]\n\nExamples:\n/ban @spammer\n/ban @troll 7d spamming",
    { reply_markup: kb },
  );
});

export default composer;
