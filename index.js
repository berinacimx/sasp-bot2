require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');

// -------------------------
// Express server (uptime için)
// -------------------------
const app = express();
app.get('/', (req, res) => res.send('Bot aktif ve ses sistemleri çalışıyor!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} üzerinde çalışıyor`));

// -------------------------
// Discord Bot Ayarları
// -------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Environment variable kontrolü
if (!process.env.TOKEN) {
    console.error("HATA: .env dosyasında TOKEN bulunamadı!");
    process.exit(1);
}

const TOKEN = process.env.TOKEN.trim();
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// -------------------------
// Fonksiyon: Online/Toplam Üye güncelleme
// -------------------------
async function updateActivity() {
    try {
        if (!GUILD_ID) return;
        const guild = await client.guilds.fetch(GUILD_ID);
        
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => 
            m.presence && (m.presence.status === 'online' || m.presence.status === 'dnd' || m.presence.status === 'idle')
        ).size;

        client.user.setActivity(`Çevrim içi: ${onlineMembers} | Üye: ${totalMembers}`, { type: ActivityType.Watching });
    } catch (err) {
        console.error("Durum güncellenirken hata:", err);
    }
}

// -------------------------
// Bot Hazır Olduğunda (ClientReady)
// -------------------------
client.once(Events.ClientReady, async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı!`);

    client.user.setActivity("San Andreas State Police", { type: ActivityType.Playing });

    try {
        // -------------------------
        // 7/24 Ses Kanalına Bağlan
        // -------------------------
        if (GUILD_ID && VOICE_CHANNEL_ID) {
            const guild = await client.guilds.fetch(GUILD_ID);
            const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

            if (channel) {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true,  // <-- DEĞİŞİKLİK BURADA: Kulaklık kapalı (sağırlaştırılmış)
                    selfMute: false  // Mikrofon açık (konuşabilir)
                });
                console.log(`🔊 ${channel.name} kanalına bağlanıldı (Kulaklık Kapalı).`);
            } else {
                console.log("Ses kanalı bulunamadı.");
            }
        }

        // Aktivite güncelleme döngüsü
        setTimeout(() => {
            updateActivity();
            setInterval(updateActivity, 60000);
        }, 5000);

    } catch (err) {
        console.error("Başlangıç işlemlerinde hata:", err);
    }
});

// -------------------------
// Otorol + Hoşgeldin Mesajı
// -------------------------
client.on(Events.GuildMemberAdd, async member => {
    try {
        if (ROLE_ID) {
            const role = member.guild.roles.cache.get(ROLE_ID);
            if (role) await member.roles.add(role);
        }

        if (WELCOME_CHANNEL_ID) {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (channel) await channel.send(`Hoş geldin <@${member.id}>!`);
        }
        updateActivity();
    } catch (err) {
        console.error("Üye girişinde hata:", err);
    }
});

client.on(Events.GuildMemberRemove, () => updateActivity());

client.login(TOKEN).catch(err => console.error("Giriş başarısız:", err));
