require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType
} = require("discord.js");
const express = require("express");

/* -------------------- EXPRESS (Railway / Uptime) -------------------- */
const app = express();
app.get("/", (_, res) => res.send("Bot aktif"));
app.listen(process.env.PORT || 3000);

/* -------------------- CLIENT -------------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember]
});

/* -------------------- READY -------------------- */
client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Aktif: ${c.user.tag}`);

  // 🎮 OYNUYOR
  c.user.setActivity("San Andreas State Police", {
    type: ActivityType.Playing
  });

  // 👀 İZLİYOR (dinamik)
  setInterval(async () => {
    try {
      const guild = await c.guilds.fetch(process.env.GUILD_ID);
      await guild.members.fetch({ withPresences: true });

      const online = guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      const total = guild.memberCount;

      c.user.setActivity(
        `Çevrimiçi : ${online}  Üye : ${total}`,
        { type: ActivityType.Watching }
      );
    } catch (err) {
      console.error("❌ Presence güncellenemedi:", err.message);
    }
  }, 30_000); // 30 saniyede bir günceller
});

/* -------------------- OTOROL + HOŞ GELDİN -------------------- */
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // 🛡️ OTOROL
    const role = member.guild.roles.cache.get(process.env.AUTOROLE_ID);
    if (role) await member.roles.add(role);

    // 👋 HOŞ GELDİN
    const channel = member.guild.channels.cache.get(
      process.env.WELCOME_CHANNEL_ID
    );

    if (channel && channel.isTextBased()) {
      channel.send(
`Sunucumuza hoş geldin 👋  
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

**San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍**`
      );
    }
  } catch (err) {
    console.error("❌ GuildMemberAdd hatası:", err);
  }
});

/* -------------------- ERROR GUARD -------------------- */
process.on("unhandledRejection", err =>
  console.error("UnhandledRejection:", err)
);
process.on("uncaughtException", err =>
  console.error("UncaughtException:", err)
);

/* -------------------- LOGIN -------------------- */
client.login(process.env.TOKEN);
