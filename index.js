require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. UPTIME SERVİSİ (Railway için) ---
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif ve Ses Kanalında!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[UPTIME] Servis ${PORT} portunda hazır.`));

// --- 2. BOT YAPILANDIRMASI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences // Online üye sayısı için şart
    ]
});

// Değişkenleri Çekelim
const cfg = {
    token: process.env.TOKEN?.trim(),
    guildId: process.env.GUILD_ID,
    voiceId: process.env.VOICE_CHANNEL_ID,
    roleId: process.env.ROLE_ID,
    welcomeId: process.env.WELCOME_CHANNEL_ID
};

// --- 3. AKTİVİTE GÜNCELLEME (Çevrim içi / Toplam Üye) ---
async function updateStatus() {
    try {
        const guild = await client.guilds.fetch(cfg.guildId);
        const total = guild.memberCount;
        // Presence intenti açıksa online olanları filtreler
        const online = guild.members.cache.filter(m => 
            m.presence && (m.presence.status === 'online' || m.presence.status === 'dnd' || m.presence.status === 'idle')
        ).size;

        client.user.setActivity(`Aktif: ${online} | Üye: ${total}`, { type: ActivityType.Watching });
    } catch (e) {
        console.log("[STATUS] Güncellenirken hata oluştu.");
    }
}

// --- 4. SES BAĞLANTISI (Kritik Şifreleme Fixli) ---
async function connectToVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guildId);
        const channel = await guild.channels.fetch(cfg.voiceId);

        if (!channel) return console.log("[SES] Kanal bulunamadı.");

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true, // Kulaklık Kapalı
            selfMute: false
        });

        // Şifreleme hatalarını yakala ve botu çökertmeden yeniden bağlan
        connection.on('error', error => {
            console.error("[SES MOTORU] Şifreleme Hatası Yakalandı:", error.message);
            if (error.message.includes('encryption')) {
                setTimeout(connectToVoice, 5000);
            }
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                console.log("[SES] Bağlantı koptu, yeniden deneniyor...");
                setTimeout(connectToVoice, 5000);
            }
        });

        console.log(`[SES] ${channel.name} kanalına bağlanıldı.`);
    } catch (err) {
        console.error("[SES] Hata oluştu:", err.message);
        setTimeout(connectToVoice, 10000);
    }
}

// --- 5. ANA EVENTLER ---
client.once(Events.ClientReady, async () => {
    console.log(`[BOT] ${client.user.tag} başarıyla giriş yaptı.`);
    
    // Ses ve Aktivite Başlat
    connectToVoice();
    updateStatus();
    setInterval(updateStatus, 60000); // 1 dakikada bir güncelle
});

// Otorol ve Karşılama
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.roleId) {
            const role = member.guild.roles.cache.get(cfg.roleId);
            if (role) await member.roles.add(role);
        }
        if (cfg.welcomeId) {
            const channel = member.guild.channels.cache.get(cfg.welcomeId);
            if (channel) channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        }
        updateStatus();
    } catch (e) { console.log("[MEMBER] Yeni üye işlem hatası."); }
});

// --- 6. SİSTEMİ ÇALIŞTIR ---
(async () => {
    try {
        console.log("[SİSTEM] Şifreleme motoru yükleniyor...");
        await sodium.ready; // Hatayı önleyen kritik satır
        console.log("[SİSTEM] Motor hazır. Bot başlatılıyor...");
        await client.login(cfg.token);
    } catch (err) {
        console.error("[KRİTİK HATA] Başlatma başarısız:", err);
    }
})();
