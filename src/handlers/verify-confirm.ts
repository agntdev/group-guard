import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { now } from "../clock.js";
import {
  setMember,
  getMember,
  addActionLog,
  type Member,
} from "../durable.js";

registerMainMenuItem({ label: "🛡️ Verify", data: "verify:confirm", order: 10 });

const composer = new Composer<Ctx>();

const VERIFIED_TEXT = "✅ You're verified! Welcome to the group.";
const ALREADY_VERIFIED_TEXT = "✅ You're already verified.";
const VERIFY_FAIL_TEXT = "Verification failed — try again.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.callbackQuery("verify:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const groupId = ctx.chat?.id ?? userId;

  const existing = await getMember(userId);
  if (existing?.verificationStatus === "verified") {
    await ctx.editMessageText(ALREADY_VERIFIED_TEXT, { reply_markup: backToMenu });
    return;
  }

  const member: Member = {
    userId,
    joinTime: existing?.joinTime ?? now().getTime(),
    trustStatus: existing?.trustStatus ?? "normal",
    verificationStatus: "verified",
  };
  await setMember(member);

  await addActionLog(groupId, {
    actionType: "verify",
    userId,
    actor: userId,
    reason: "User verified via button",
    timestamp: now().getTime(),
  });

  await ctx.editMessageText(VERIFIED_TEXT, { reply_markup: backToMenu });
});

export default composer;
