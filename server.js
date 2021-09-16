// Configs
const prefix = '/';
const token = 'ODg3ODMzNjYwMTQ4MDMxNDg4.YUJ5hw.W7cxYJfLy4EVohcV_F06SWJuzbA';

// Packages
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const axios = require('axios');

// Common variables
const client = new Discord.Client();
const queue = new Map();

client.once('ready', () => {
    console.log('Bot ready.');
});

client.once('reconnecting', () => {
    console.log('Bot Reconnecting.');
});

client.once('disconnect', () => {
    console.log('Bot Disconnected.');
});

client.on('message', async message => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        if (serverQueue && serverQueue.songs) {
            serverQueue.songs = [];
        }
        return;
    } else if (message.content.startsWith(`${prefix}queue`)) {
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
        return;
    } else {
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

    const args = message.content.split(' ');

    const watchUrl = args.length > 2 ? await queryApi(args.join(' ').replace(args[0] + ' ', ''), message) : args[1];

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
                var connection = await voiceChannel.join();
                queueConstruct.connection = connection;
                play(message.guild, queueConstruct.songs[0]);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            message.channel.send(`**${song.title}** was added to the queue.`);
            return;
        }
    }).on("error", error => {
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
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Playing: **${song.title}**`);
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('No fuck you, get in the voice chat first to stop the music.');

    if (!serverQueue) return message.channel.send('There\'s no songs in queue dumbass');

    serverQueue.connection.dispatcher.end();
}

const baseApiUrl = 'https://youtube.googleapis.com/youtube/v3';
const apiKey = 'AIzaSyAOBqygUoqQNcOKAiOTptrVBcUY3uu6-Os';

async function queryApi(query, message) {
    try {
        const fullUrl = `${baseApiUrl}/search?part=snippet&q=${query.split(' ').join('+')}&type=video&order=viewCount&key=${apiKey}`;
        const response = await axios.get(fullUrl);
        const searchResults = response.data.items;
        if (searchResults.length == 0) {
            // No results
            message.channel.send(`No results found for \`${query}\``);
            return;
        }

        const watchUrl = `https://www.youtube.com/watch?v=${searchResults[0].id.videoId}`;
        return watchUrl;
    } catch (err) {
        message.channel.send('There was an API error while querying YouTube.');
        console.log(err);
        return false;
    }
}

client.login(token);

// Start website

const http = require('http');
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('I might wake up and any moment! Nahhh I\'m still asleep.');
}).listen(process.env.PORT || 3000, () => {
    console.log('Web server running.');
});