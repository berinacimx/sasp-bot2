require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events, Partials } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
const express = require('express');

// --- 1. PRO UPTIME SERVİSİ ---
const app = express();
app.get('/', (req, res) => res.status(200).send('SASP Altyapısı Aktif.'));
app.listen(process.env.PORT || 3000);

// --- 2. ÜST DÜZEY CLİENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.GuildMember, Partials.User],
    makeCache: (manager) => {
        if (manager.name === 'MessageManager') return 0;
        return 50;
    }
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
    } catch (e) { console.log("Durum güncellenemedi."); }
}

// --- 4. KESİNTİSİZ SES MOTORU ---
async function maintainVoice() {
    try {
        const guild = await client.guilds.fetch(cfg.guild);
        const voiceChannel = await guild.channels.fetch(cfg.voice);

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
                connection.destroy();
                setTimeout(maintainVoice, 5000);
            }
        });

        connection.on('error', () => {
            connection.destroy();
            setTimeout(maintainVoice, 5000);
        });

    } catch (err) {
        setTimeout(maintainVoice, 10000);
    }
}

// --- 5. GELİŞMİŞ OTOROL & ÖZEL HOŞGELDİN ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // 1) Otorol Sistemi
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) {
                // Rol verme işlemini dene, yetki hatası varsa yakala
                await member.roles.add(role).catch(() => console.log(`[!] ${member.user.tag} için rol yetkisi yetersiz.`));
            }
        }

        // 2) Özel Hoşgeldin Mesajı
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) {
                channel.send({
                    content: `Sunucumuza hoş geldin <@${member.id}>\nBaşvuru ve bilgilendirme kanallarını incelemeyi unutma.\n\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`
                });
            }
        }
        refreshPresence();
    } catch (e) { console.log("Üye giriş işlemi başarısız."); }
});

// --- 6. SİSTEM BAŞLATICI ---
client.once(Events.ClientReady, () => {
    console.log(`[BAŞARILI] SASP Teşkilatı Botu Aktif: ${client.user.tag}`);
    maintainVoice();
    refreshPresence();
    setInterval(refreshPresence, 15000);
});

// Çökmeyi önleyici global hata yakalayıcı
process.on('unhandledRejection', (reason) => {
    console.error('Yakalanmayan Hata:', reason);
});

(async () => {
    await sodium.ready; 
    client.login(cfg.token);
})();
