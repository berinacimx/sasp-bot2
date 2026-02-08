require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Express server (Uptime Robot için)
const app = express();
app.get('/', (req, res) => res.send('Bot aktif!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} üzerinde çalışıyor`));

// Discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // Sunucu bilgileri için gerekli
        GatewayIntentBits.GuildMembers,     // Otorol ve hoşgeldin mesajı için gerekli
        GatewayIntentBits.GuildMessages,    // Kanal mesajları için gerekli
        GatewayIntentBits.GuildVoiceStates  // Ses kanallarında botu aktif tutmak için gerekli
        // MessageContent sadece içerik okumak için eklenebilir
    ]
});

// ID’leri env’den al
const TOKEN = process.env.TOKEN.trim();
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// Bot hazır olduğunda
client.on('ready', async () => {
    console.log(`${client.user.tag} giriş yaptı!`);

    // 7/24 seste kalma
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
        if (channel) {
            await channel.join().catch(console.error);
        }
    } catch (err) {
        console.error("Ses kanalına bağlanırken hata:", err);
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
            const msg = await channel.send(`Hoş geldin <@${member.id}>!`);
            setTimeout(() => msg.delete().catch(console.error), 3000);
        }
    } catch (err) {
        console.error(err);
    }
});

// Bot login
client.login(TOKEN).catch(err => console.error("Giriş başarısız:", err));
