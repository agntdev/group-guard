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

const USAGE = 'Usage: /setwelcome "Your welcome message"';
const UPDATED = "✅ Welcome message updated.";

composer.command("setwelcome", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const m = text.match(/^\/setwelcome\s+"(.+?)"\s*$/s);
  if (!m) {
    await ctx.reply(USAGE);
    return;
  }

  const newWelcome = m[1];
  const existing = await getRules(chatId);
  const rules: RuleSet = existing ?? defaultRuleSet();
  rules.welcomeMessage = newWelcome;
  await setRules(chatId, rules);

  await ctx.reply(UPDATED);
});

composer.callbackQuery("admin:setwelcome", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const rules = await getRules(chatId);
  const current = rules?.welcomeMessage ?? defaultRuleSet().welcomeMessage;

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(
    `Current welcome message:\n"${current}"\n\nTo change it, type:\n/setwelcome "Your new message"`,
    { reply_markup: kb },
  );
});

export default composer;
