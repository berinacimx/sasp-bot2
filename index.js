require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const express = require("express");

/* -------------------- EXPRESS (Railway Health) -------------------- */
const app = express();
app.get("/", (_, res) => res.send("✅ Bot ayakta"));
app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Healthcheck aktif");
});

/* -------------------- DISCORD CLIENT -------------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* -------------------- READY -------------------- */
client.once(Events.ClientReady, (c) => {
  console.log(`🤖 Aktif: ${c.user.tag}`);
});

/* -------------------- MESSAGE HANDLER -------------------- */
client.on(Events.MessageCreate, (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!ping") {
    msg.reply("🏓 Pong!");
  }

  if (msg.content === "!status") {
    msg.reply("✅ Sistem stabil, ses altyapısı kapalı.");
  }
});

/* -------------------- ERROR HANDLING -------------------- */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

/* -------------------- LOGIN -------------------- */
client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Login başarısız:", err);
});
