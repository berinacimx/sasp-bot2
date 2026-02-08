require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events, Partials, Options } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. UPTIME SERVİSİ ---
const app = express();
app.get('/', (req, res) => res.send('SASP Sistemi Aktif!'));
app.listen(process.env.PORT || 3000);

// --- 2. GÜVENLİ CLİENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.GuildMember, Partials.User],
    makeCache: Options.cacheWithLimits({ MessageManager: 0 })
});

const cfg = {
    token: process.env.TOKEN?.trim(),
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// --- 3. EN DÜZGÜN AKTİVİTE DÖNGÜSÜ ---
let statusIndex = 0;
async function rotatePresence() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;

        const list = [
            { name: "San Andreas State Police", type: ActivityType.Playing },
            { name: `Aktif: ${online} | Üye: ${guild.memberCount}`, type: ActivityType.Watching }
        ];

        const current = list[statusIndex % list.length];
        client.user.setActivity(current.name, { type: current.type });
        statusIndex++;
    } catch (e) { console.log("Aktivite hatası."); }
}

// --- 4. ZIRHLI SES BAĞLANTISI ---
async function stayInVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guild).catch(() => null);
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

        connection.on('error', () => {
            console.log("[SES] Motor hatası, 15sn sonra yeniden denenecek.");
            setTimeout(stayInVoice, 15000);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            setTimeout(stayInVoice, 5000);
        });

    } catch (e) { setTimeout(stayInVoice, 10000); }
}

// --- 5. OTOROL & ÖZEL HOŞGELDİN ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) {
                channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
            }
        }
        rotatePresence();
    } catch (e) {}
});

// --- 6. SİSTEM BAŞLATICI ---
client.once(Events.ClientReady, () => {
    console.log(`[OK] SASP Botu Aktif: ${client.user.tag}`);
    stayInVoice();
    rotatePresence();
    setInterval(rotatePresence, 15000); // 15 saniyede bir değişir
});

(async () => {
    await sodium.ready; 
    console.log("[SİSTEM] Şifreleme modülleri yüklendi.");
    client.login(cfg.token).catch(() => console.log("Token hatalı!"));
})();
