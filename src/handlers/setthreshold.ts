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

const USAGE = "Usage: /setthreshold <spam_type> <value>\n\nSpam types: link_cooldown, duplicate_threshold, flood_threshold, flood_window";
const UPDATED = "✅ Threshold updated.";

const VALID_TYPES = ["link_cooldown", "duplicate_threshold", "flood_threshold", "flood_window"] as const;

composer.command("setthreshold", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const m = text.match(/^\/setthreshold\s+(\S+)\s+(\S+)/);
  if (!m) {
    await ctx.reply(USAGE);
    return;
  }

  const thresholdType = m[1];
  const value = parseInt(m[2], 10);

  if (!VALID_TYPES.includes(thresholdType as typeof VALID_TYPES[number])) {
    await ctx.reply(`Unknown threshold: "${thresholdType}".\n\nValid thresholds: ${VALID_TYPES.join(", ")}`);
    return;
  }

  if (isNaN(value) || value < 0) {
    await ctx.reply("Value must be a non-negative number.");
    return;
  }

  const existing = await getRules(chatId);
  const rules: RuleSet = existing ?? defaultRuleSet();

  if (thresholdType === "link_cooldown") rules.spamThresholds.linkCooldown = value;
  else if (thresholdType === "duplicate_threshold") rules.spamThresholds.duplicateThreshold = value;
  else if (thresholdType === "flood_threshold") rules.spamThresholds.floodThreshold = value;
  else if (thresholdType === "flood_window") rules.spamThresholds.floodWindow = value;

  await setRules(chatId, rules);
  await ctx.reply(`${UPDATED}\n${thresholdType} → ${value}`);
});

composer.callbackQuery("admin:setthreshold", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const rules = (await getRules(chatId)) ?? defaultRuleSet();
  const t = rules.spamThresholds;

  const lines = [
    "📊 Spam thresholds:",
    "",
    `• Link cooldown: ${t.linkCooldown}ms`,
    `• Duplicate threshold: ${t.duplicateThreshold} messages`,
    `• Flood threshold: ${t.floodThreshold} messages`,
    `• Flood window: ${t.floodWindow}ms`,
    "",
    "To change, type:\n/setthreshold <type> <value>",
    `\nTypes: ${VALID_TYPES.join(", ")}`,
  ];

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(lines.join("\n"), { reply_markup: kb });
});

export default composer;
