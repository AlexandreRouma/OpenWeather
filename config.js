const fs = require("fs");

var config = null;
var version = null;
var tags = null;

module.exports.loaddefault = function () {
    config = {
        Port: '80',
        SerialPort: 'INSERT_HERE',
        PowerOnDelay: 1000
    };
    tags = {};
};

module.exports.loadconfig = function () {
    config = JSON.parse(fs.readFileSync("config.json"));
};

module.exports.saveconfig = function () {
    fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
};

module.exports.getconfig = function () {
    return config;
};