require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

/**
 * 1. ŞİFRELEME MOTORU (EN ÖNEMLİ KISIM)
 * Botun ses motorunu başlatmadan önce şifreleme kütüphanesini hazırlıyoruz.
 */
async function startBot() {
    await sodium.ready;
    console.log("✅ [SİSTEM] Libsodium başarıyla hazırlandı.");
    
    // Botu şimdi başlatıyoruz
    client.login(process.env.TOKEN?.trim()).catch(err => {
        console.error("❌ [LOGIN] Giriş başarısız! Tokeni kontrol et.");
    });
}

/**
 * 2. UPTIME & EXPRESS
 * Railway'in 'Health Check' sistemine yanıt verir, kapanmayı engeller.
 */
const app = express();
app.get('/', (req, res) => res.status(200).send('Bot 7/24 Aktif!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 [SERVER] Port ${PORT} aktif.`));

/**
 * 3. BOT YAPILANDIRMASI
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Değişkenleri kısaltalım
const cfg = {
    guild: process.env.GUILD_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID,
    voice: process.env.VOICE_CHANNEL_ID
};

/**
 * 4. AKTİVİTE GÜNCELLEME
 */
async function refreshPresence() {
    try {
        const guild = await client.guilds.fetch(cfg.guild);
        const total = guild.memberCount;
        const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        
        client.user.setActivity(`Aktif: ${online} | Üye: ${total}`, { type: ActivityType.Watching });
    } catch (e) {
        console.log("⚠️ Durum güncellenirken hata oluştu (Muhtemelen Intentler kapalı).");
    }
}

/**
 * 5. SES BAĞLANTISI (RECONNECT DESTEKLİ)
 */
async function connectVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guild);
        const channel = await guild.channels.fetch(cfg.voice);

        if (!channel) return console.error("❌ [SES] Kanal bulunamadı!");

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // Eğer manuel çıkılmadıysa 5 sn içinde geri dönmeyi dene
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                console.log("🔄 [SES] Bağlantı koptu, yeniden bağlanılıyor...");
                setTimeout(connectVoice, 5000);
            }
        });

        console.log(`🔊 [SES] ${channel.name} kanalına girildi.`);
    } catch (err) {
        console.error("❌ [SES HATA]", err.message);
    }
}

/**
 * 6. EVENTLER
 */
client.once(Events.ClientReady, () => {
    console.log(`🤖 [BOT] ${client.user.tag} aktif!`);
    connectVoice();
    refreshPresence();
    setInterval(refreshPresence, 60000); // 1 dk bir güncelle
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) await member.roles.add(role);
        }
        
        const channel = member.guild.channels.cache.get(cfg.welcome);
        if (channel) channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        
        refreshPresence();
    } catch (e) {
        console.log("⚠️ Karşılama hatası.");
    }
});

// Botu çalıştır
startBot();
