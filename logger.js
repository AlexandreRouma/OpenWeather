var OK_LENGTH = 58;

var last_length = 0;

module.exports.log = function (str) {
    var date = new Date();
    process.stdout.write(`[${date.toTimeString().substring(0, 8)}] ${str}`);
    if (str.indexOf("\n") <= -1) {
        last_length = str.length;
    }
};

module.exports.ok = function () {
    var spaces = "";
    for (var i = 0; i < OK_LENGTH - last_length; i++) {
        spaces += " ";
    }
    process.stdout.write(`${spaces}\x1B[0m[  \x1B[32mOK  \x1B[0m]\n`);
};

module.exports.failed = function () {
    var spaces = "";
    for (var i = 0; i < OK_LENGTH - last_length; i++) {
        spaces += " ";
    }
    process.stdout.write(`${spaces}\x1B[0m[\x1B[31mFAILED\x1B[0m]\n`);
};

module.exports.panic = function (str) {
    process.stdout.write(`\x1B[31m${str}\x1B[0m`);
    process.exit(-1);
};