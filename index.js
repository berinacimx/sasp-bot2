require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('SASP Sistemi Aktif!'));
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
function connectToVoice() {
    try {
        const guild = client.guilds.cache.get(cfg.guild);
        if (!guild) return;

        // Eski bağlantı kalıntılarını tamamen temizle
        const oldConnection = getVoiceConnection(cfg.guild);
        if (oldConnection) oldConnection.destroy();

        const connection = joinVoiceChannel({
            channelId: cfg.voice,
            guildId: cfg.guild,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log("✅ SASP SES HATTI AKTİF!");
        });

        connection.on('error', () => {
            // Hatayı sadece logla ve 10 saniye sonra sessizce tekrar dene
            connection.destroy();
            setTimeout(connectToVoice, 10000);
        });

        // 15 saniye içinde Ready olmazsa (el sıkışma hatası), zorla yeniden başlat
        setTimeout(() => {
            if (connection.state.status !== VoiceConnectionStatus.Ready) {
                connection.destroy();
                connectToVoice();
            }
        }, 15000);

    } catch (e) {
        setTimeout(connectToVoice, 20000);
    }
}

// --- OTOROL & HOŞGELDİN (SES'TEN BAĞIMSIZ) ---
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) await member.roles.add(cfg.role).catch(() => {});
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (err) { console.log("Giriş işlemi hatası."); }
});

client.once(Events.ClientReady, () => {
    console.log(`🚨 SASP Aktif: ${client.user.tag}`);
    connectToVoice();
    client.user.setActivity("SASP Teşkilatı", { type: ActivityType.Watching });
});

client.login(cfg.token);
