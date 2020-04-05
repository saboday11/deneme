module.exports = (client) => {
    client.user.setStatus('idle');
    client.user.setActivity('a dashboard', {type: "WATCHING"});
    console.log('[BOT] Booted & ready.');
}
