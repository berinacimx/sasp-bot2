require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection, entersState } = require('@discordjs/voice');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('SASP 7/24 Kesintisiz Hat!'));
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

// --- AGRESİF SES MOTORU ---
async function connectWithRetry() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        // Varsa eskiyi yok et
        const existing = getVoiceConnection(cfg.guild);
        if (existing) existing.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            group: client.user.id // Bağlantıyı botun id'sine kilitle
        });

        // El sıkışma denetimi
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
            console.log(`✅ SASP Ünitesi ${cfg.voice} kanalına sızdı.`);
        } catch (err) {
            console.log("⚠️ El sıkışma başarısız, protokol yenileniyor...");
            connection.destroy();
            setTimeout(connectWithRetry, 5000);
        }

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            setTimeout(connectWithRetry, 5000);
        });

    } catch (e) {
        console.log("Motor hatası kritik: ", e.message);
    }
}

// OTOROL VE HOŞGELDİN
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
function setSASPStatus() {
    const guild = client.guilds.cache.get(cfg.guild);
    if (!guild) return;
    const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    
    client.user.setActivity(`Aktif: ${online} | Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
}

client.once(Events.ClientReady, () => {
    console.log(`🚨 [SASP] ${client.user.tag} sahada.`);
    connectWithRetry();
    setInterval(setSASPStatus, 60000);
});

client.login(cfg.token);
