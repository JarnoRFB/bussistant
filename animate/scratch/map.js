// Example route for single ride 
// http://localhost:8000/animate/scratch/?FahrtBezeichner=-12862584&halteid=4734101

const mapbox_token = "pk.eyJ1IjoidGlub20iLCJhIjoiY2ppa2dzOXd2MHhjNDN2b3dkeXlhMzQ3NyJ9.-GK7-nWyeh988RBOhjUwtQ";
const mymap = L.map('mapid').setView([51.961436, 7.626816], 13);
L.MakiMarkers.accessToken = mapbox_token;

const lastStop = {};

const markers = {};
const animatedMarkers = {};


L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: mapbox_token
}).addTo(mymap);
const fahrtGroup = L.layerGroup();
fahrtGroup.addTo(mymap);
var message = document.getElementById("message");
const exampleSocket = new WebSocket("wss://swms-conterra.fmecloud.com/websocket");
const praeambel = function () {
    exampleSocket.onopen = function (event) {
        console.log("WebSocket is open now.");
        // vcount.textContent = "Websocket successfully connected.";
        exampleSocket.send('{ "ws_op":"open","ws_stream_ids":["swmslive"]}');
    }
};


params = new URL(window.location.href).searchParams



exampleSocket.onmessage = function (event) {
    // message.textContent = event.data;
    let vehicles = JSON.parse(event.data);
    // vehicles = vehicles.features.filter(vehicle => vehicle.properties.LinienID === '6') 

    if (params.has('FahrtBezeichner') && params.has('halteid')){
        console.log('search params active')
        // vehicles = vehicles.features

        vehicles = vehicles.features.filter(vehicle => vehicle.properties.FahrtBezeichner === params.get('FahrtBezeichner'))

    } else {
        console.log('missing param')
        vehicles = vehicles.features
    }
    for (let vehicle of vehicles) {
        if (vehicle.properties.operation === "UPDATE") {
            let marker

            let label = vehicle.properties.LinienText
            if (label.startsWith("R") || label.startsWith("E") || label.startsWith("N")) {
                label = label.substr(1);
            }

            if (vehicle.properties.FahrtBezeichner in markers) {
                marker = markers[vehicle.properties.FahrtBezeichner]
                markers[vehicle.properties.FahrtBezeichner].setLatLng([vehicle.geometry.coordinates[1], vehicle.geometry.coordinates[0]]);
                markers[vehicle.properties.FahrtBezeichner].update();
            } else {
                
                
                marker = L.marker([vehicle.geometry.coordinates[1], 
                                        vehicle.geometry.coordinates[0]]);
                marker.title = "Linie " + vehicle.properties.LinienText;
                marker.fahrtbezeichner = vehicle.properties.FahrtBezeichner;
                

                
                
                
                if (params.has('FahrtBezeichner') && params.has('halteid')){
                    showCurrentBusLine(vehicle, params.get('halteid'))
                }

                

            }


            let popUpText = "";
                try {
                    popUpText = JSON.stringify(vehicle, null, 2);
                }
                catch (err) {
                    console.log(err)
                }
                marker.bindPopup(popUpText)
                marker.on('popupopen', function(event) {
                    const  marker = event.target;
                    fahrtGroup.clearLayers();
                    httpGetAsync("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+marker.fahrtbezeichner, addLine);
                    httpGetAsync("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+marker.fahrtbezeichner+"/stops", addStops);
                });

            fetch("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+vehicle.properties.FahrtBezeichner+"/stops")
                .then(response => response.json())
                .then(response => response.stops.filter(stop => stop.properties.halteid === vehicle.properties.AktHst))
                .then(stop => {
                    stop = stop[0]
                    // console.log('stop', stop)
                    const delay = new Date(stop.properties.abfahrtprognose) - new Date(stop.properties.abfahrt)
                    // console.log('delay', delay)
                    let delayInMinutes;
                    if (isNaN(delay)){
                        delayInMinutes = 'unknown'
                    } else {
                        delayInMinutes = new Date(delay).getMinutes()
                    }
                    return delayInMinutes
                })
                .then(delayInMinutes => {
                    marker.bindTooltip(`${delayInMinutes} minutes delay`).openTooltip()
                    const icon = L.MakiMarkers.icon({icon: label, 
                                                     color: delayToColor(delayInMinutes), 
                                                     size: "m"});
                    // const icon = L.divIcon(
                    //     {classname: 'my-div-icon', 
                    //      html: '<img class="busicon" src="Bus-logo.svg" alt="Kiwi standing on oval"></img>'
                    // });
                    marker.setIcon(icon)
                    marker.addTo(mymap);
                    markers[vehicle.properties.FahrtBezeichner] = marker;

                })

            console.log('last', lastStop[vehicle.properties.FahrtBezeichner])
            console.log('current', vehicle.properties.AktHst)
            if (lastStop[vehicle.properties.FahrtBezeichner] !== vehicle.properties.AktHst){
                startAnimation(vehicle)
                lastStop[vehicle.properties.FahrtBezeichner] = vehicle.properties.AktHst
            } 
 

        } else {
            if (vehicle.properties.FahrtBezeichner in markers) {
                mymap.removeLayer(markers[vehicle.properties.FahrtBezeichner]);
                delete(markers[vehicle.properties.FahrtBezeichner]);
            }
        }

    }
    // vcount.textContent = "Currently live: " + Object.keys(markers).length + " Vehicles"
};


function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
};

function addLine(event) {
    var line = JSON.parse(event);
    currentLine = L.geoJSON(line, {style:{color:"#"+line.properties.farbe}});
    currentLine.addTo(fahrtGroup);
};

const delayToColor = delayInMinutes => {
    return delayInMinutes >= 10  ? '#800026' :
           delayInMinutes >= 5   ? '#BD0026' :
           delayInMinutes >= 2   ? '#FD8D3C' :
           delayInMinutes === 1  ? '#FEB24C' :
           delayInMinutes === 0  ? '#008000' :
                                   '#a6a6a6';
}


const showCurrentBusLine = (vehicle, halteid) => {
    fahrtGroup.clearLayers();
    fetch("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+vehicle.properties.FahrtBezeichner)
    .then(response => response.json())
    .then(response => {
        currentLine = L.geoJSON(response, {style:{color:"#ff1213"}});
        currentLine.addTo(fahrtGroup);
    });

    fetch("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+vehicle.properties.FahrtBezeichner+"/stops")
    .then(response => response.json())
    .then(response => {
        for (let stop of response.stops) {
            var marker = {
                pointToLayer: function (feature, latlng) {
                    let icon
                    if (feature.properties.halteid === params.get('halteid')){
                        icon = L.MakiMarkers.icon({icon: "bus", color: "#06791f", size: 'm'});
                        mymap.setView(flip(feature.geometry.coordinates), 15)

                    } else {
                        icon = L.MakiMarkers.icon({icon: "bus", color: "#13f243", size: 's'});

                    }
                    return L.marker(latlng, {icon: icon, 
                                            title: stop.properties.haltestelle})                }
            };
            var cstop = L.geoJSON(stop, marker);
            cstop.addTo(fahrtGroup);
        }
    });
}

const flip = coords => {
    return [coords[1], coords[0]]
}

const startAnimation = vehicle => {
    fetch(`https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrwege/${vehicle.properties.AktHst}/${vehicle.properties.NachHst}`)
    .then(response => response.json())
    .then(response => {
        try {
            mymap.removeLayer(animatedMarkers[vehicle.properties.FahrtBezeichner]);
            console.log('marker removed !!!!!!!!!!!!!!!!!!!')

        }
        catch {
            console.log('marker not yet there')
        }
        let coords = [];
        for (let coord of response.geom.coordinates){ // TODO sollte eigentlich geometry sein
            coords.push([coord[1], coord[0]])
        }
        const line = L.polyline(coords)
        const animatedMarker = L.animatedMarker(line.getLatLngs(), {
            distance: 1,
            interval: 5000,
        })

        animatedMarkers[vehicle.properties.FahrtBezeichner] = animatedMarker
        mymap.addLayer(animatedMarker);

    })
}

function addStops(event) {
    response = JSON.parse(event);
    for (var key in response.stops) {
        stop = response.stops[key];
        var icon = L.MakiMarkers.icon({icon: "bus", color: "#13f243", size: "s"});
        var marker = {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {icon: icon,title : response.stops[key].properties.haltestelle}).bindPopup(JSON.stringify(response.stops[key].properties, null, 2)).openPopup();
            }
        };
        var cstop = L.geoJSON(stop, marker);
        cstop.addTo(fahrtGroup);
    }
};


const toggleDensityLayer = async () => {
    console.log('heatmap')
    let heatmap_data = await fetch('heatmap_data.json')
    heatmap_data = await heatmap_data.json()
    console.log(heatmap_data.meanDelays)
    data = []
    for (let stopInfo of Object.values(heatmap_data.meanDelays)){
            console.log([stopInfo.coordinates[1], stopInfo.coordinates[0], stopInfo.mean])
            data.push([stopInfo.coordinates[1], stopInfo.coordinates[0], stopInfo.mean])
        }
    const heat = L.heatLayer(data, {radius: 25, minOpacity: 0.4, max: heatmap_data.maxDelay}).addTo(mymap)
}

// toggleDensityLayer()

praeambel();