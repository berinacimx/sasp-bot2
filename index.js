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

/* ==================== EXPRESS (UPTIME) ==================== */
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
  const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setDescription(text)
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
};

/* ==================== READY + PRESENCE ==================== */
client.once(Events.ClientReady, async (clientUser) => {
  console.log(`🤖 Aktif: ${clientUser.user.tag}`);

  let toggle = false;

  setInterval(async () => {
    try {
      const guild = await clientUser.guilds.fetch(process.env.GUILD_ID);
      await guild.members.fetch({ withPresences: true });

      const online = guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      const total = guild.memberCount;

      if (toggle) {
        clientUser.user.setActivity(
          "San Andreas State Police",
          { type: ActivityType.Playing }
        );
      } else {
        clientUser.user.setActivity(
          `Çevrimiçi : ${online}  Üye : ${total}`,
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
    const role = member.guild.roles.cache.get(process.env.AUTOROLE_ID);
    if (role) await member.roles.add(role);

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
    console.error("❌ Otorol / Hoş geldin hatası:", err);
  }
});

/* ==================== KORUMA SİSTEMİ ==================== */

// 🧱 KANAL SİLME
client.on(Events.ChannelDelete, async (channel) => {
  const logs = await channel.guild.fetchAuditLogs({
    type: AuditLogEvent.ChannelDelete,
    limit: 1
  });
  const entry = logs.entries.first();
  if (!entry) return;

  const member = await channel.guild.members.fetch(entry.executor.id);
  if (isSafe(member)) return;

  await punish(member);
  sendLog(channel.guild, `🧱 **Kanal silme engellendi**\nYetkili: ${member}`);
});

// 🧱 ROL SİLME
client.on(Events.GuildRoleDelete, async (role) => {
  const logs = await role.guild.fetchAuditLogs({
    type: AuditLogEvent.RoleDelete,
    limit: 1
  });
  const entry = logs.entries.first();
  if (!entry) return;

  const member = await role.guild.members.fetch(entry.executor.id);
  if (isSafe(member)) return;

  await punish(member);
  sendLog(role.guild, `🧱 **Rol silme engellendi**\nYetkili: ${member}`);
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
