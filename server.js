// Packages
// ===============

const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const axios = require('axios');

// Discord Bot
// ===============

const prefix = '/';
const client = new Discord.Client();
const queue = new Map();

client.on('message', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
    const command = message.content.split(' ')[0].replace(prefix, '');

    switch (command) {
        case 'play':
            execute(message, serverQueue);
            break;
        case 'skip':
            stop(message, serverQueue);
            break;
        case 'stop':
            stop(message, serverQueue);
            if (serverQueue && serverQueue.songs) serverQueue.songs = [];
            break;
        case 'queue':
            listQueue(message, serverQueue);
            break;
        default:
            message.channel.send(`\`${message.content.split(' ')}\` is not a command.`);
    }
});

async function execute(message, serverQueue) {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
        // Sender is not in voice chat
        message.channel.send('No fuck you, get in the voice chat to add songs.');
        return;
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        message.channel.send('I don\'t have permission to play in your voice channel.');
        return;
    }

    const msgContent = message.content;
    const msgArgs = msgContent.split(' ');
    const query = msgContent.replace(msgArgs[0], '').trim();
    const watchUrl = ytdl.validateURL(query) ? msgArgs[1] : await queryApi(query, message);

    if (!watchUrl) return;

    ytdl(watchUrl).on('info', async (songInfo) => {
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        if (!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(message.guild.id, queueConstruct);

            queueConstruct.songs.push(song);

            try {
                queueConstruct.connection = await voiceChannel.join();
                play(message.guild, queueConstruct.songs[0]);
            } catch (error) {
                console.error(error);
                queue.delete(message.guild.id);
                return message.channel.send(`Bot failed to join the chat and or to play a song:\n${error}`);
            }
        } else {
            serverQueue.songs.push(song);
            message.channel.send(`**${song.title}** was added to the queue.`);
            return;
        }
    }).on('error', (error) => {
        message.channel.send(`There was an error with your search criteria. I only accept youtube links right now.`);
        console.error(error.stack);
        return;
    });
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    serverQueue.songs.shift();

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on('finish', () => {
            play(guild, serverQueue.songs[0]);
        })
        .on('error', (error) => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Playing: **${song.title}** ${song.url}`);
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('No fuck you, get in the voice chat first to stop the music.');

    if (!serverQueue) return message.channel.send('There\'s no songs in queue dumbass');

    serverQueue.connection.dispatcher.end();
}

function listQueue(message, serverQueue) {
    if (!serverQueue || serverQueue.songs.length == 0) {
        message.channel.send('There\'s no songs in the queue.');
        return;
    }

    const songs = serverQueue.songs;
    let queueList = songs.length + ' songs in queue:\n';
    songs.map(song => {
        queueList += `\n ${songs.indexOf(song) + 1}: ${song.title}`;
    });
    message.channel.send(queueList);
}

// Youtube API
// ===============

const youtubeApiKey = process.env.YOUTUBE_API_TOKEN;
const baseApiUrl = 'https://youtube.googleapis.com/youtube/v3';

async function queryApi(query, message) {
    const fullUrl = `${baseApiUrl}/search?part=snippet&q=${query.split(' ').join('+')}&type=video&order=viewCount&key=${youtubeApiKey}`;

    try {
        const response = await axios.get(fullUrl);
        const searchResults = response.data.items;

        if (searchResults.length == 0) {
            message.channel.send(`No results found for \`${query}\``);
            return;
        }

        return `https://www.youtube.com/watch?v=${searchResults[0].id.videoId}`;
    } catch (error) {
        message.channel.send('There was an API error while querying YouTube.');
        console.error(error);
        return false;
    }
}

// Start discord bot
// ===============

client.once('ready', () => { console.log('Discord bot ready.'); });
client.once('reconnecting', () => { console.log('Discord bot reconnecting.'); });
client.once('disconnect', () => { console.log('Discord bot disconnected.'); });
client.login(process.env.DISCORD_BOT_TOKEN);

// Start website
// ===============

const http = require('http');
http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('I might wake up and any moment! Nahhh I\'m still asleep.');
}).listen(process.env.PORT || 3000, () => {
    console.log('Web server running.');
});