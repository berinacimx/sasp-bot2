require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  AuditLogEvent,
  ActivityType,
  EmbedBuilder
} = require("discord.js");
const express = require("express");

/* ==================== EXPRESS / UPTIME ==================== */
const app = express();
app.get("/", (_, res) => res.send("Bot aktif"));
app.listen(process.env.PORT || 3000);

/* ==================== CLIENT ==================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.GuildMember]
});

/* ==================== YARDIMCI FONKSİYONLAR ==================== */
const isSafe = (member) => {
  if (!member) return true;
  if (member.id === member.guild.ownerId) return true;

  if (process.env.WHITELIST_USERS) {
    if (process.env.WHITELIST_USERS.split(",").includes(member.id)) return true;
  }

  if (process.env.WHITELIST_ROLES) {
    return member.roles.cache.some(r =>
      process.env.WHITELIST_ROLES.split(",").includes(r.id)
    );
  }

  return false;
};

const punish = async (member) => {
  if (!member.manageable) return;
  await member.roles.set([]);
};

const sendLog = async (guild, text) => {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setDescription(text)
    .setTimestamp();

  ch.send({ embeds: [embed] });
};

/* ==================== READY + PRESENCE ==================== */
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Aktif: ${client.user.tag}`);
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
          type: ActivityType.Playing
        });
      } else {
        client.user.setActivity(
          `Çevrimiçi : ${online}  Üye : ${guild.memberCount}`,
          { type: ActivityType.Watching }
        );
      }

      toggle = !toggle;
    } catch (err) {
      console.error("❌ Presence hatası:", err.message);
    }
  }, 30_000);
});

/* ==================== OTOROL + HOŞ GELDİN ==================== */
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Otorol
    const role = member.guild.roles.cache.get(process.env.AUTOROLE_ID);
    if (role) await member.roles.add(role);

    // Hoş geldin
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
    console.error("❌ Otorol / Hoş geldin hatası:", err);
  }
});

/* ==================== KORUMA SİSTEMİ ==================== */
const guard = async (guild, type, text) => {
  const logs = await guild.fetchAuditLogs({ type, limit: 1 });
  const entry = logs.entries.first();
  if (!entry) return;

  const member = await guild.members.fetch(entry.executor.id);
  if (isSafe(member)) return;

  await punish(member);
  sendLog(guild, `${text}\nYetkili: ${member}`);
};

// Kanal
client.on(Events.ChannelDelete, ch =>
  guard(ch.guild, AuditLogEvent.ChannelDelete, "🧱 **Kanal silindi**")
);
client.on(Events.ChannelCreate, ch =>
  guard(ch.guild, AuditLogEvent.ChannelCreate, "🧱 **Kanal oluşturuldu**")
);

// Rol
client.on(Events.GuildRoleDelete, role =>
  guard(role.guild, AuditLogEvent.RoleDelete, "🧱 **Rol silindi**")
);
client.on(Events.GuildRoleCreate, role =>
  guard(role.guild, AuditLogEvent.RoleCreate, "🧱 **Rol oluşturuldu**")
);
client.on(Events.GuildRoleUpdate, (_, role) =>
  guard(role.guild, AuditLogEvent.RoleUpdate, "🧱 **Rol güncellendi**")
);

// Bot ekleme
client.on(Events.GuildMemberAdd, member => {
  if (!member.user.bot) return;
  guard(
    member.guild,
    AuditLogEvent.BotAdd,
    "🤖 **Yetkisiz bot eklendi**"
  );
});

/* ==================== ERROR GUARD ==================== */
process.on("unhandledRejection", err =>
  console.error("UnhandledRejection:", err)
);
process.on("uncaughtException", err =>
  console.error("UncaughtException:", err)
);

/* ==================== LOGIN ==================== */
client.login(process.env.TOKEN);
