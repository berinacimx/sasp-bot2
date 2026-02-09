require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

// UPTIME SERVİSİ
const app = express();
app.get('/', (req, res) => res.send('SASP Ünitesi Aktif! 🚨'));
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
    token: process.env.TOKEN,
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// --- SES BAĞLANTISI (ZORLAMALI DÖNGÜ) ---
function keepVoiceAlive() {
    const guild = client.guilds.cache.get(cfg.guild);
    if (!guild) return;

    try {
        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on('stateChange', (oldState, newState) => {
            console.log(`[SES SİSTEMİ] Durum Değişti: ${oldState.status} -> ${newState.status}`);
        });

        connection.on('error', (error) => {
            console.error("⚠️ Ses motoru sarsıldı, yeniden inşa ediliyor...");
            connection.destroy();
            setTimeout(keepVoiceAlive, 5000);
        });

        // Bağlantı koparsa veya dışarı atılırsa
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            setTimeout(keepVoiceAlive, 5000);
        });

    } catch (e) {
        setTimeout(keepVoiceAlive, 10000);
    }
}

// --- OTOROL & HOŞGELDİN ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Otomatik Rol
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) await member.roles.add(role).catch(() => {});
        }
        
        // Hoşgeldin Mesajı
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) {
                channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
            }
        }
    } catch (e) { console.log("Giriş işlemi hatası."); }
});

// --- DURUM GÜNCELLEME ---
function updateStatus() {
    const guild = client.guilds.cache.get(cfg.guild);
    if (!guild) return;
    const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;

    client.user.setActivity(`Aktif: ${online} | Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
}

// --- BAŞLATMA ---
client.once(Events.ClientReady, () => {
    console.log(`🚨 [SASP] ${client.user.tag} sahada!`);
    keepVoiceAlive();
    updateStatus();
    setInterval(updateStatus, 60000);
});

client.login(cfg.token);
