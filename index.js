require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// Uptime (Railway için şart)
const app = express();
app.get('/', (req, res) => res.send('SASP Online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

const cfg = {
    token: process.env.TOKEN?.trim(),
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// SES BAĞLANTISI
async function stayInVoice() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        // Varsa eskiyi temizle
        const old = getVoiceConnection(cfg.guild);
        if (old) old.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on('error', (err) => {
            console.log("[SES] Hata alındı, 15sn sonra tekrar...");
            setTimeout(stayInVoice, 15000);
        });

    } catch (e) {
        setTimeout(stayInVoice, 20000);
    }
}

// OTOROL & HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (e) {}
});

// AKTİVİTE
async function updateStatus() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;
        client.user.setActivity(`Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
    } catch (e) {}
}

client.once(Events.ClientReady, () => {
    console.log(`[OK] Bot Aktif: ${client.user.tag}`);
    stayInVoice();
    setInterval(updateStatus, 30000);
});

// LOGIN (Kritik Sıralama)
(async () => {
    await sodium.ready; 
    console.log("[SİSTEM] Şifreleme Hazır.");
    client.login(cfg.token);
})();
