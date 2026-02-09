require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType
} = require("discord.js");
const express = require("express");

// ==================== UPTIME ====================
const app = express();
app.get("/", (req, res) => res.send("Bot Aktif - SASP"));
app.listen(process.env.PORT || 3000);

// ==================== CLIENT ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember]
});

// ==================== DURUM DÖNGÜSÜ ====================
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  let toggle = false;

  setInterval(async () => {
    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      if (!guild) return;

      await guild.members.fetch({ withPresences: true }).catch(() => {});

      const online = guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      if (toggle) {
        client.user.setActivity("SASP ❤️ Rispect", {
          type: ActivityType.Streaming,
          url: "https://www.twitch.tv/rispectofficial"
        });
      } else {
        client.user.setActivity(
          `Çevrimiçi : ${online} | Üye : ${guild.memberCount}`,
          {
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/rispectofficial"
          }
        );
      }
      toggle = !toggle;
    } catch (err) {
      console.error("Durum hatası:", err.message);
    }
  }, 30000);
});

// ==================== OTOROL + HOŞ GELDİN ====================
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Otorol
    const roleId = process.env.AUTOROLE_ID;
    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Hoş geldin
    const channelId = process.env.WELCOME_CHANNEL_ID;
    const channel = member.guild.channels.cache.get(channelId);

    if (channel && channel.isTextBased()) {
      const welcomeText = `👋 Hoş geldin ${member}\n\n` +
                          `Sunucumuza hoş geldin 👋\n` +
                          `Başvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\n` +
                          `**San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍**`;
      
      await channel.send(welcomeText).catch(() => {});
    }
  } catch (err) {
    console.error("Hoş geldin hatası:", err.message);
  }
});

// ==================== LOGIN ====================
client.login(process.env.TOKEN);
