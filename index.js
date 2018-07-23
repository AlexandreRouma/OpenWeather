const express = require('express');
const app = express();
const fs = require('fs');
const Logger = require('./logger');
const sensor = require('./sensor');
const config = require('./config');
const datalogger = require('./datalogger');

Logger.log('Welcome to OpenWeather!\n');
main();

let currentTemp;
let lastMinute;

let logs_hour = [];

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}

async function main() {
    if (!fs.existsSync('config.json')) {
        config.loaddefault();
        config.saveconfig();
    }
    config.loadconfig();

    Logger.log('Connecting to sensors...');
    try {
        await sensor.init(config.getconfig().SerialPort);
        let info = await sensor.queryInfo();
        if (!info) {
            Logger.panic('Could not connect to the sensors!')
        }
        Logger.ok();
        Logger.log(`Sensor firmware version: ${info.string}\n`);
    }
    catch (e) {
        Logger.failed();
        Logger.panic('Could not connect to sensors!' + e);
    }

    Logger.log('Starting pollers...');
    try {
        setInterval(async() => {
            let temp = await sensor.getTemp();
            if (temp) {
                currentTemp = temp;
            }
        }, 1000);
        setInterval(() => {
            let date = new Date();
            if (date.getSeconds() == 0 && date.getMinutes() != lastMinute) {
                lastMinute = date.getMinutes();
                if (!currentTemp) {
                    return;
                }
                if (logs_hour.length <= 60) {
                    logs_hour.push(currentTemp);
                }
                else {
                    for (let i = 0; i <= 59; i++) {
                        logs_hour[i] = logs_hour[i + 1];
                    }
                    logs_hour[60] = currentTemp;
                }
                dformat = [(date.getDate()).padLeft(),
                        (date.getMonth() + 1).padLeft(),
                        date.getFullYear()].join('/') + ' ' +
                        [date.getHours().padLeft(),
                        date.getMinutes().padLeft(),
                        date.getSeconds().padLeft()].join(':');
                datalogger.log(`${dformat},${currentTemp}\n`);
            }
        }, 100);
        Logger.ok();
    }
    catch (e) {
        Logger.failed();
        Logger.panic('Could not connect pollers!' + e);
    }

    Logger.log('Starting webserver...');
    try {
        app.get('/getTemp', (req, res) => {
            if (currentTemp) {
                res.send(currentTemp.toString());
            }
        });
        
        app.get('/lastHour', (req, res) => {
            if (logs_hour) {
                res.send(JSON.stringify(logs_hour));
            }
        });
        
        app.use(express.static('html'));
        
        app.listen(80, () => {
            console.log('Started!');
        });
    }
    catch (e) {
        Logger.failed();
        Logger.panic('Could start webserver!' + e);
    }
}