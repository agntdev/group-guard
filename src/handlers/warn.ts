import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { now } from "../clock.js";
import {
  addActionLog,
  getMember,
  setMember,
  type Member,
  type ActionLogEntry,
} from "../durable.js";

registerMainMenuItem({ label: "⚠️ Warn", data: "admin:warn", order: 30 });

const composer = new Composer<Ctx>();

const USAGE = "Usage: /warn @username [reason]";
const LOGGED_PREFIX = "⚠️ Warning recorded";

function parseMentionArgs(text: string): { target: string; reason: string } | null {
  const m = text.match(/^\/warn\s+(@\S+)(?:\s+(.+))?/s);
  if (!m) return null;
  return { target: m[1], reason: m[2]?.trim() ?? "" };
}

composer.command("warn", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const actorId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const parsed = parseMentionArgs(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  const entry: ActionLogEntry = {
    actionType: "warn",
    userId: 0,
    actor: actorId,
    reason: parsed.reason || "No reason given",
    timestamp: now().getTime(),
  };

  await addActionLog(chatId, entry);
  await ctx.reply(`${LOGGED_PREFIX} for ${parsed.target}.${parsed.reason ? `\nReason: ${parsed.reason}` : ""}`);
});

composer.callbackQuery("admin:warn", async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = inlineKeyboard([
    [inlineButton("⬅️ Back to admin", "admin:menu")],
  ]);
  await ctx.editMessageText(
    "To warn a user, type:\n/warn @username [reason]\n\nOr reply to a user's message with /warn.",
    { reply_markup: kb },
  );
});

export default composer;
