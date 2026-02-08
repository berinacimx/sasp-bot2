require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

/**
 * --- 1. UPTIME & EXPRESS ---
 * Railway botun aktif olduğunu bu port sayesinde anlar.
 */
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(PORT, () => console.log(`[OK] Uptime servisi ${PORT} portunda çalışıyor.`));

/**
 * --- 2. BOT YAPILANDIRMASI ---
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Değişkenleri kolaylaştıralım
const config = {
    token: process.env.TOKEN?.trim(),
    guildId: process.env.GUILD_ID,
    roleId: process.env.ROLE_ID,
    welcomeId: process.env.WELCOME_CHANNEL_ID,
    voiceId: process.env.VOICE_CHANNEL_ID
};

/**
 * --- 3. AKTİVİTE GÜNCELLEME (Çevrim içi/Toplam) ---
 */
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(config.guildId);
        const total = guild.memberCount;
        const online = guild.members.cache.filter(m => 
            m.presence && ['online', 'dnd', 'idle'].includes(m.presence.status)
        ).size;

        client.user.setActivity(`Aktif: ${online} | Üye: ${total}`, { type: ActivityType.Watching });
    } catch (e) {
        console.log("[!] Aktivite şu an güncellenemedi.");
    }
}

/**
 * --- 4. SES BAĞLANTISI (7/24) ---
 */
async function connectToVoice() {
    try {
        const guild = await client.guilds.fetch(config.guildId);
        const channel = await guild.channels.fetch(config.voiceId);

        if (!channel) return console.log("[-] Ses kanalı bulunamadı!");

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        // Bağlantı koparsa otomatik tekrar bağlan
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                console.log("[!] Bağlantı koptu, yeniden deneniyor...");
                setTimeout(connectToVoice, 5000);
            }
        });

        console.log(`[+] ${channel.name} ses kanalına girildi.`);
    } catch (err) {
        console.error("[!] Ses hatası:", err.message);
    }
}

/**
 * --- 5. EVENTLER ---
 */
client.once(Events.ClientReady, () => {
    console.log(`[OK] ${client.user.tag} hazır!`);
    
    // Bot açılır açılmaz yapılacaklar
    connectToVoice();
    updateActivity();
    
    // Her 1 dakikada bir sayıları güncelle
    setInterval(updateActivity, 60000);
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Otorol
        if (config.roleId) {
            const role = member.guild.roles.cache.get(config.roleId);
            if (role) await member.roles.add(role);
        }

        // Hoşgeldin
        if (config.welcomeId) {
            const channel = member.guild.channels.cache.get(config.welcomeId);
            if (channel) channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        }
        
        updateActivity();
    } catch (e) {
        console.log("[!] Yeni üye işleminde hata oluştu.");
    }
});

/**
 * --- 6. SİSTEMİ ÇALIŞTIR (Kritik Bölge) ---
 * Hata almamak için önce şifrelemeyi bekletip sonra login yapıyoruz.
 */
(async () => {
    console.log("[...] Şifreleme motoru yükleniyor...");
    await sodium.ready; 
    console.log("[OK] Şifreleme hazır. Bot giriş yapıyor...");
    
    client.login(config.token).catch(err => {
        console.error("[!] Giriş başarısız! TOKEN veya INTENT ayarlarını kontrol et.");
    });
})();
