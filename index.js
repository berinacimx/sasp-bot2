require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('SASP Otorol & Hoşgeldin Aktif! 🚨'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const cfg = {
    token: process.env.TOKEN?.trim(),
    guild: process.env.GUILD_ID,
    role: process.env.ROLE_ID,
    welcome: process.env.WELCOME_CHANNEL_ID
};

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (cfg.role) {
            const role = member.guild.roles.cache.get(cfg.role);
            if (role) await member.roles.add(role);
        }
        if (cfg.welcome) {
            const channel = member.guild.channels.cache.get(cfg.welcome);
            if (channel) channel.send(`Sunucumuza hoş geldin <@${member.id}>\nSan Andreas State Police #𝐃𝐄𝐒𝐓𝐀𝐍`);
        }
    } catch (e) { console.log("Otorol hatası."); }
});

client.once(Events.ClientReady, () => {
    console.log(`🚨 SASP Aktif: ${client.user.tag}`);
    client.user.setActivity("SASP Teşkilatı", { type: ActivityType.Watching });
});

client.login(cfg.token);
