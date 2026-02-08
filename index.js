require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events, Partials } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection, generateDependencyReport } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// 1. UPTIME & LOGS (Gereksinim Raporu)
const app = express();
app.get('/', (req, res) => res.send('SASP Altyapı Aktif! 🚨'));
app.listen(process.env.PORT || 3000);
console.log(generateDependencyReport()); // Hata ayıklama için kritik

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.GuildMember, Partials.User]
});

const cfg = {
    token: process.env.TOKEN?.trim(),
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// 2. GELİŞMİŞ SES BAĞLANTISI (ŞİFRELEME ZORLAMALI)
async function maintainVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guild).catch(() => null);
        if (!guild) return;

        // Varsa eski bağlantıyı tamamen söküp at
        const oldConnection = getVoiceConnection(cfg.guild);
        if (oldConnection) oldConnection.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            debug: false // Çok fazla log birikmesini önler
        });

        // Bağlantı durumlarını izle
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
                setTimeout(maintainVoice, 10000);
            }
        });

        connection.on('error', (err) => {
            console.error("[SES HATASI] Motor Yenileniyor:", err.message);
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            setTimeout(maintainVoice, 15000); // 15 saniye soğuma
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[SES] ${cfg.voice} kanalına başarıyla kilitlendi. ✅`);
        });

    } catch (err) {
        setTimeout(maintainVoice, 20000);
    }
}

// 3. AKTİVİTE DÖNGÜSÜ (DÜZGÜN FORMAT)
let cycle = 0;
async function refreshActivity() {
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
    } catch (e) { console.log("Aktivite güncellenemedi."); }
}

// 4. OTOROL & ÖZEL HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Otorol
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) await member.roles.add(role).catch(() => {});
        }
        // Hoşgeldin Mesajı (Senin istediğin format)
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) {
                channel.send(`Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
            }
        }
        refreshActivity();
    } catch (e) {}
});

// 5. BAŞLATICI
client.once(Events.ClientReady, () => {
    console.log(`[SİSTEM] ${client.user.tag} operasyona hazır!`);
    maintainVoice();
    refreshActivity();
    setInterval(refreshActivity, 15000);
});

(async () => {
    await sodium.ready; 
    console.log("[ŞİFRELEME] Libsodium hazırlandı.");
    client.login(cfg.token).catch(e => console.error("[TOKEN] Hatalı!"));
})();
