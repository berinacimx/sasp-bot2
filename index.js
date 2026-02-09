const sodium = require("libsodium-wrappers");
require("dotenv").config();
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus } = require("@discordjs/voice");
const express = require("express");

// --------------------
// Uptime Server
// --------------------
const app = express();
app.get("/", (_, res) => res.send("Bot aktif"));
app.listen(process.env.PORT || 3000);

// --------------------
// Discord Client
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const {
  TOKEN,
  GUILD_ID,
  VOICE_CHANNEL_ID,
  ROLE_ID,
  WELCOME_CHANNEL_ID
} = process.env;

let connection;

// --------------------
// Voice Connect (STABLE)
// --------------------
async function connectVoice() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    console.log("Ses bağlantısı koptu, yeniden bağlanılıyor...");
    setTimeout(connectVoice, 5000);
  });
}

// --------------------
// Ready
// --------------------
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif`);

  client.user.setActivity(
    "San Andreas State Police",
    { type: ActivityType.Playing }
  );

  await connectVoice();

  setTimeout(updateActivity, 15000);
  setInterval(updateActivity, 60000);
});

// --------------------
// Activity Update
// --------------------
async function updateActivity() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
  const total = guild.memberCount;

  client.user.setActivity(
    `Çevrim içi: ${online} | Üye: ${total}`,
    { type: ActivityType.Watching }
  );
}

// --------------------
// Otorol + Welcome
// --------------------
client.on("guildMemberAdd", async member => {
  const role = member.guild.roles.cache.get(ROLE_ID);
  if (role) await member.roles.add(role);

  const ch = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (ch) ch.send(`Hoş geldin <@${member.id}> 👋`);

  updateActivity();
});
(async () => {
  await sodium.ready;
  console.log("✅ libsodium hazır");
})();

client.login(TOKEN);


