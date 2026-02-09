require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType
} = require("discord.js");
const express = require("express");

/* ==================== UPTIME ==================== */
const app = express();
app.get("/", (req, res) => res.send("Bot Aktif"));
app.listen(process.env.PORT || 3000);

/* ==================== CLIENT ==================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember]
});

/* ==================== READY + YAYIN ==================== */
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  let toggle = false;

  setInterval(async () => {
    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      await guild.members.fetch({ withPresences: true });

      const online = guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      if (toggle) {
        client.user.setActivity("San Andreas State Police", {
          type: ActivityType.Streaming,
          url: "https://www.twitch.tv/rispectofficial"
        });
      } else {
        client.user.setActivity(
          `Çevrimiçi : ${online}  |  Üye : ${guild.memberCount}`,
          {
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/rispectofficial"
          }
        );
      }

      toggle = !toggle;
    } catch (err) {
      console.error("Presence hatası:", err.message);
    }
  }, 30_000);
});

/* ==================== OTOROL + HOŞ GELDİN ==================== */
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Otorol
    const role = member.guild.roles.cache.get(process.env.AUTOROLE_ID);
    if (role) await member.roles.add(role);

    // Hoş geldin mesajı
    const channel = member.guild.channels.cache.get(
      process.env.WELCOME_CHANNEL_ID
    );

    if (channel && channel.isTextBased()) {
      channel.send(
`👋 Hoş geldin ${member}

Sunucumuza hoş geldin 👋  
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

**San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍**`
      );
    }
  } catch (err) {
    console.error("Hoş geldin hatası:", err.message);
  }
});

/* ==================== LOGIN ==================== */
client.login(process.env.TOKEN);
