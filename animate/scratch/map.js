/* global fetch, L, XMLHttpRequest, WebSocket */

// Example route for single ride
// http://localhost:8000/animate/scratch/?FahrtBezeichner=-12862584&halteid=4734101

const mapboxToken = 'pk.eyJ1IjoidGlub20iLCJhIjoiY2ppa2dzOXd2MHhjNDN2b3dkeXlhMzQ3NyJ9.-GK7-nWyeh988RBOhjUwtQ'
const mymap = L.map('mapid').setView([51.961436, 7.626816], 13)
L.MakiMarkers.accessToken = mapboxToken

const lastStop = {}

const markers = {}
const animatedMarkers = {}

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  maxZoom: 18,
  id: 'mapbox.streets',
  accessToken: mapboxToken
}).addTo(mymap)

const fahrtGroup = L.layerGroup().addTo(mymap)
const currentMarkerLayer = L.layerGroup()
const animatedMarkerLayer = L.layerGroup().addTo(mymap)
const heatmapLayer = L.layerGroup()

const overlayMaps = {
  'Letzte Position': currentMarkerLayer,
  'Live Position': animatedMarkerLayer,
  'Verspaetungsdichte': heatmapLayer
}

L.control.layers(overlayMaps).addTo(mymap)

const exampleSocket = new WebSocket('wss://swms-conterra.fmecloud.com/websocket')
const praeambel = function () {
  exampleSocket.onopen = function (event) {
    console.log('WebSocket is open now.')
    // vcount.textContent = "Websocket successfully connected.";
    exampleSocket.send('{ "ws_op":"open","ws_stream_ids":["swmslive"]}')
  }
}

const params = new URL(window.location.href).searchParams

exampleSocket.onmessage = async function (event) {
  let response = await fetch('https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/busse')
  response = await response.json()
  for (let bus of response.features) {
    if (bus.properties.fahrtbezeichner in markers) {
      markers[bus.properties.fahrtbezeichner].delay = bus.properties.verspaetung
    }
    if (bus.properties.fahrtbezeichner in animatedMarkers) {
      animatedMarkers[bus.properties.fahrtbezeichner].delay = bus.properties.verspaetung
    }
  }
  let vehicles = JSON.parse(event.data)
  vehicles = filterBusses(vehicles, params)
  for (let vehicle of vehicles) {
    if (vehicle.properties.operation === 'UPDATE') {
      updateMarkers(vehicle)
    } else {
      removeMarker(vehicle)
    }
  }
}

const updateMarkers = async (vehicle) => {
  let marker
  let label = makeLabel(vehicle.properties.LinienText)

  if (vehicle.properties.FahrtBezeichner in markers) {
    marker = markers[vehicle.properties.FahrtBezeichner]
    updateMarkerPosition(vehicle, marker)
  } else {
    marker = makeMarker(vehicle)

    if (params.has('FahrtBezeichner') && params.has('halteid')) {
      showCurrentBusLine(vehicle, params.get('halteid'))
    }
  }

  bindPopup(vehicle, marker)

  await styleMarkerByDelay(vehicle, marker, label)
  marker.addTo(currentMarkerLayer)
  markers[vehicle.properties.FahrtBezeichner] = marker

  console.log('last', lastStop[vehicle.properties.FahrtBezeichner])
  console.log('current', vehicle.properties.AktHst)
  if (lastStop[vehicle.properties.FahrtBezeichner] !== vehicle.properties.AktHst) {
    startAnimation(vehicle, marker.delay)
    lastStop[vehicle.properties.FahrtBezeichner] = vehicle.properties.AktHst
  }
}

const updateMarkerPosition = (vehicle, marker) => {
  marker.setLatLng([vehicle.geometry.coordinates[1], vehicle.geometry.coordinates[0]])
  marker.update()
}

const removeMarker = (vehicle) => {
  if (vehicle.properties.FahrtBezeichner in markers) {
    currentMarkerLayer.removeLayer(markers[vehicle.properties.FahrtBezeichner])
    delete (markers[vehicle.properties.FahrtBezeichner])
  }
  if (vehicle.properties.FahrtBezeichner in animatedMarkers) {
    animatedMarkerLayer.removeLayer(animatedMarkers[vehicle.properties.FahrtBezeichner])
    delete (animatedMarkers[vehicle.properties.FahrtBezeichner])
  }
}

const makeMarker = (vehicle) => {
  const marker = L.marker([vehicle.geometry.coordinates[1], vehicle.geometry.coordinates[0]])
  marker.title = 'Linie ' + vehicle.properties.LinienText
  marker.fahrtbezeichner = vehicle.properties.FahrtBezeichner
  return marker
}

const makeLabel = (LinienText) => {
  if (LinienText.startsWith('R') || LinienText.startsWith('E') || LinienText.startsWith('N')) {
    LinienText = LinienText.substr(1)
  }
  return LinienText
}

const bindPopup = (vehicle, marker) => {
  let popUpText = ''
  try {
    popUpText = JSON.stringify(vehicle, null, 2)
  } catch (err) {
    console.log(err)
  }
  marker.bindPopup(popUpText)
  marker.on('popupopen', function (event) {
    const marker = event.target
    fahrtGroup.clearLayers()
    httpGetAsync('https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/' + marker.fahrtbezeichner, addLine)
    httpGetAsync('https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/' + marker.fahrtbezeichner + '/stops', addStops)
  })
}

