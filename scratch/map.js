const mapbox_token = "pk.eyJ1IjoidGlub20iLCJhIjoiY2ppa2dzOXd2MHhjNDN2b3dkeXlhMzQ3NyJ9.-GK7-nWyeh988RBOhjUwtQ";
const mymap = L.map('mapid').setView([51.961436, 7.626816], 13);
L.MakiMarkers.accessToken = mapbox_token;
const markers = {};
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
        vcount.textContent = "Websocket successfully connected.";
        exampleSocket.send('{ "ws_op":"open","ws_stream_ids":["swmslive"]}');
    }
};

exampleSocket.onmessage = function (event) {
    message.textContent = event.data;
    var vehicles = JSON.parse(event.data);
    for (var key in vehicles.features) {
        if (vehicles.features[key].properties.operation === "UPDATE") {
            if (vehicles.features[key].properties.FahrtBezeichner in markers) {
                markers[vehicles.features[key].properties.FahrtBezeichner].setLatLng([vehicles.features[key].geometry.coordinates[1], vehicles.features[key].geometry.coordinates[0]]);
                markers[vehicles.features[key].properties.FahrtBezeichner].update();
            } else {
                var label = vehicles.features[key].properties.LinienText;
                if (label.startsWith("R") || label.startsWith("E") || label.startsWith("N")) {
                    label = label.substr(1);
                }
                var icon = L.MakiMarkers.icon({icon: label, color: "#1e19bb", size: "m"});
                var marker = L.marker([vehicles.features[key].geometry.coordinates[1], vehicles.features[key].geometry.coordinates[0]], {icon: icon});
                marker.bindTooltip(vehicles.features[key].properties.LinienText).openTooltip();
                marker.title = "Linie " + vehicles.features[key].properties.LinienText;
                marker.fahrtbezeichner = vehicles.features[key].properties.FahrtBezeichner;
                var p = "";
                try {
                    p = JSON.stringify(vehicles.features[key], null, 2);
                }
                catch (err) {
                    console.log(err)
                }
                marker.bindPopup(p).openPopup();
                marker.on('popupopen', function(e) {
                    var marker = e.target;
                    fahrtGroup.clearLayers();
                    httpGetAsync("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+marker.fahrtbezeichner,addLine);
                    httpGetAsync("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+marker.fahrtbezeichner+"/stops",addStops);
                });

                marker.addTo(mymap);
                markers[vehicles.features[key].properties.FahrtBezeichner] = marker;
            }
        } else {
            if (vehicles.features[key].properties.FahrtBezeichner in markers) {
                mymap.removeLayer(markers[vehicles.features[key].properties.FahrtBezeichner]);
                delete(markers[vehicles.features[key].properties.FahrtBezeichner]);
            }
        }

    }
    vcount.textContent = "Currently live: " + Object.keys(markers).length + " Vehicles"
};
//-12847047
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

function addLine(e) {
    currentLine = L.geoJSON(JSON.parse(e),{style:{color:"#ff1213"}});
    currentLine.addTo(fahrtGroup);
};
function addStops(e) {
    response = JSON.parse(e);
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

praeambel();