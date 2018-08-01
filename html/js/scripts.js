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
                ticks: {
                    max: 1045,
                    min: 960
                }
            }]
        }
    }
});

let lastData = [0];

setInterval(() => {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/lastHour", false);
    xhttp.send();

    let data = JSON.parse(xhttp.responseText);

    if (data[data.length - 1].timestamp == lastData[lastData.length - 1].timestamp) {
        return;
    }

    myChart.data.datasets[0].data = [];
    myChart.data.datasets[1].data = [];
    data.forEach((e) => {
        myChart.data.datasets[0].data.push({x: new Date(e.timestamp), y: e.temperature});
        myChart.data.datasets[1].data.push({x:new Date(e.timestamp), y: e.pressure / 100});
    });

    myChart.update();

    lastData = data;
}, 1000);