require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// 1. Şifreleme motorunu hazırla (Encryption hatasını çözer)
(async () => {
    await sodium.ready;
})();

// 2. Express Server (7/24 Uptime için)
const app = express();
app.get('/', (req, res) => res.send('Bot ve Ses Altyapısı Aktif!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SERVER] Port ${PORT} üzerinde çalışıyor.`));

// 3. Discord Bot Altyapısı
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences // Online sayısı için şart
    ]
});

// Ayarlar
const CONFIG = {
    TOKEN: process.env.TOKEN?.trim(),
    GUILD_ID: process.env.GUILD_ID,
    ROLE_ID: process.env.ROLE_ID,
    WELCOME_CHANNEL: process.env.WELCOME_CHANNEL_ID,
    VOICE_CHANNEL: process.env.VOICE_CHANNEL_ID
};

// 4. Fonksiyon: Durum Güncelleme
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const total = guild.memberCount;
        const online = guild.members.cache.filter(m => 
            m.presence && ['online', 'dnd', 'idle'].includes(m.presence.status)
        ).size;

        client.user.setActivity(`Çevrim içi: ${online} | Üye: ${total}`, { 
            type: ActivityType.Watching 
        });
    } catch (err) {
        console.error("[HATA] Aktivite güncellenemedi:", err.message);
    }
}

// 5. Bot Hazır Olduğunda (clientReady)
client.once(Events.ClientReady, async (c) => {
    console.log(`[BOT] ${c.user.tag} olarak giriş yapıldı!`);
    
    // İlk oynuyor durumu
    client.user.setActivity("San Andreas State Police", { type: ActivityType.Playing });

    // Ses kanalına bağlanma işlemi
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const voiceChannel = await guild.channels.fetch(CONFIG.VOICE_CHANNEL);

        if (voiceChannel) {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true, // Kulaklık kapalı
                selfMute: false  // Mikrofon açık
            });

            // Bağlantı durumlarını izle
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (e) {
                    connection.destroy();
                    console.log("[SES] Bağlantı koptu, tekrar deneniyor...");
                }
            });

            console.log(`[SES] ${voiceChannel.name} kanalına bağlanıldı.`);
        }
    } catch (err) {
        console.error("[SES HATA] Kanala bağlanılamadı:", err.message);
    }

    // Döngüsel güncellemeyi başlat
    setInterval(updateActivity, 60000);
});

// 6. Otorol ve Hoş Geldin
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Otorol ver
        const role = member.guild.roles.cache.get(CONFIG.ROLE_ID);
        if (role) await member.roles.add(role);

        // Hoş geldin mesajı
        const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL);
        if (welcomeChannel) {
            await welcomeChannel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        }

        updateActivity();
    } catch (err) {
        console.error("[ÜYE HATA] İşlem yapılamadı:", err.message);
    }
});

// Üye ayrıldığında sayıyı güncelle
client.on(Events.GuildMemberRemove, () => updateActivity());

// 7. Giriş Yap
client.login(CONFIG.TOKEN).catch(err => {
    console.error("[GİRİŞ HATA] Token hatalı veya Intentler kapalı!");
});
