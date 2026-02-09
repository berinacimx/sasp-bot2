require("dotenv").config();
const sodium = require("libsodium-wrappers");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let voiceConnection = null;

async function connectVoice(guild) {
  try {
    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);
    if (!channel) return;

    voiceConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
      } catch {
        console.log("🔁 Ses koptu, yeniden bağlanılıyor...");
        connectVoice(guild);
      }
    });

    console.log("🎧 Ses kanalına bağlanıldı");
  } catch (err) {
    console.error("Ses bağlantı hatası:", err);
  }
}

(async () => {
  await sodium.ready;
  console.log("✅ libsodium hazır");
})();

client.once("clientReady", async () => {
  console.log(`🤖 Giriş yapıldı: ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  connectVoice(guild);

  const activities = [
    { name: "San Andreas State Police", type: ActivityType.Playing },
    { name: "Sunucu Devriyesi", type: ActivityType.Watching }
  ];

  let i = 0;
  setInterval(() => {
    client.user.setActivity(activities[i % activities.length]);
    i++;
  }, 15000);
});

client.login(process.env.TOKEN);
