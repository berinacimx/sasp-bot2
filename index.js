require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// 1. EXPRESS & UPTIME AYARI (Railway için şart)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('Bot 7/24 Aktif ve Ses Kanalında!');
});

app.listen(PORT, () => {
    console.log(`[UPTIME] Server ${PORT} portunda hazır.`);
});

// 2. ŞİFRELEME MOTORUNU ÖN-YÜKLEME
(async () => {
    await sodium.ready;
    console.log("[SİSTEM] Şifreleme motoru (libsodium) hazır.");
})();

// 3. BOT AYARLARI
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

const CONFIG = {
    TOKEN: process.env.TOKEN?.trim(),
    GUILD_ID: process.env.GUILD_ID,
    ROLE_ID: process.env.ROLE_ID,
    WELCOME_CHANNEL: process.env.WELCOME_CHANNEL_ID,
    VOICE_CHANNEL: process.env.VOICE_CHANNEL_ID
};

// 4. AKTİVİTE GÜNCELLEME (Çevrim içi sayısını doğru çeker)
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const total = guild.memberCount;
        
        // Cache'deki üyelerden online olanları filtrele
        const online = guild.members.cache.filter(m => 
            m.presence && (m.presence.status !== 'offline')
        ).size;

        client.user.setActivity(`Çevrim içi: ${online} | Üye: ${total}`, { 
            type: ActivityType.Watching 
        });
    } catch (err) {
        console.log("[HATA] Aktivite güncellenirken bir sorun oluştu.");
    }
}

// 5. BOT READY (ClientReady - v15 Uyarılarını Giderir)
client.once(Events.ClientReady, async (c) => {
    console.log(`[BAŞARILI] ${c.user.tag} girişi onaylandı.`);
    
    // Ses Kanalına Bağlanma
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        const voiceChannel = await guild.channels.fetch(CONFIG.VOICE_CHANNEL);

        if (voiceChannel) {
            const connectToVoice = () => {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true, // Kulaklık Kapalı
                    selfMute: false
                });

                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                    } catch (e) {
                        console.log("[SES] Bağlantı koptu, 5 saniye sonra tekrar bağlanıyor...");
                        setTimeout(connectToVoice, 5000);
                    }
                });
            };

            connectToVoice();
            console.log(`[SES] ${voiceChannel.name} kanalına giriş yapıldı.`);
        }
    } catch (err) {
        console.error("[SES HATA]", err.message);
    }

    // Periyodik güncelleme
    updateActivity();
    setInterval(updateActivity, 60000);
});

// 6. OTOROL & HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (CONFIG.ROLE_ID) {
            const role = member.guild.roles.cache.get(CONFIG.ROLE_ID);
            if (role) await member.roles.add(role);
        }

        if (CONFIG.WELCOME_CHANNEL) {
            const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL);
            if (channel) await channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        }
        updateActivity();
    } catch (err) {
        console.error("[ÜYE GİRİŞ HATA]", err.message);
    }
});

client.on(Events.GuildMemberRemove, () => updateActivity());

// 7. BOTU ÇALIŞTIR
client.login(CONFIG.TOKEN).catch(e => {
    console.error("[HATA] Giriş başarısız! Tokeni veya Intentleri kontrol edin.");
});
