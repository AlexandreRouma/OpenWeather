const SerialPort = require('serialport');
const config = require('./config');
const http = require('http');
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

let lastemp = 0.00;

module.exports.getData = () => {
    port.write(new Buffer([0x42, 0x02]));
    return new Promise((res, rej) => {
        handler = (data) => { 
            if (data[0] == 0x69 && data.length == 9) {
                let temp = 0;
                temp |= data[1] << 24;
                temp |= data[2] << 16;
                temp |= data[3] << 8;
                temp |= data[4];

                let pres = 0;
                pres |= data[5] << 24;
                pres |= data[6] << 16;
                pres |= data[7] << 8;
                pres |= data[8];

                try {
                    http.get('http://192.168.0.111:4242/getTemp', (r) => {
                        let data = '';
    
                        // A chunk of data has been recieved.
                        r.on('data', (chunk) => {
                            data += chunk;
                        });
                        
                        // The whole response has been received. Print out the result.
                        r.on('end', () => {
                            lastemp = parseFloat(data);
                            res({
                                temperature: parseFloat(data),//temp / 100,
                                pressure: pres
                            });
                        });
                        
                    })
                }
                catch (e) {
                    res({
                        temperature: lastemp,//temp / 100,
                        pressure: pres
                    });
                }
            }
            //res(undefined);
        };
    });
}