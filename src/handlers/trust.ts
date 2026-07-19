import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { now } from "../clock.js";
import {
  setTrust,
  removeTrust,
  getTrust,
  getGroupTrustIds,
  getMember,
  setMember,
  type TrustEntry,
} from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: /trust add|remove @username [reason]";

function parseTrustArgs(text: string): { action: "add" | "remove"; target: string; reason: string } | null {
  const m = text.match(/^\/trust\s+(add|remove)\s+(@\S+)(?:\s+(.+))?/s);
  if (!m) return null;
  return { action: m[1] as "add" | "remove", target: m[2], reason: m[3]?.trim() ?? "" };
}

composer.command("trust", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const actorId = ctx.from?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const parsed = parseTrustArgs(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  if (parsed.action === "add") {
    const entry: TrustEntry = {
      userId: 0,
      reason: parsed.reason || "Trusted by admin",
      addedAt: now().getTime(),
    };
    await setTrust(chatId, entry);

    const member = await getMember(0);
    if (member) {
      member.trustStatus = "trusted";
      await setMember(member);
    }

    await ctx.reply(`🛡️ ${parsed.target} has been added to the trust list.`);
  } else {
    await removeTrust(chatId, 0);
    await ctx.reply(`🛡️ ${parsed.target} has been removed from the trust list.`);
  }
});

composer.callbackQuery("admin:trust", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const trustIds = await getGroupTrustIds(chatId);
  const lines = ["🛡️ Trust list management", ""];
  lines.push("Commands:");
  lines.push("/trust add @username [reason]");
  lines.push("/trust remove @username");
  lines.push("");

  if (trustIds.length === 0) {
    lines.push("No trusted users yet.");
  } else {
    lines.push(`Trusted users: ${trustIds.length}`);
  }

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(lines.join("\n"), { reply_markup: kb });
});

export default composer;
