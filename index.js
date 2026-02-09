require("dotenv").config();

const sodium = require("libsodium-wrappers-sumo");
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

let connection = null;
let reconnecting = false;

// 🔒 ENCRYPTION KİLİDİ
(async () => {
  await sodium.ready;
  console.log("🔐 libsodium SUMO hazır (FULL ENCRYPTION)");
})();

// 🎧 SES BAĞLANTISI
async function connectVoice(guild) {
  if (reconnecting) return;
  reconnecting = true;

  try {
    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) {
      console.log("❌ Ses kanalı bulunamadı");
      reconnecting = false;
      return;
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: false,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    console.log("🎧 Ses kanalına bağlanıldı");

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log("⚠️ Ses koptu, yeniden bağlanılıyor...");
      reconnecting = false;
      setTimeout(() => connectVoice(guild), 3000);
    });

  } catch (err) {
    console.error("❌ Ses bağlantı hatası:", err);
    reconnecting = false;
    setTimeout(() => connectVoice(guild), 5000);
  }
}

// 🤖 BOT HAZIR
client.once("clientReady", async () => {
  console.log(`🤖 Aktif: ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await connectVoice(guild);

  // 🎮 PRESENCE ROTASYON
  const activities = [
    { name: "San Andreas State Police", type: ActivityType.Playing },
    { name: "Devriyeleri İzliyor", type: ActivityType.Watching }
  ];

  let i = 0;
  setInterval(() => {
    client.user.setActivity(activities[i % activities.length]);
    i++;
  }, 15_000);
});

client.login(process.env.TOKEN);
