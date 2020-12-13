const { Schema, model } = require('mongoose');

const Guild = new Schema({
    id: String,
    configuration: {
        prefix: String,
        verificationChannel: String,
        verifiedRole: String
    }
});

module.exports = model("Guild", Guild);
