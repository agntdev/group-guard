import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getAdminSettings,
  setAdminSettings,
  defaultAdminSettings,
} from "../durable.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: /setauto <spam_type> <action>\n\nSpam types: new_account_link, duplicate, flood\nActions: warn, mute, kick, ban";
const UPDATED = "✅ Auto action updated.";

const VALID_TYPES = ["new_account_link", "duplicate", "flood"] as const;
const VALID_ACTIONS = ["warn", "mute", "kick", "ban"] as const;

composer.command("setauto", async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  const text = ctx.message?.text ?? "";

  const m = text.match(/^\/setauto\s+(\S+)\s+(\S+)/);
  if (!m) {
    await ctx.reply(USAGE);
    return;
  }

  const spamType = m[1];
  const action = m[2];

  if (!VALID_TYPES.includes(spamType as typeof VALID_TYPES[number])) {
    await ctx.reply(`Unknown spam type: "${spamType}".\n\nValid types: ${VALID_TYPES.join(", ")}`);
    return;
  }

  if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    await ctx.reply(`Unknown action: "${action}".\n\nValid actions: ${VALID_ACTIONS.join(", ")}`);
    return;
  }

  const settings = (await getAdminSettings(chatId)) ?? defaultAdminSettings();
  if (spamType === "new_account_link") settings.autoActions.newAccountLink = action as typeof VALID_ACTIONS[number];
  else if (spamType === "duplicate") settings.autoActions.duplicate = action as typeof VALID_ACTIONS[number];
  else if (spamType === "flood") settings.autoActions.flood = action as typeof VALID_ACTIONS[number];
  await setAdminSettings(chatId, settings);

  await ctx.reply(`${UPDATED}\n${spamType} → ${action}`);
});

composer.callbackQuery("admin:setauto", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const settings = (await getAdminSettings(chatId)) ?? defaultAdminSettings();

  const lines = [
    "🤖 Auto-moderation actions:",
    "",
    `• New account links: ${settings.autoActions.newAccountLink}`,
    `• Duplicate messages: ${settings.autoActions.duplicate}`,
    `• Message flood: ${settings.autoActions.flood}`,
    "",
    "To change, type:\n/setauto <type> <action>",
    `\nTypes: ${VALID_TYPES.join(", ")}`,
    `Actions: ${VALID_ACTIONS.join(", ")}`,
  ];

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to admin", "admin:menu")]]);
  await ctx.editMessageText(lines.join("\n"), { reply_markup: kb });
});

export default composer;
