module.exports = async (client, message) => {

    const guildSettings = await client.mongoose.models.Guild.findOne({id: message.guild.id});
    if(!guildSettings) client.setGuild(message.guild.id);

    let prefix = guildSettings.configuration.prefix;

    if(message.author.bot) return;
    if(!message.content.startsWith(prefix)) return;
    if(message.channel.type === "dm") return;

    const args = message.content.slice(prefix.length).split(/ +/g);
    const command = args.shift().toLowerCase();

    if(!client.commands.get(command)) return;

    try {
        require(`../commands/${command}.js`).run(client, message, args);
    } catch(err) {
        //console.error(err);
    }

}
