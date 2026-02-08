const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Botunuzun tokenini buraya ekleyin
const TOKEN = 'BOT_TOKEN';
const GUILD_ID = 'SUNUCU_ID';
const WELCOME_CHANNEL_ID = 'HOŞGELDİN_KANAL_ID';
const ROLE_ID = 'OTOROL_ROL_ID';
const VOICE_CHANNEL_ID = 'SES_KANAL_ID';

client.on('ready', async () => {
    console.log(`${client.user.tag} giriş yaptı!`);

    // 7/24 seste kalma
    const guild = client.guilds.cache.get(GUILD_ID);
    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (channel) {
        channel.join().catch(console.error);
    }
});

// Otorol ve hoş geldin mesajı
client.on('guildMemberAdd', async member => {
    try {
        // Otorol
        const role = member.guild.roles.cache.get(ROLE_ID);
        if (role) await member.roles.add(role);

        // Hoş geldin mesajı
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (channel) {
            const msg = await channel.send(`Hoş geldin <@${member.id}>!`);
            setTimeout(() => {
                msg.delete().catch(console.error);
            }, 3000); // 3 saniye sonra sil
        }
    } catch (err) {
        console.error(err);
    }
});

client.login(TOKEN);