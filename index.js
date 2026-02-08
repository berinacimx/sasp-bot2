require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events, Partials, Options } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. PRO UPTIME SERVİSİ ---
const app = express();
app.get('/', (req, res) => res.status(200).send('SASP Sistemi Aktif. 🚨'));
app.listen(process.env.PORT || 3000);

// --- 2. GÜVENLİ CLİENT YAPILANDIRMASI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.GuildMember, Partials.User],
    makeCache: Options.cacheWithLimits({
        MessageManager: 0, 
        PresenceManager: 100,
        GuildMemberManager: 200
    }),
});

const cfg = {
    token: process.env.TOKEN?.trim(),
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// --- 3. DİNAMİK DURUM DÖNGÜSÜ (15 Sn.) ---
let statusCycle = 0;
async function refreshPresence() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
        
        const statuses = [
            { name: "San Andreas State Police", type: ActivityType.Playing },
            { name: `Aktif: ${online} | Üye: ${guild.memberCount}`, type: ActivityType.Watching }
        ];

        const current = statuses[statusCycle % statuses.length];
        client.user.setPresence({ activities: [current], status: 'online' });
        statusCycle++;
    } catch (e) { /* Sessiz hata yönetimi */ }
}

// --- 4. KESİNTİSİZ SES MOTORU (GELİŞTİRİLMİŞ) ---
async function maintainVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guild).catch(() => null);
        const voiceChannel = await guild?.channels.fetch(cfg.voice).catch(() => null);

        if (!guild || !voiceChannel) {
            console.log("[SES] Sunucu veya kanal bulunamadı, 20sn sonra tekrar denenecek.");
            return setTimeout(maintainVoice, 20000);
        }

        // Eski veya takılı kalmış bağlantıyı temizle
        const existingConn = getVoiceConnection(cfg.guild);
        if (existingConn) existingConn.destroy();

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        // Bağlantı Koptuğunda
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // Yeniden bağlanmak için 5 saniye bekle
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                    console.log("[SES] Bağlantı tamamen koptu, 10sn içinde sıfırdan kurulacak.");
                    setTimeout(maintainVoice, 10000);
                }
            }
        });

        // Hata Aldığında (Döngü kırıcı bekleme eklendi)
        connection.on('error', (err) => {
            console.log("[SES] Bir hata oluştu, motor dinlendiriliyor...");
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            setTimeout(maintainVoice, 15000); // 15 saniye soğuma süresi
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[BAŞARILI] ${voiceChannel.name} kanalına giriş yapıldı ve şifrelendi. ✅`);
        });

    } catch (err) {
        setTimeout(maintainVoice, 20000);
    }
}

// --- 5. OTOROL & HOŞGELDİN ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) await member.roles.add(role).catch(() => {});
        }

        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) {
                channel.send({
                    content: `Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`
                });
            }
        }
        refreshPresence();
    } catch (e) { console.log("Giriş işlemi hatası."); }
});

// --- 6. SİSTEM BAŞLATICI ---
client.once(Events.ClientReady, () => {
    console.log(`[SİSTEM] ${client.user.tag} operasyona hazır!`);
    maintainVoice();
    refreshPresence();
    setInterval(refreshPresence, 15000);
});

// Global Hata Yakalayıcı (Botu ayakta tutar)
process.on('unhandledRejection', (reason) => {
    console.error('Sistem hatası (Yoksayıldı):', reason.message);
});

(async () => {
    console.log("[SİSTEM] Şifreleme modülleri hazırlanıyor...");
    await sodium.ready; 
    client.login(cfg.token);
})();
