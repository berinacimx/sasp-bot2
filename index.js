require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  AuditLogEvent,
  PermissionsBitField,
  ActivityType,
  EmbedBuilder
} = require("discord.js");
const express = require("express");

/* ================= EXPRESS ================= */
const app = express();
app.get("/", (_, res) => res.send("Bot aktif"));
app.listen(process.env.PORT || 3000);

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.GuildMember]
});

/* ================= UTILS ================= */
const isSafe = (member) => {
  if (!member) return true;
  if (member.id === member.guild.ownerId) return true;
  if (process.env.WHITELIST_USERS?.split(",").includes(member.id)) return true;

  return member.roles.cache.some(r =>
    process.env.WHITELIST_ROLES?.split(",").includes(r.id)
  );
};

const punish = async (member) => {
  if (!member.manageable) return;
  await member.roles.set([]);
};

const log = async (guild, text) => {
  const channel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setDescription(text)
    .setTimestamp();

  channel.send({ embeds: [embed] });
};

/* ================= READY + PRESENCE ================= */
client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Aktif: ${c.user.tag}`);

  let toggle = false;
  setInterval(async () => {
    const guild = await c.guilds.fetch(process.env.GUILD_ID);
    await guild.members.fetch({ withPresences: true });

    const online = guild.members.cache.filter(
      m => m.presence && m.presence.status !== "offline"
    ).size;

    if (toggle) {
      c.user.setActivity("San Andreas State Police", { type: ActivityType.Playing });
    } else {
      c.user.setActivity(
        `Çevrimiçi : ${online}  Üye : ${guild.memberCount}`,
        { type: ActivityType.Watching }
      );
    }
    toggle = !toggle;
  }, 30_000);
});

/* ================= OTOROL + HOŞ GELDİN ================= */
client.on(Events.GuildMemberAdd, async (member) => {
  const role = member.guild.roles.cache.get(process.env.AUTOROLE_ID);
  if (role) await member.roles.add(role);

  const ch = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
  if (ch) {
    ch.send(
`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

**San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍**`
    );
  }
});

/* ================= GUARD EVENTS ================= */

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
  log(channel.guild, `🧱 **Kanal silme engellendi**\nYetkili: ${member}`);
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
  log(role.guild, `🧱 **Rol silme engellendi**\nYetkili: ${member}`);
});

// 🤖 BOT EKLEME
client.on(Events.GuildMemberAdd, async (member) => {
  if (!member.user.bot) return;

  const logs = await member.guild.fetchAuditLogs({
    type: AuditLogEvent.BotAdd,
    limit: 1
  });
  const entry = logs.entries.first();
  if (!entry) return;

  const executor = await member.guild.members.fetch(entry.executor.id);
  if (isSafe(executor)) return;

  await member.kick();
  await punish(executor);
  log(member.guild, `🤖 **İzinsiz bot engellendi**`);
});

/* ================= ERROR GUARD ================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ================= LOGIN ================= */
client.login(process.env.TOKEN);
