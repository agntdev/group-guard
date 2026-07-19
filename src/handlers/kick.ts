import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { now } from "../clock.js";
import { addActionLog } from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: /kick @username [reason]";

function parseMentionArgs(text: string): { target: string; reason: string } | null {
  const m = text.match(/^\/kick\s+(@\S+)(?:\s+(.+))?/s);
  if (!m) return null;
  return { target: m[1], reason: m[2]?.trim() ?? "" };
}

composer.command("kick", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const actorId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const parsed = parseMentionArgs(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  await addActionLog(chatId, {
    actionType: "kick",
    userId: 0,
    actor: actorId,
    reason: parsed.reason || "No reason given",
    timestamp: now().getTime(),
  });

  const reasonLine = parsed.reason ? `\nReason: ${parsed.reason}` : "";
  await ctx.reply(`👢 ${parsed.target} has been kicked.${reasonLine}`);
});

composer.callbackQuery("admin:kick", async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(
    "To kick a user, type:\n/kick @username [reason]\n\nThis removes the user from the group.",
    { reply_markup: kb },
  );
});

export default composer;
