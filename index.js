require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('SASP Operasyon Hattı Aktif!'));
app.listen(process.env.PORT || 3000);

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
    guild: process.env.GUILD_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

// --- AGRESİF SES BAĞLANTISI ---
async function connectToSASP() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return console.log("Sunucu bulunamadı!");

        // Varsa eski bağlantıyı temizle
        const old = getVoiceConnection(cfg.guild);
        if (old) old.destroy();

        console.log("Bağlantı protokolü başlatılıyor...");
        
        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        // Hata yakalayıcı
        connection.on('error', error => {
            console.log("⚠️ Şifreleme motoru yanıt vermedi, 5 saniye sonra bypass denenecek.");
            connection.destroy();
            setTimeout(connectToSASP, 5000);
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log("✅ SASP SES HATTI AKTİF!");
        });

        // Eğer 15 saniye içinde Ready olmazsa otomatik yenile
        setTimeout(() => {
            if (connection.state.status !== VoiceConnectionStatus.Ready) {
                console.log("⚠️ Bağlantı zaman aşımı, protokol yenileniyor...");
                connection.destroy();
                connectToSASP();
            }
        }, 15000);

    } catch (e) {
        console.log("Kritik hata: " + e.message);
    }
}

// OTOROL VE HOŞGELDİN
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (e) {}
});

client.once(Events.ClientReady, () => {
    console.log(`🚨 SASP Aktif: ${client.user.tag}`);
    connectToSASP();
    client.user.setActivity("SASP Teşkilatı", { type: ActivityType.Watching });
});

client.login(cfg.token);
