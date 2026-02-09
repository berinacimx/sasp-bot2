require("dotenv").config();

const sodium = require("libsodium-wrappers-sumo");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus } = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let connection = null;
let reconnecting = false;

/* 🔐 SODIUM KİLİDİ */
(async () => {
  await sodium.ready;
  console.log("🔐 libsodium SUMO hazır");
})();

/* 🎧 SES BAĞLANTISI */
async function connectVoice(guild) {
  if (reconnecting) return;
  reconnecting = true;

  try {
    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) {
      console.log("❌ Ses kanalı bulunamadı veya voice değil");
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

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log("🎧 Ses bağlantısı hazır");
      reconnecting = false;
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Ses koptu, tekrar bağlanılıyor...");
      reconnecting = false;
      setTimeout(() => connectVoice(guild), 5000);
    });

  } catch (err) {
    console.error("❌ Ses bağlantı hatası:", err);
    reconnecting = false;
    setTimeout(() => connectVoice(guild), 7000);
  }
}

/* 🤖 BOT HAZIR */
client.once("clientReady", async () => {
  console.log(`🤖 Aktif: ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  connectVoice(guild);

  /* 🎮 PRESENCE ROTASYONU */
  const activities = [
    { name: "San Andreas State Police", type: ActivityType.Playing },
    { name: "Devriyeleri İzliyor", type: ActivityType.Watching }
  ];

  let i = 0;
  setInterval(() => {
    client.user.setActivity(activities[i % activities.length]);
    i++;
  }, 15000);
});

client.login(process.env.TOKEN);
