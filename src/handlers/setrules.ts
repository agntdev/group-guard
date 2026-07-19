import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getRules,
  setRules,
  defaultRuleSet,
  type RuleSet,
} from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = 'Usage: /setrules "Your rules text"';
const UPDATED = "✅ Rules updated.";

composer.command("setrules", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const m = text.match(/^\/setrules\s+"(.+?)"\s*$/s);
  if (!m) {
    await ctx.reply(USAGE);
    return;
  }

  const newRules = m[1];
  const existing = await getRules(chatId);
  const rules: RuleSet = existing ?? defaultRuleSet();
  rules.rulesText = newRules;
  await setRules(chatId, rules);

  await ctx.reply(UPDATED);
});

composer.callbackQuery("admin:setrules", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const rules = await getRules(chatId);
  const current = rules?.rulesText ?? defaultRuleSet().rulesText;

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(
    `Current rules:\n"${current}"\n\nTo change them, type:\n/setrules "Your new rules"`,
    { reply_markup: kb },
  );
});

export default composer;
