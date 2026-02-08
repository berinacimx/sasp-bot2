require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection, generateDependencyReport } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// Uptime servisi
const app = express();
app.get('/', (req, res) => res.send('SASP Aktif!'));
app.listen(process.env.PORT || 3000);

// SES MOTORU RAPORU (Loglarda kontrol et!)
console.log(generateDependencyReport());

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

// --- GÜVENLİ SES BAĞLANTISI ---
async function maintainVoice() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        // Eski bağlantıyı tamamen temizle
        const oldConn = getVoiceConnection(cfg.guild);
        if (oldConn) oldConn.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        // Bağlantı koptuğunda 10 saniye sonra tekrar dene
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log("[SES] Bağlantı kesildi, tekrar bağlanılıyor...");
            setTimeout(maintainVoice, 10000);
        });

        // Motor hatası alırsa (O meşhur hata)
        connection.on('error', (err) => {
            console.error("[SES MOTOR HATASI] 20 saniye soğuma başlatıldı...");
            if (connection) connection.destroy();
            setTimeout(maintainVoice, 20000);
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[BAŞARILI] Ses kanalına girildi! ✅`);
        });

    } catch (e) {
        setTimeout(maintainVoice, 30000);
    }
}

// --- OTOROL VE HOŞGELDİN ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (e) {}
});

// --- DÜZGÜN AKTİVİTE DÖNGÜSÜ ---
let cycle = 0;
async function updateStatus() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;
        const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;

        if (cycle === 0) {
            client.user.setActivity("San Andreas State Police", { type: ActivityType.Playing });
            cycle = 1;
        } else {
            client.user.setActivity(`Aktif: ${online} | Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
            cycle = 0;
        }
    } catch (e) {}
}

client.once(Events.ClientReady, () => {
    console.log(`[GİRİŞ] ${client.user.tag} aktif.`);
    maintainVoice();
    setInterval(updateStatus, 15000);
});

// SİSTEMİ ÇALIŞTIR
(async () => {
    await sodium.ready;
    client.login(cfg.token);
})();
