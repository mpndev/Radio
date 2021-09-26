process.env.TZ = 'Europe/Sofia';
const Discord = require('discord.js');
const discordaudio = require('discordaudio');
const ytdl = require('ytdl-core');

const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILD_VOICE_STATES, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS]});

const queue = new Map();

const config = {
    token: process.env.DISCORD_BOT_TOKEN,
    prefix: '',
    embedcolor: `#f7a004`
};

client.once('ready', () => {
    console.log(`Started up at ${new Date().toString()}`);
    client.user.setActivity(`music`, {type: 'LISTENING'});
});

client.on('messageCreate', async message => {
    if(message.author.bot || message.channel.type === `dm`) return;
    if(!message.content.startsWith(config.prefix)) return;

    let args = message.content.substring(config.prefix.length).split(" ");

    const serverQueue = queue.get(message.guild.id);

    switch(args[0].toLowerCase()){
        case 'legend':
            let legendDescription = `\n**To use the player, join in the radio voice channel.**`;
            legendDescription += `\n\n\n**You can type the fallowing COMMANDS:**`;
            legendDescription += `\n\n**list**`;
            legendDescription += `\n - display all songs from the list`;
            legendDescription += `\n\n**play** some_cool_youtube_song_url.com`;
            legendDescription += `\n - add the song to the list.`;
            legendDescription += `\n - If no song is playing now, this song will start.`;
            legendDescription += `\n\n**pause**`;
            legendDescription += `\n - pause the player.`;
            legendDescription += `\n\n**stop**`;
            legendDescription += `\n - stop the player.`;
            legendDescription += `\n\n**resume**`;
            legendDescription += `\n - resume the song.`;
            legendDescription += `\n\n**next**`;
            legendDescription += `\n - go to the next song.`;
            legendDescription += `\n\n**loop**`;
            legendDescription += `\n - repeat current song again and again.`;
            legendDescription += `\n\n**remove** [some list number] or **delete** [some list number]`;
            legendDescription += `\n - choose some number from the **list** to be deleted.`;
            legendDescription += `\n\n**noloop**`;
            legendDescription += `\n - stop the current song loop.`;
            legendDescription += `\n\n**reconnect**`;
            legendDescription += `\n - reconnect to the player to the voice chat.`;

            const legendEmbed = new Discord.MessageEmbed()
              .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
              .setColor(config.embedcolor)
              .setTitle(`HOW TO USE?`)
              .setDescription(legendDescription)
              .setFooter(`(streams and long videos are not supported!)`);
            message.channel.send({embeds: [legendEmbed]}).catch(err => {});
            message.delete();
            break;
        case 'play':
            if(!args[1]) {
              message.channel.send({content: `Please provide a stream url`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!args[1].startsWith("https://") && !args[1].startsWith("http://")) {
              message.channel.send({content: `The provided url is not a valid url!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            const voicechannel = client.channels.cache.find(c => c.name == 'radio');
            if(!voicechannel) {
              message.channel.send({content: `You need to join a voice channel before you can play a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            const permissions = voicechannel.permissionsFor(message.guild.me);
            if(!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
              message.channel.send({content: `I don't have the permissions to play something in this channel!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            const yturl = ytdl.validateURL(args[1]) ? true : false;
            if(!serverQueue){
                const songobject = {
                    url: args[1],
                    youtubeurl: yturl
                };
                const player = new discordaudio.Player(voicechannel);
                const construct = {
                    voicechannel: voicechannel,
                    textchannel: message.channel,
                    songs: [songobject],
                    player: player,
                    loop: false
                };
                queue.set(message.guild.id, construct);
                play(message.guild.id, songobject);
            } else {
                serverQueue.songs.push({url: args[1], youtubeurl: yturl});
                message.channel.send({content: `Your song has been added to the queue!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            }
            message.delete();
            break;
        case 'next':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to skip a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.songs.shift();
            const songobject = serverQueue.songs[0];
            play(message.guild.id, songobject);
            message.channel.send({content: `Song skipped!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'loop':
        case 'noloop':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to enable/disable the loop`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.loop = serverQueue.loop === true ? false : true;
            message.channel.send({content: `Loop is now **${serverQueue.loop === true ? 'enabled' : 'disabled'}**!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'stop':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to stop a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.player.destroy();
            queue.delete(message.guild.id);
            message.channel.send({content: `Successfully stopped the player!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'list':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to see the list`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            var songs = `__**Queue**__`;
            let tot = 1;
            serverQueue.songs.forEach(song => {songs += `\n**[${tot}]** ${song.url}`; ++tot;});
            const queueEmbed = new Discord.MessageEmbed()
            .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
            .setColor(config.embedcolor)
            .setTitle(`Queue`)
            .setDescription(songs);
            message.channel.send({embeds: [queueEmbed]}).catch(err => {}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'remove':
        case 'delete':
            if(!message.member.voice.channel) {
                message.channel.send({content: `You have to be in a voice channel to see the list`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                message.delete();
                return;
            }
            if(!serverQueue) {
                message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                message.delete();
                return;
            }
            if(!args[1]) {
              message.channel.send({content: `Please provide a list number. (you can check the list numbers with **list** command)`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!/^[0-9]*$/.test(args[1])) {
              message.channel.send({content: `The provided value is not list number!`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }

            if (serverQueue.songs[args[1] - 1]) {
                serverQueue.songs.splice((args[1] - 1 ), 1);
                message.channel.send({content: `the song on possition **[${args[1]}]** was removed.`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            }
            else {
              message.channel.send({content: `There is no song on position **[${args[1] - 1}]**.`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            }
            message.delete();
            break;
        case 'pause':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to pause a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.player.pause();
            message.channel.send({content: `Music got paused`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'resume':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to resume a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.player.resume();
            message.channel.send({content: `Music is playing again`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        case 'volume':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to change the volume of a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!args[1]) {
              message.channel.send({content: `Please provide the volume in the second argument of the command`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!isNaN(Number(args[1]))){
                if(Number(args[1]) > 10 || Number(args[1]) < 1) message.channel.send({content: `The volume must be between the number 1-10`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                else {
                    serverQueue.player.volume(Number(args[1]));
                    message.channel.send({content: `The volume has been changed`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                }
            } else if(!args[1].includes("/")) {
              message.channel.send({content: `Invalid volume`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            else {
                let volume = args[1].split("/");
                if(isNaN(Number(volume[0])) || isNaN(Number(args[1]))) {
                  message.channel.send({content: `Invalid volume`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                  message.delete();
                  return;
                }
                if(Number(volume[0]) > Number(volume[1])) {
                  message.channel.send({content: `Invalid volume`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                  message.delete();
                  return;
                }
                serverQueue.player.volume(`${volume[0]}/${volume[1]}`);
                message.channel.send({content: `The volume has been changed`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            }
            message.delete();
            break;
        case 'reconnect':
            if(!message.member.voice.channel) {
              message.channel.send({content: `You have to be in a voice channel to change the volume of a song`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            if(!serverQueue) {
              message.channel.send({content: `There is nothing in the list at the moment`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
              message.delete();
              return;
            }
            serverQueue.player.reconnect(2500);
            message.channel.send({content: `Reconnected :thumbsup:`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            message.delete();
            break;
        default:
          message.delete()
          break;
    }
});

function play(guildId, song){
    const serverQueue = queue.get(guildId);
    serverQueue.player.on('stop', () => {
        if(serverQueue.loop === false) serverQueue.songs.shift();
        play(guildId, serverQueue.songs[0]);
    });
    serverQueue.player.on('play', () => {
        var embed = new Discord.MessageEmbed()
        .setAuthor(client.user.username, client.user.displayAvatarURL({dynamic: true}))
        .setColor(config.embedcolor)
        .setTitle(`Playing a new song`)
        .setDescription(`I am now playing [${serverQueue.songs[0].url}](${serverQueue.songs[0].url})`);
        if(serverQueue.songs[0].youtubeurl === true){
            ytdl.getInfo(serverQueue.songs[0].url).then(info => {
                embed = new Discord.MessageEmbed()
                .setAuthor(client.user.username, client.user.displayAvatarURL({dynamic: true}))
                .setColor(config.embedcolor)
                .setTitle(`Playing ${info.videoDetails.title}`)
                .setDescription(`I am now playing **[${info.videoDetails.title}](${serverQueue.songs[0].url})** by **${info.videoDetails.author.name}**`)
                .setThumbnail(info.videoDetails.thumbnails[0].url);
                serverQueue.textchannel.send({embeds: [embed]}).then(msg => setTimeout(() => {msg.delete()}, 10000));
            }).catch(err => {
                serverQueue.textchannel.send({embeds: [embed]}).then(msg => setTimeout(() => {msg.delete()}, 10000));
                console.log(err);
            });
        } else serverQueue.textchannel.send({embeds: [embed]}).then(msg => setTimeout(() => {msg.delete()}, 10000));
    });
    if(!song){
        serverQueue.player.destroy();
        queue.delete(guildId);
        return;
    }
    serverQueue.player.play(song.url, {
        quality: 'high',
        autoleave: false
    }).catch(err => {
        console.log(err);
        serverQueue.textchannel.send({content: `There was an error while connecting to the voice channel`}).then(msg => setTimeout(() => {msg.delete()}, 10000));
    });
}

client.login(config.token);