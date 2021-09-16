// Configs
const prefix = '/';
const token = 'ODg3ODMzNjYwMTQ4MDMxNDg4.YUJ5hw.W7cxYJfLy4EVohcV_F06SWJuzbA';
const botChannelId = 304369307322810368;
const huntersUserId = 158633599774490624;

const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const queue = new Map();

client.once('ready', () => {
    console.log('Bot Ready.');
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
        message.channel.send('Invalid command.');
    }
});

async function execute(message, serverQueue) {
    if (message.channel.id != botChannelId) {
        // Wrong channel, don't respond
        return;
    }

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
    const songInfo = await ytdl.getInfo(args[1]);
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
        message.channel.send(`Added ${song.title} to the queue.`);
        return;
    }
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

client.login(token);

// Start website

const http = require('http');

const hostname = '127.0.0.1';
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('I\'m not really a website. Go away.');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});