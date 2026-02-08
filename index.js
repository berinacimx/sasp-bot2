require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. UPTIME SERVİSİ ---
const app = express();
app.get('/', (req, res) => res.send('Ses Sistemi Fixlendi! 🚀'));
app.listen(process.env.PORT || 3000);

// --- 2. BOT YAPILANDIRMASI ---
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
    guildId: process.env.GUILD_ID,
    voiceId: process.env.VOICE_CHANNEL_ID,
    roleId: process.env.ROLE_ID,
    welcomeId: process.env.WELCOME_CHANNEL_ID
};

// --- 3. AKTİVİTE GÜNCELLEME ---
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(cfg.guildId);
        const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        client.user.setActivity(`Aktif: ${online} | Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
    } catch (e) { console.log("Aktivite güncellenemedi."); }
}

// --- 4. SES BAĞLANTISI (KESİN ÇÖZÜM DÖNGÜSÜ) ---
async function stayInVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guildId);
        const channel = await guild.channels.fetch(cfg.voiceId);

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
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (e) {
                console.log("🔄 Bağlantı koptu, 5 saniye içinde geri dönülüyor...");
                setTimeout(stayInVoice, 5000);
            }
        });

        // Hata yakalayıcı (Encryption hatasını burada hapseder)
        connection.on('error', (error) => {
            console.error("⚠️ Ses Motoru Hatası:", error.message);
            if (error.message.includes('encryption')) {
                console.log("🛠️ Şifreleme hatası saptandı, motor yeniden başlatılıyor...");
                connection.destroy();
                setTimeout(stayInVoice, 10000);
            }
        });

    } catch (err) {
        console.log("❌ Kanala bağlanılamadı, 10 saniye sonra tekrar denenecek.");
        setTimeout(stayInVoice, 10000);
    }
}

// --- 5. EVENTLER ---
client.once(Events.ClientReady, () => {
    console.log(`✅ [GİRİŞ] ${client.user.tag} aktif.`);
    stayInVoice();
    updateActivity();
    setInterval(updateActivity, 60000);
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.roleId) await member.roles.add(cfg.roleId);
        const welcome = member.guild.channels.cache.get(cfg.welcomeId);
        if (welcome) welcome.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        updateActivity();
    } catch (e) { console.log("Üye giriş işlemi aksadı."); }
});

// --- 6. ÇALIŞTIR ---
(async () => {
    await sodium.ready; // Libsodium'un hazır olmasını bekle
    client.login(cfg.token);
})();
