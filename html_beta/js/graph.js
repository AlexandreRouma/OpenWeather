let ctx = document.getElementById('graph').getContext('2d');

var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [{
            yAxisID: 'T',
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'blue',
            backgroundColor: 'transparent'
        },
        {
            yAxisID: 'P',
            label: 'Pressure (hPa)',
            data: [],
            borderColor: 'red',
            backgroundColor: 'transparent'
        }]
    },
    options: {
        animation: {
            duration: 0, // general animation time
        },
        elements: {
            line: {
                tension: 0, // disables bezier curves
            },
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    unit: 'minute'
                }
            }],
            yAxes: [{
                id: 'T',
                type: 'linear',
                position: 'left',
            }, {
                id: 'P',
                type: 'linear',
                position: 'right',
                // ticks: {
                //     max: 1045,
                //     min: 960
                // }
            }]
        }
    }
});

let lastData = [0];
let threadID;
let timespanTable = {
    lastHour: 1000,
    lastDay: 24000,
    lastWeek: 168000,
    lastYear: 168000
}
let timedivTable = {
    lastHour: {
        timespan: 60,
        division: 1
    },
    lastDay: {
        timespan: 1440,
        division: 15
    },
    lastWeek: {
        timespan: 10080,
        division: 120
    },
    lastMonth: {
        timespan: 43200,
        division: 1440
    },
    lastYear: {
        timespan: 525600,
        division: 7200
    }
}

updateTimespan();
setInterval(updateLive, 1000);

function updateTimespan() {
    if (threadID) {
        clearInterval(threadID);
    }
    threadID = setInterval(updateData, timespanTable[document.getElementById('timespan').value]);
    updateData();
}

function updateData() {
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", `/server/getlogs`, false);
    let timediv = timedivTable[document.getElementById('timespan').value];
    xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhttp.send(`timespan=${timediv.timespan}&divisions=${timediv.division}`);

    let data = JSON.parse(xhttp.responseText);

    if (data[data.length - 1].timestamp == lastData[lastData.length - 1].timestamp) {
        return;
    }

    console.log('updating graph')

    myChart.data.datasets[0].data = [];
    myChart.data.datasets[1].data = [];

    let max_t = 0;
    let avg_t = 0;
    let min_t = parseFloat(data[0].temperature);
    let max_p = 0;
    let avg_p = 0;
    let min_p = parseFloat(data[0].pressure);

    data.forEach((e) => {
        let temperature = e.temperature;
        let pressure = e.pressure;
        if (temperature > max_t) {
            max_t = temperature;
        }
        if (temperature < min_t) {
            min_t = temperature;
        }
        avg_t += temperature;
        if (pressure > max_p) {
            max_p = pressure;
        }
        if (pressure < min_p) {
            min_p = pressure;
        }
        avg_p += pressure;
        myChart.data.datasets[0].data.push({x: new Date(e.timestamp), y: temperature});
        myChart.data.datasets[1].data.push({x:new Date(e.timestamp), y: pressure / 100});
    });

    myChart.update();

    avg_t /= data.length;
    avg_p /= data.length;

    document.getElementById('max_temperature').innerText = Math.round(max_t * 100) / 100;
    document.getElementById('avg_temperature').innerText = Math.round(avg_t * 100) / 100;
    document.getElementById('min_temperature').innerText = Math.round(min_t * 100) / 100;
    document.getElementById('max_pressure').innerText = Math.round(max_p) / 100;
    document.getElementById('avg_pressure').innerText = Math.round(avg_p) / 100;
    document.getElementById('min_pressure').innerText = Math.round(min_p) / 100;

    lastData = data;
}

function updateLive() {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/server/getData", false);
    xhttp.send();
    let data = JSON.parse(xhttp.responseText);
    document.getElementById('temperature').innerText = data.temperature;
    document.getElementById('pressure').innerText = data.pressure / 100;
}