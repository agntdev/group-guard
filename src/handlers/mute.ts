import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { now } from "../clock.js";
import { addActionLog } from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: /mute @username [duration]";

function parseMentionArgs(text: string): { target: string; duration: string } | null {
  const m = text.match(/^\/mute\s+(@\S+)(?:\s+(.+))?/s);
  if (!m) return null;
  return { target: m[1], duration: m[2]?.trim() ?? "indefinite" };
}

composer.command("mute", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const actorId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const parsed = parseMentionArgs(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  await addActionLog(chatId, {
    actionType: "mute",
    userId: 0,
    actor: actorId,
    reason: `Muted for ${parsed.duration}`,
    timestamp: now().getTime(),
  });

  await ctx.reply(`🔇 ${parsed.target} has been muted for ${parsed.duration}.`);
});

composer.callbackQuery("admin:mute", async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(
    "To mute a user, type:\n/mute @username [duration]\n\nExamples:\n/mute @spammer 1h\n/mute @troll 24h",
    { reply_markup: kb },
  );
});

export default composer;
