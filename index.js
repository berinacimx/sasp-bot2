require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('SASP Sistemi Aktif!'));
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

// --- SES BAĞLANTISI (ZORLAMALI) ---
async function maintainVoice() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        const oldConn = getVoiceConnection(cfg.guild);
        if (oldConn) oldConn.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`✅ [BAŞARILI] Ses kanalına kilitlendi!`);
        });

        connection.on('error', (err) => {
            console.error("⚠️ [SİSTEM] Şifreleme hatası yakalandı, tazeleniyor...");
            if (connection) connection.destroy();
            setTimeout(maintainVoice, 15000);
        });

    } catch (e) {
        setTimeout(maintainVoice, 20000);
    }
}

// OTOROL & HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #Destan`);
        }
    } catch (e) {}
});

// AKTİVİTE DÖNGÜSÜ
let cycle = 0;
function refreshStatus() {
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
}

client.once(Events.ClientReady, () => {
    console.log(`[BOT] ${client.user.tag} giriş yaptı.`);
    maintainVoice();
    setInterval(refreshStatus, 20000);
});

(async () => {
    await sodium.ready; 
    client.login(cfg.token);
})();
