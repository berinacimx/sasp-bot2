require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- UPTIME SERVİSİ ---
const app = express();
app.get('/', (req, res) => res.send('Ses Sistemi Fixlendi!'));
app.listen(process.env.PORT || 3000);

// --- BOT YAPILANDIRMASI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

const config = {
    token: process.env.TOKEN?.trim(),
    guildId: process.env.GUILD_ID,
    voiceId: process.env.VOICE_CHANNEL_ID,
    roleId: process.env.ROLE_ID,
    welcomeId: process.env.WELCOME_CHANNEL_ID
};

// --- AKTİVİTE GÜNCELLEME ---
async function updateActivity() {
    try {
        const guild = await client.guilds.fetch(config.guildId);
        const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        client.user.setActivity(`Aktif: ${online} | Üye: ${guild.memberCount}`, { type: ActivityType.Watching });
    } catch (e) { console.log("Aktivite hatası"); }
}

// --- SES BAĞLANTISI (RECONNECT DESTEKLİ) ---
async function stayInVoice() {
    try {
        const guild = client.guilds.cache.get(config.guildId);
        const voiceChannel = guild.channels.cache.get(config.voiceId);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
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
                console.log("Bağlantı koptu, 5 saniye sonra tekrar giriliyor...");
                setTimeout(stayInVoice, 5000);
            }
        });
    } catch (err) {
        console.log("Ses kanalı hatası, 10 saniye sonra tekrar denenecek...");
        setTimeout(stayInVoice, 10000);
    }
}

// --- HAZIR OLDUĞUNDA ---
client.once(Events.ClientReady, () => {
    console.log(`[+] ${client.user.tag} aktif.`);
    stayInVoice();
    updateActivity();
    setInterval(updateActivity, 60000);
});

// --- KARŞILAMA VE OTOROL ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (config.roleId) {
            const role = member.guild.roles.cache.get(config.roleId);
            if (role) await member.roles.add(role);
        }
        const channel = member.guild.channels.cache.get(config.welcomeId);
        if (channel) channel.send(`Sunucumuza hoş geldin 👋
Başvuru ve bilgilendirme kanallarını incelemeyi unutma.

San Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍 <@${member.id}>!`);
        updateActivity();
    } catch (e) { console.log("Üye giriş hatası"); }
});

// --- ÇALIŞTIR ---
(async () => {
    try {
        await sodium.ready; // Şifrelemeyi bekle
        await client.login(config.token);
    } catch (err) {
        console.error("Başlatma hatası:", err);
    }
})();