const styleMarkerByDelay = async (vehicle, marker, label) => {
  // let response = await fetch("https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/"+vehicle.properties.FahrtBezeichner+"/stops")
  // response = await response.json()
  // response = response.stops.filter(stop => stop.properties.halteid === vehicle.properties.AktHst)
  // stop = response[0]
  // const delay = new Date(stop.properties.abfahrtprognose) - new Date(stop.properties.abfahrt)
  let delayInMinutes
  if (!(marker.delay)) {
    delayInMinutes = 'unknown'
  } else {
    delayInMinutes = parseInt(marker.delay.split(':')[1])
  }

  marker.bindTooltip(`${delayInMinutes} Minuten Verspätung`)

  const icon = L.MakiMarkers.icon({ icon: label,
    color: delayToColor(delayInMinutes),
    size: 'm' })
  // const icon = L.divIcon(
  //     {classname: 'my-div-icon',
  //      html: '<img class="busicon" src="Bus-logo.svg" alt="Kiwi standing on oval"></img>'
  // });
  marker.setIcon(icon)
}

function httpGetAsync (theUrl, callback) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) { callback(xmlHttp.responseText) }
  }
  xmlHttp.open('GET', theUrl, true) // true for asynchronous
  xmlHttp.send(null)
};

function addLine (event) {
  const line = JSON.parse(event)
  const currentLine = L.geoJSON(line, { style: { color: '#' + line.properties.farbe } })
  currentLine.addTo(fahrtGroup)
};

const filterBusses = (busses, filterParams) => {
  if (filterParams.has('FahrtBezeichner') && filterParams.has('halteid')) {
    console.log('search params active')
    busses = busses.features.filter(vehicle => vehicle.properties.FahrtBezeichner === filterParams.get('FahrtBezeichner'))
  } else {
    console.log('missing params')
    busses = busses.features
  }
  return busses
}

const delayToColor = delayInMinutes => {
  return delayInMinutes >= 10 ? '#800026'
    : delayInMinutes >= 5 ? '#BD0026'
      : delayInMinutes >= 2 ? '#FD8D3C'
        : delayInMinutes === 1 ? '#FEB24C'
          : delayInMinutes === 0 ? '#008000'
            : '#a6a6a6'
}

const showCurrentBusLine = (vehicle, halteid) => {
  fahrtGroup.clearLayers()
  fetch('https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/' + vehicle.properties.FahrtBezeichner)
    .then(response => response.json())
    .then(response => {
      const currentLine = L.geoJSON(response, { style: { color: '#ff1213' } })
      currentLine.addTo(fahrtGroup)
    })

  fetch('https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/fahrten/' + vehicle.properties.FahrtBezeichner + '/stops')
    .then(response => response.json())
    .then(response => {
      for (let stop of response.stops) {
        var marker = {
          pointToLayer: function (feature, latlng) {
            let icon
            if (feature.properties.halteid === params.get('halteid')) {
              icon = L.MakiMarkers.icon({ icon: 'bus', color: '#06791f', size: 'm' })
              mymap.setView(flip(feature.geometry.coordinates), 15)
            } else {
              icon = L.MakiMarkers.icon({ icon: 'bus', color: '#13f243', size: 's' })
            }
            return L.marker(latlng, { icon: icon,
              title: stop.properties.haltestelle })
          }
        }
        var cstop = L.geoJSON(stop, marker)
        cstop.addTo(fahrtGroup)
      }
    })
}

const flip = coords => {
  return [coords[1], coords[0]]
}

const startAnimation = async (vehicle, delay) => {
  const line = L.GeoJSON.geometryToLayer(vehicle.properties.fahrweg)
  console.log('line', line)
  const animatedMarker = L.animatedMarker(line.getLatLngs(), {
    distance: 1,
    interval: 5000
  })
  animatedMarker.delay = delay

  await styleMarkerByDelay(vehicle, animatedMarker, makeLabel(vehicle.properties.LinienText))
  if (vehicle.properties.FahrtBezeichner in animatedMarkers) {
    animatedMarkerLayer.removeLayer(animatedMarkers[vehicle.properties.FahrtBezeichner])
    delete (animatedMarkers[vehicle.properties.FahrtBezeichner])
  }
  animatedMarkers[vehicle.properties.FahrtBezeichner] = animatedMarker
  animatedMarkerLayer.addLayer(animatedMarker)
}

function addStops (event) {
  const response = JSON.parse(event)
  for (var key in response.stops) {
    let stop = response.stops[key]
    let icon = L.MakiMarkers.icon({ icon: 'bus', color: '#13f243', size: 's' })
    let marker = {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: icon, title: response.stops[key].properties.haltestelle }).bindPopup(JSON.stringify(response.stops[key].properties, null, 2)).openPopup()
      }
    }
    let cstop = L.geoJSON(stop, marker)
    cstop.addTo(fahrtGroup)
  }
};

const toggleDensityLayer = async () => {
  console.log('heatmap')
  let heatmapData = await fetch('heatmap_data.json')
  heatmapData = await heatmapData.json()
  const data = []
  for (let stopInfo of Object.values(heatmapData.meanDelays)) {
    data.push([stopInfo.coordinates[1], stopInfo.coordinates[0], stopInfo.mean])
  }
  L.heatLayer(data, { radius: 25, minOpacity: 0.4, max: heatmapData.maxDelay }).addTo(heatmapLayer)
}

toggleDensityLayer()

praeambel()
