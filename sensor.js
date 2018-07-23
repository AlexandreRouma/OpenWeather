const SerialPort = require('serialport');
const config = require('./config');
let port;
let handler;

module.exports.init = (serialport) => {
    port = new SerialPort(serialport, { baudRate: 115200});

    port.on('data', (data) => {
        handler(data);
    });
    return new Promise((res, rej) => {
        setTimeout(res, config.getconfig().PowerOnDelay);
    });
}

module.exports.queryInfo = () => {
    port.write(new Buffer([0x42, 0x01]));
    return new Promise((res, rej) => {
        handler = (data) => {
            if (data[0] == 0x69) {
                res({
                    major: data[1],
                    minor: data[2],
                    build: data[3],
                    string: `${data[1]}.${data[2]}.${data[3]}`
                });
            }
            res(undefined);
        };
    });
}

module.exports.getTemp = () => {
    port.write(new Buffer([0x42, 0x02]));
    return new Promise((res, rej) => {
        handler = (data) => {
            if (data[0] == 0x69 && data.length == 5) {
                let temp = 0;
                temp |= data[1] << 24;
                temp |= data[2] << 16;
                temp |= data[3] << 8;
                temp |= data[4];
                res(temp / 100);
            }
            res(undefined);
        };
    });
}