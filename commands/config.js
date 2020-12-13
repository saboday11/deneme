const Discord = require('discord.js');

module.exports.run = async (client, message, args) => {

    const guildSettings = await client.mongoose.models.Guild.findOne({id: message.guild.id});
    if(!guildSettings) client.setGuild(message.guild.id);

    message.channel.send(new Discord.MessageEmbed().setColor(client.colour).addField("Prefix", guildSettings.configuration.prefix, true).addField("Verification Channel", `${message.guild.channels.cache.get(guildSettings.configuration.verificationChannel) ? message.guild.channels.cache.get(guildSettings.configuration.verificationChannel) : 'Not set..'}`, true).addField("Verified Role", `${message.guild.roles.cache.get(guildSettings.configuration.verifiedRole) ? message.guild.roles.cache.get(guildSettings.configuration.verifiedRole) : 'Not set..'}`).setThumbnail(client.user.avatarURL()).setTimestamp());

}
