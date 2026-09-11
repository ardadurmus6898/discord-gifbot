const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN || 'DISCORD_TOKEN_BURAYA_GELECEK',
  VOICE_CHANNEL_ID: '1547943697398636655',
  CATEGORIES: [
    {
      name: 'RANDOM BANNER',
      channelId: '1547685941471219722',
      subreddits: ['WidescreenWallpaper', 'Animewallpaper', 'wallpaper', 'aesthetic'],
      intervalMinutes: 60 
    },
    {
      name: 'RANDOM PP',
      channelId: '1547685968637722734',
      subreddits: ['animepfp', 'avatars', 'profilepictures', 'pfp'],
      intervalMinutes: 30 
    }
  ]
};

const postedHistory = new Set();

function connectToVoiceChannel() {
  try {
    const voiceChannel = client.channels.cache.get(CONFIG.VOICE_CHANNEL_ID);
    if (!voiceChannel) return console.error('[SES HATA] Ses kanalı bulunamadı!');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        connection.destroy();
        connectToVoiceChannel();
      }
    });
    console.log(`🔊 [SES] Bot "${voiceChannel.name}" kanalına sabitlendi.`);
  } catch (error) {
    console.error('[SES HATA]', error.message);
  }
}

async function fetchAndPostMedia(category) {
  try {
    const channel = await client.channels.fetch(category.channelId);
    if (!channel) return;

    const randomSub = category.subreddits[Math.floor(Math.random() * category.subreddits.length)];
    const response = await fetch(`https://www.reddit.com/r/${randomSub}/hot.json?limit=50`);
    if (!response.ok) return;
    
    const data = await response.json();
    if (!data.data || !data.data.children) return;

    const posts = data.data.children.map(c => c.data);
    const validPosts = posts.filter(post => 
      !post.over_18 && 
      (post.url.endsWith('.gif') || post.url.endsWith('.png') || post.url.endsWith('.jpg') || post.url.endsWith('.jpeg')) &&
      !postedHistory.has(post.url)
    );

    if (validPosts.length === 0) return;
    const selectedPost = validPosts[Math.floor(Math.random() * validPosts.length)];
    
    if (postedHistory.size > 1000) postedHistory.clear();
    postedHistory.add(selectedPost.url);

    await channel.send(selectedPost.url);
    console.log(`✅ [PAYLAŞIM] (${category.name}) -> Kaynak: r/${randomSub}`);
  } catch (error) {
    console.error(`❌ [HATA] ${category.name}:`, error.message);
  }
}

client.once('clientReady', () => {
  console.log(`🤖 ${client.user.tag} aktif!`);
  connectToVoiceChannel();
  CONFIG.CATEGORIES.forEach(category => {
    fetchAndPostMedia(category);
    setInterval(() => fetchAndPostMedia(category), category.intervalMinutes * 60 * 1000);
  });
});

client.login(CONFIG.TOKEN);
