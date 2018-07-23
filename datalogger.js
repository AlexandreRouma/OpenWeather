const fs = require("fs");

module.exports.log = (data) => {
    let date = new Date();
    if (!fs.existsSync('./logs')) {
        fs.mkdirSync('./logs');
    }
    if (!fs.existsSync(`./logs/${date.getFullYear()}`)) {
        fs.mkdirSync(`./logs/${date.getFullYear()}`);
    }
    if (!fs.existsSync(`./logs/${date.getFullYear()}/${(date.getMonth() + 1)}`)) {
        fs.mkdirSync(`./logs/${date.getFullYear()}/${(date.getMonth() + 1)}`);
    }
    fs.appendFileSync(`./logs/${date.getFullYear()}/${(date.getMonth() + 1)}/${date.getDate()}.csv`, data);
};