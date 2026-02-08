require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');

// -------------------------
// Express server (uptime için)
// -------------------------
const app = express();
app.get('/', (req, res) => res.send('Bot aktif!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} üzerinde çalışıyor`));

// -------------------------
// Discord bot
// -------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Environment variable’lar
const TOKEN = process.env.TOKEN.trim();
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// -------------------------
// Fonksiyon: Online/Toplam Üye güncelleme
// -------------------------
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;

        client.user.setActivity(`Çevrim içi: ${onlineMembers} | Üye: ${totalMembers}`, { type: ActivityType.Watching });
    } catch (err) {
        console.error("Oynuyor bilgisini güncellerken hata:", err);
    }
}

// Bot hazır olduğunda
client.once('ready', async () => {
    console.log(`${client.user.tag} giriş yaptı!`);

    // İlk oynuyor durumu
    client.user.setActivity("San Andreas State Police", { type: ActivityType.Playing });

    try {
        // -------------------------
        // 7/24 Ses Kanalına Bağlan
        // -------------------------
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

        joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        console.log("Ses kanalına bağlandı ve 7/24 kalacak.");

        // İlk 15 saniye sonra oynuyor bilgisini güncelle
        setTimeout(() => {
            updateActivity();
            // Her 1 dakikada tekrar güncelle
            setInterval(updateActivity, 60000);
        }, 15000);

    } catch (err) {
        console.error("Ses kanalına bağlanırken hata:", err);
    }
});

// -------------------------
// Otorol + Hoşgeldin Mesajı
// -------------------------
client.on('guildMemberAdd', async member => {
    try {
        // Otorol
        const role = member.guild.roles.cache.get(ROLE_ID);
        if (role) await member.roles.add(role);

        // Hoşgeldin mesajı
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (channel) {
            await channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        }

        // Oynuyor bilgisini güncelle
        updateActivity();

    } catch (err) {
        console.error(err);
    }
});

// -------------------------
// Bot login
// -------------------------
client.login(TOKEN).catch(err => console.error("Giriş başarısız:", err));

