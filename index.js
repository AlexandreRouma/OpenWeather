const express = require('express');
const app = express();
const fs = require('fs');
const Logger = require('./logger');
const sensor = require('./sensor');
const config = require('./config');
const datalogger = require('./datalogger');
const cookieParser = require('cookie-parser');
const md5 = require('md5');
const passwordHash = require('password-hash');
const bodyParser = require('body-parser');
const os = require('os');

Logger.log('Welcome to OpenWeather!\n');
main();

let currentData;
let lastMinute;

let logs = [];

let second_logs = [];

let sessions = [];

let version = '2.1.0';
let firm_ver;

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
        firm_ver = info;
        Logger.ok();
        Logger.log(`Sensor firmware version: ${info.string}\n`);
    }
    catch (e) {
        Logger.failed();
        Logger.panic('Could not connect to sensors!' + e);
    }

    if (fs.existsSync('./logs')) {
        Logger.log('Loading past data...');
        try {
            let old = new Date();
            old.setFullYear(old.getFullYear() - 1);
            let currentDate = old;
            let now = new Date();
            while (old <= now) {
                let y = currentDate.getFullYear();
                let m = currentDate.getMonth() + 1;
                let d = currentDate.getDate();
                if (fs.existsSync(`./logs/${y}/${m}/${d}.csv`)) {
                    let logfile = fs.readFileSync(`./logs/${y}/${m}/${d}.csv`).toString();
                    logfile.split('\n').forEach((l) => {
                        if (l != '') {
                            let args = l.split(',');
                            let datetime = args[0].split(' ');
                            let date = datetime[0].split('/');
                            let time = datetime[1].split(':');
                            let timestamp = new Date(date[2], date[1] - 1, date[0], time[0], time[1], time[2]);
                            let temperature = parseFloat(args[1]);
                            let pressure = parseInt(args[2]);
                            logs.push({
                                timestamp: timestamp,
                                temperature: temperature,
                                pressure: pressure
                            });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1)
            }
            Logger.ok();
            Logger.log(`Loaded ${logs.length} minutes of data!\n`);
        }
        catch (e) {
            Logger.failed();
            Logger.log('Could not load past data!' + e + '\n');
        }
    }

    Logger.log('Starting pollers...');
    try {
        setInterval(async() => {
            let data = await sensor.getData();
            if (data) {
                currentData = data;
                currentData.timestamp = new Date();
                if (second_logs.length <= 60) {
                    second_logs.push(currentData);
                }
                else {
                    for (let i = 0; i <= 59; i++) {
                        second_logs[i] = second_logs[i + 1];
                    }
                    second_logs[60] = currentData;
                }
            }
        }, 1000);
        setInterval(() => {
            let date = new Date();
            if (date.getSeconds() == 0 && date.getMinutes() != lastMinute) {
                lastMinute = date.getMinutes();
                if (second_logs.length == 0) {
                    return;
                }
                let temperature = 0;
                let pressure = 0;
                second_logs.forEach((e) => {
                    temperature += e.temperature;
                    pressure += e.pressure;
                });
                temperature /= second_logs.length;
                pressure /= second_logs.length;
                let new_data = {
                    timestamp: second_logs[Math.floor(second_logs.length / 2)].timestamp,
                    temperature: Math.round(temperature * 100) / 100,
                    pressure: Math.round(pressure * 100) / 100
                }
                if (logs.length <= 525600) {
                    logs.push(new_data);
                }
                else {
                    for (let i = 0; i <= 525599; i++) {
                        logs[i] = logs[i + 1];
                    }
                    logs[525600] = new_data;
                }
                dformat = [(date.getDate()).padLeft(),
                        (date.getMonth() + 1).padLeft(),
                        date.getFullYear()].join('/') + ' ' +
                        [date.getHours().padLeft(),
                        date.getMinutes().padLeft(),
                        date.getSeconds().padLeft()].join(':');
                datalogger.log(`${dformat},${new_data.temperature},${new_data.pressure}\n`);
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
        app.use(cookieParser());
        app.use(bodyParser.urlencoded({ extended: false }))

        // Protection
        app.all('/Dashboard', verifyLogin);
        app.all('/Dashboard/index.html', verifyLogin);
        app.all('/Users', verifyLogin);
        app.all('/Users/index.html', verifyLogin);
        app.all('/register', verifyLogin);
        app.all('/register/index.html', verifyLogin);
        app.all('/server/register', verifyLogin);
        app.all('/server/logout', verifyLogin);
        app.all('/server/getData', verifyLogin);
        app.all('/server/getlogs', verifyLogin);
        app.all('/server/listusers', verifyLogin);

        // Sensor Data
        app.get('/server/getData', (req, res) => {
            if (currentData) {
                res.send(JSON.stringify(currentData));
            }
        });
        app.post('/server/getlogs', (req, res) => {
            if (logs) {
                if (!req.body.timespan) {
                    res.send('ERROR: No timespan specified')
                    return;
                }
                if (!req.body.divisions) {
                    res.send('ERROR: No divisions specified')
                    return;
                }
                let data = [];

                for (let i = logs.length - 1; i > Math.max(0, logs.length - req.body.timespan); i -= req.body.divisions) {
                    let temperature = 0;
                    let pressure = 0;
                    let c = Math.min(logs.length - (data.length * req.body.divisions), req.body.divisions);
                    for (let j = 0; j < c; j++) {
                            temperature += logs[i - j].temperature;
                            pressure += logs[i - j].pressure;
                    }
                    temperature /= c;
                    pressure /= c;
                    data.push({
                        timestamp: logs[i - Math.floor(c / 2)].timestamp,
                        temperature: Math.round(temperature * 100) / 100,
                        pressure: Math.round(pressure * 100) / 100
                    });
                }
                res.send(JSON.stringify(data));
            }
        });

        // Login
        app.post('/server/login', (req, res) => {
            let user = config.getconfig().Users[req.body.username];
            if (!user) {
                res.redirect('/login?invalid_creds=1');
                return;
            }
            if (!passwordHash.verify(req.body.password, user.password)) {
                res.redirect('/login?invalid_creds=1');
                return;
            }
            config.getconfig().Users[req.body.username].lastlogin = new Date();
            config.saveconfig();
            let token = md5(Math.random());
            sessions[token] = {
                username: user.username
            }
            res.cookie('session' , JSON.stringify({id: token, username: req.body.username})).redirect('/Dashboard');
        });
        app.get('/server/logout', (req, res) => {
            if (!req.cookies.session) {
                res.redirect('/login');
                return;
            }
            let session = JSON.parse(req.cookies.session);
            if (!session.id) {
                res.redirect('/login');
                return;
            }
            sessions[session.id] = undefined;
            res.cookie('session').redirect('/login');
        });
        app.post('/server/register', (req, res) => {
            let userdata = req.body;
            if (!userdata.username || !userdata.password || !userdata.verify_password) {
                res.redirect('/register?server_error=1');
                return;
            }
            if (config.getconfig().Users[userdata.username]) {
                res.redirect('/register?existing_user=1');
                return;
            }
            if (userdata.password != userdata.verify_password) {
                res.redirect('/register?pw_missmatch=1');
                return;
            }
            config.getconfig().Users[userdata.username] = {
                password: passwordHash.generate(userdata.password),
                created: new Date()
            };
            config.saveconfig();
            res.redirect('/Users?regsuccess=1');
        });
        app.get('/server/listusers', (req, res) => {
            let users = [];
            Object.keys(config.getconfig().Users).forEach((u) => {
                users.push({
                    username: u,
                    created: config.getconfig().Users[u].created,
                    lastlogin: config.getconfig().Users[u].lastlogin,
                });
            });
            res.send(JSON.stringify(users))
        });
        app.post('/server/deleteusers', (req, res) => {
            let session = JSON.parse(req.cookies.session);
            let usernames = Object.keys(req.body);
            if (usernames.length == 0) {
                res.redirect(`/Users?nouser=1`);
                return;
            }
            for (let i = 0; i < usernames.length; i++) {
                if (session.username == usernames[i]) {
                    res.redirect(`/Users?selfdelete=1`);
                    return;
                }
            }
            usernames.forEach((u) => {
                config.getconfig().Users[u] = undefined;
                config.saveconfig();
                config.loadconfig();
            });
            res.redirect(`/Users?success=${Object.keys(req.body).length}`);
        });

        // Info
        app.get('/server/getinfo', (req, res) => {
            res.send(JSON.stringify({
                openweather_ver: version,
                node_ver: process.version,
                os: os.release(),
                mem_free: os.freemem(),
                firmware: firm_ver.string,
                arch: os.arch()
            }))
        });

        app.use(express.static('html_beta'));
        
        app.listen(config.getconfig().Port, () => {
            Logger.ok();
        });
    }
    catch (e) {
        Logger.failed();
        Logger.panic('Could start webserver!' + e);
    }
}

function verifyLogin(req, res, next) {
    try {
        if (!req.cookies.session) {
            res.redirect('/login');
            return;
        }
        let session = JSON.parse(req.cookies.session);
        if (!session) {
            res.redirect('/login');
            return;
        }
        if (!sessions[session.id]) {
            res.redirect('/login');
            return;
        }
        next();
    }
    catch (e) {
        res.redirect('/login');
    }
}