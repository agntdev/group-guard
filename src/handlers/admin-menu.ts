import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { now } from "../clock.js";
import { addActionLog } from "../durable.js";

registerMainMenuItem({ label: "🔧 Admin", data: "admin:menu", order: 50 });

const composer = new Composer<Ctx>();

const adminMenu = inlineKeyboard([
  [inlineButton("⚠️ Warn user", "admin:warn"), inlineButton("🔇 Mute user", "admin:mute")],
  [inlineButton("👢 Kick user", "admin:kick"), inlineButton("🚫 Ban user", "admin:ban")],
  [inlineButton("🛡️ Trust list", "admin:trust")],
  [inlineButton("📝 Set welcome", "admin:setwelcome"), inlineButton("📋 Set rules", "admin:setrules")],
  [inlineButton("🤖 Auto actions", "admin:setauto"), inlineButton("📊 Thresholds", "admin:setthreshold")],
  [inlineButton("📜 Logs", "admin:logs"), inlineButton("📈 Stats", "admin:stats")],
  [inlineButton("📊 Summary", "admin:summary")],
  [inlineButton("⬅️ Back to menu", "menu:main")],
]);

composer.callbackQuery("admin:menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("🔧 Admin tools — pick an action:", { reply_markup: adminMenu });
});

export default composer;
