require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');

// -------------------------
// Express server (uptime için)
// -------------------------
const app = express();
app.get('/', (req, res) => res.send('Bot aktif!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} üzerinde çalışıyor`));

// -------------------------
// Discord bot
// -------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// Environment variable’lar
const TOKEN = process.env.TOKEN.trim();
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

// Bot hazır olduğunda
client.once('ready', async () => {
    console.log(`${client.user.tag} giriş yaptı!`);

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;

        // Oynuyor bilgisini ayarla
        client.user.setActivity(`Çevrimiçi: ${onlineMembers} | Toplam: ${totalMembers}`, { type: ActivityType.Watching });
        console.log(`Oynuyor bilgisi ayarlandı: Çevrimiçi: ${onlineMembers} | Toplam: ${totalMembers}`);
    } catch (err) {
        console.error("Oynuyor bilgisini ayarlarken hata:", err);
    }
});

// Otorol + Hoşgeldin mesajı
client.on('guildMemberAdd', async member => {
    try {
        // Otorol
        const role = member.guild.roles.cache.get(ROLE_ID);
        if (role) await member.roles.add(role);

        // Hoşgeldin mesajı
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (channel) {
            await channel.send(`Hoş geldin <@${member.id}>!`);
        }

        // Oynuyor bilgisini güncelle
        const guild = member.guild;
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        client.user.setActivity(`Çevrimiçi: ${onlineMembers} | Toplam: ${totalMembers}`, { type: ActivityType.Watching });

    } catch (err) {
        console.error(err);
    }
});

// Bot login
client.login(TOKEN).catch(err => console.error("Giriş başarısız:", err));
