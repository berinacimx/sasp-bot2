require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection, entersState } = require('@discordjs/voice');
const express = require('express');

// Uptime için Express
const app = express();
app.get('/', (req, res) => res.send('SASP Operasyon Merkezi Aktif! 🚨'));
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

// --- GÜÇLENDİRİLMİŞ SES BAĞLANTISI ---
async function connectToVoice() {
    const guild = client.guilds.cache.get(cfg.guild);
    if (!guild) return console.log("Sunucu bulunamadı!");

    // Eski bağlantı varsa temizle
    let connection = getVoiceConnection(cfg.guild);
    if (connection) connection.destroy();

    connection = joinVoiceChannel({
        channelId: cfg.voice,
        guildId: cfg.guild,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
    });

    try {
        // 20 saniye içinde 'Ready' olmazsa hata fırlat
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        console.log(`✅ [SES] ${cfg.voice} kanalına başarıyla girildi.`);
    } catch (error) {
        console.error("❌ [HATA] Ses motoru el sıkışamadı, yeniden deneniyor...");
        connection.destroy();
        // Hata durumunda 10 saniye bekle ve tekrar dene
        setTimeout(connectToVoice, 10000);
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5000),
            ]);
        } catch (e) {
            console.log("Bağlantı koptu, tekrar bağlanılıyor...");
            connectToVoice();
        }
    });
}

// OTOROL & HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(e => console.log("Rol verilemedi."));
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (e) { console.log("Giriş işlemi hatası."); }
});

// AKTİVİTE DÖNGÜSÜ
let statusIndex = 0;
function updateStatus() {
    const guild = client.guilds.cache.get(cfg.guild);
    if (!guild) return;
    const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;

    const statuses = [
        { name: "San Andreas State Police", type: ActivityType.Playing },
        { name: `Aktif: ${online} | Üye: ${guild.memberCount}`, type: ActivityType.Watching }
    ];

    client.user.setActivity(statuses[statusIndex]);
    statusIndex = (statusIndex + 1) % statuses.length;
}

client.once(Events.ClientReady, () => {
    console.log(`🚨 [SASP] ${client.user.tag} aktif!`);
    connectToVoice();
    setInterval(updateStatus, 30000);
});

client.login(cfg.token);
