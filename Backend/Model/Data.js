const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
    VideoLink: String,
    NoofCompletion: { type: Number, default: 0 },
    NoOfProgression: { type: Number, default: 0 },
});

const Data = mongoose.model('Data',DataSchema);
module.exports = Data;