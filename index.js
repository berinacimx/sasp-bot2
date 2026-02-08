require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. Şifreleme Motorunu Manuel Başlat (Hata Çözücü) ---
async function initializeSodium() {
    await sodium.ready;
    console.log("✅ [SİSTEM] Şifreleme motoru (libsodium) aktif edildi.");
}
initializeSodium();

// --- 2. Railway Uptime & Express (Health Check) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot ve Ses Sistemi 7/24 Aktif!'));
app.listen(PORT, () => console.log(`🚀 [UPTIME] Port ${PORT} dinleniyor.`));

// --- 3. Bot Yapılandırması ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Ayarlar (Railway Variables kısmından gelir)
const { TOKEN, GUILD_ID, ROLE_ID, WELCOME_CHANNEL_ID, VOICE_CHANNEL_ID } = process.env;

// --- 4. Aktivite Fonksiyonu ---
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const onlineCount = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        client.user.setActivity(`Üye: ${guild.memberCount} | Aktif: ${onlineCount}`, { type: ActivityType.Watching });
    } catch (e) {
        console.log("⚠️ Aktivite güncellenemedi.");
    }
}

// --- 5. Ana Bot Mantığı ---
client.once(Events.ClientReady, async () => {
    console.log(`🤖 [GİRİŞ] ${client.user.tag} hazır!`);
    
    // Ses Bağlantısı Fonksiyonu (Otomatik Reconnect Özellikli)
    const connectToChannel = async () => {
        try {
            const guild = await client.guilds.fetch(GUILD_ID);
            const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (e) {
                    console.log("🔄 [SES] Bağlantı koptu, yeniden deneniyor...");
                    setTimeout(connectToChannel, 5000);
                }
            });

            console.log("🔊 [SES] Kanalda 7/24 oturum açıldı.");
        } catch (err) {
            console.error("❌ [SES HATA]", err.message);
        }
    };

    connectToChannel();
    updateActivity();
    setInterval(updateActivity, 60000); // 1 dakikada bir güncelle
});

// --- 6. Otorol ve Karşılama ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (ROLE_ID) await member.roles.add(ROLE_ID);
        const welcome = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (welcome) welcome.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        updateActivity();
    } catch (err) {
        console.log("⚠️ Üye işlemi hatası.");
    }
});

client.login(TOKEN?.trim());
