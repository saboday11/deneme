const Discord = require("discord.js"),
      fs = require("fs"),
      mongoose = require("mongoose"),
      express = require("express"),
      strategy = require("passport-discord").Strategy,
      session = require("express-session"),
      passport = require("passport"),
      fetch = require("node-fetch");

const config = require("./config.json");

const client = new Discord.Client();
const app = express();

mongoose.connect(`mongodb://${config.database_ip}:${config.database_port}/${config.database_name}`, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", console.error.bind(console, "[DATABASE] Connection Error:"));
mongoose.connection.once("open", () => console.log("[DATABASE] Connected Successfully"));

require('./Schemas/Guild');

client.admins = new Map([
    ['YOUR', true],
    ['USER', true],
    ['ID', true]
]);
client.mongoose = mongoose;
client.commands = new Discord.Collection();

client.setGuild = function(guildid) {
    if(!guildid) return "no guild id provided";
    if(typeof guildid !== "string") return "provided guild id isnt a string";
    const Guild = new mongoose.models.Guild({
       id: guildid,
       configuration: {
           prefix: '!!',
           verificationChannel: null,
           verifiedRole: null
       }
    }).save();
    return "saved guild to database";
}

fs.readdir("./events/", (err, events) => {
    if(err) return console.log(new Error(err));
    const jsfiles = events.filter(x => x.split(".").pop() === "js");
    console.log(`[EVENTS] Loaded ${jsfiles.length} events.`);
    jsfiles.forEach((f, i) => {
        const event = require(`./events/${f}`);
        client.on(`${f.replace(".js", "")}`, event.bind(null, client));
    });
});

fs.readdir("./commands/", (err, commands) => {
    if(err) return console.log(new Error(err));
    const jsfiles = commands.filter(x => x.split(".").pop() === "js");
    console.log(`[COMMANDS] Loaded ${jsfiles.length} commands.`);
    jsfiles.forEach((f, i) => {
        const command = require(`./commands/${f}`);
        client.commands.set(f.replace(".js", ""), command);
    });
});

passport.serializeUser(function(user, done) {
   done(null, user);
});
passport.deserializeUser(function(obj, done) {
   done(null, obj);
});

passport.use(new strategy({
    clientID: config.client_id,
    clientSecret: config.client_secret,
    callbackURL: config.callback_url,
    scope: config.oauth_scopes
}, function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

app.set("view engine", "ejs");
app.use(session({
    secret: config.session_secret,
    resave: true,
    saveUninitialized: false,
    expire: 3.1709791983765E-11
}));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

app.use("/public", express.static("public"));

const render = async (req, res, template, data = {}) => {
    const application = await client.fetchApplication();
    const owner = await client.users.fetch('322935449305874433'); // DO NOT REMOVE !!!
    res.render(template, Object.assign({ auth: req.isAuthenticated(), user: req.user, cli: client, application, owner }, data));
};

const authOnly = (req, res, next) => {
  if(req.isAuthenticated()) return next();
  else return res.redirect('/');
};

app.get("/auth/login", passport.authenticate("discord", { scope: config.oauth_scopes }), function(req, res) {});
app.get("/auth/callback", passport.authenticate("discord", { failureRedirect: "/"}), async function(req, res) {
    console.log(`[DASHBOARD] ${req.user.username} - Logging in..`);
    const data = { access_token: req.user.accessToken };
    fetch(`https://discord.com/api/guilds/${config.support_server_id}/members/${req.user.id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${config.bot_authentication_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return res.status(200).redirect("/");
});
app.get("/auth/logout", authOnly, async (req, res) => {
    console.log(`[DASHBOARD] ${req.user.username} - Logging out..`);
    req.logout();
    res.redirect("/");
});

app.get("/", (req, res) => {
    render(req, res, "index");
});

app.get("/admin", authOnly, (req, res) => {
    if(!client.admins.has(req.user.id)) return res.status(200).redirect("/");
    render(req, res, "admin");
});

app.get("/dashboard", authOnly, (req, res) => {
    let guildInfo = [];
    req.user.guilds.forEach(async (o, i) => {
        guildInfo.push(o);
    });
    render(req, res, "dashboard", { guildInfo });
});

app.get("/manage/:id", authOnly, async (req, res) => {
    if(!client.guilds.cache.get(req.params.id)) return res.status(200).redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot&guild_id=${req.params.id}`);
    if(!client.guilds.cache.get(req.params.id).members.cache.get(req.user.id).permissions.has("ADMINISTRATOR")) return res.status(200).redirect('/');
    const guildSettings = await mongoose.models.Guild.findOne({id: req.params.id});
    if(!guildSettings) client.setGuild(req.params.id);
    render(req, res, "manage", { guild: client.guilds.cache.get(req.params.id), guildSettings });
});

app.post("/manage/:id", authOnly, async (req, res) => {
   if(!client.guilds.cache.get(req.params.id)) return res.status(200).redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot&guild_id=${req.params.id}`);
   if(!client.guilds.cache.get(req.params.id).members.cache.get(req.user.id).permissions.has("ADMINISTRATOR")) return res.status(200).redirect('/');
   const guildSettings = await mongoose.models.Guild.findOne({id: req.params.id});
   const data = req.body;
   let prefix = data.prefix;
   if(!prefix) prefix = guildSettings.configuration.prefix;
   await mongoose.models.Guild.updateOne({id: req.params.id}, { "$set": { configuration: { prefix: prefix, verificationChannel: data.verificationChannel, verifiedRole: data.verifiedRole } } });
   return res.status(200).json({success: "changed settings"});
});

app.listen(config.listening_port, function() {
    console.log('[DASHBOARD] Booted & ready.');
});
client.login(config.bot_authentication_token);
