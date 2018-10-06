const express = require('express');
const morganBody = require('morgan-body');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const moment = require('moment');

// Import the appropriate service and chosen wrappers
const {
    dialogflow,
    Image,
    BasicCard,
    Button,
    NewSurface,
    List
} = require('actions-on-google');

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents

app.intent('Default Welcome Intent', conv => {
    conv.ask("Hallo Johannes. Ich bin der Münsterhäck Bus Assistent. Deine nächstgelegene Haltestelle ist Stadtwerke / Hafen.");
    if (!conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
        return;
    }
    conv.ask(new BasicCard({
        text: `Willkommen zum **Münsterhack Bus Assistent**.`, // Note the two spaces before '\n' required for
        // a line break to be rendered in the card.
        title: 'Willkommen',
        image: new Image({
            url: 'https://www.stadtwerke-muenster.de/blog/wp-content/uploads/Aussteigen-Preu%C3%9Fen.jpg',
            alt: 'Ein Bus der Stadtwerke Münster an einer Haltestelle',
        }),
        display: 'CROPPED',
    }));
});

// Intent in Dialogflow called `Goodbye`
app.intent('Bye', conv => {
    conv.close('')
});

app.intent('Default Fallback Intent', conv => {
    conv.ask(`I didn't understand. Can you tell me something else?`)
});

function calcMinutes(zukunft, now) {
    return Math.round(moment.duration(moment(zukunft).diff(now)).asMinutes());
}

function sortFahrt(fahrt_a, fahrt_b) {
    return fahrt_a.arrivalInMinutes - fahrt_b.arrivalInMinutes;
}

app.intent('Naechster Standardbus', conv => {
    let haltestellenId = 4341501;
    let linienURL = `https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/haltestellen/${haltestellenId}`;
    var options = {
        uri: linienURL,
        json: true
    };
    return rp(options)
        .then(function (json) {
            let now = moment.utc();
            let sorted_fahrten = json["properties"].fahrten.map(
                fahrt => {
                    return {
                        fahrtbezeichner: fahrt.fahrtbezeichner,
                        linienid: fahrt.linienid,
                        linientext: fahrt.linientext,
                        richtungstext: fahrt.richtungstext,
                        ankunftszeit: fahrt.ankunftsprognose || fahrt.ankunftszeit,
                        abfahrtszeit: fahrt.abfahrtsprognose || fahrt.abfahrtszeit,
                        arrivalInMinutes: calcMinutes(fahrt.ankunftsprognose || fahrt.ankunftszeit, now)
                    };
                }
            ).sort(sortFahrt).filter(fahrt => (fahrt.arrivalInMinutes > 1 && fahrt.arrivalInMinutes < 60));

            var selectedAnswer = getAnswer();

            if (sorted_fahrten[0]) {
                var arrival = sorted_fahrten[0].arrivalInMinutes;
                var linie1 = sorted_fahrten[0].linientext;
            } else {
                conv.ask("Leider keine Busse in Sicht");
                return;
            }
            if (sorted_fahrten[1]) {
                var arrival2 = sorted_fahrten[1].arrivalInMinutes;
                var linie2 = sorted_fahrten[1].linientext;
            } else {
                selectedAnswer = selectedAnswer.split(".")[0];
            }
            let answer = selectedAnswer.replace("{z1}", arrival).replace("{z2}", arrival2).replace("{l1}", linie1).replace("{l2}", linie2);
            conv.ask(answer);

            if (!conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
                console.log("Übergabe an Handy");
                if (!conv.available.surfaces.capabilities.has('actions.capability.SCREEN_OUTPUT') ||
                    !conv.available.surfaces.capabilities.has('actions.capability.WEB_BROWSER')) {
                    console.log("Capability fehlt: " +
                        conv.available.surfaces.capabilities.has('actions.capability.SCREEN_OUTPUT') + " - " +
                        conv.available.surfaces.capabilities.has('actions.capability.WEB_BROWSER'));
                }
                // conv.ask("Möchtest Du eine Karte aufs Handy gesendet bekommen?");
            } else {
                conv.ask(new BasicCard({
                        title: "Die Karte für die Linie {l1}".replace("{l1}", linie1),
                        text: "Auf der Karte haben wir den aktuellen Stand Deiner Linie abgebildet. Klicke auf den Link, um die Live-Ansicht zu öffnen.",
                        image: new Image({
                            url: "https://i.imgur.com/OFy34nD.png",
                            alt: "Deine Karte"
                        }),
                        buttons: new Button({
                            url: `https://f8f72c2a.ngrok.io/animate/scratch/?FahrtBezeichner=${sorted_fahrten[0].fahrtbezeichner}&halteid=${haltestellenId}`,
                            title: "Live-Karte öffnen"
                        }),
                        display: 'CROPPED',
                    })
                )
            }
        })
        .catch(function (err) {
            console.error(err);
            conv.ask("Ups. Gerade gibt es ein Problem mit unserem Backend. Bitte versuche es gleich noch einmal")
        });
});

app.intent('Aktuelle Probleme', conv => {
    let tweets = [{
        "type": "Feature",
        "geometry": "{\"type\": \"Point\", \"coordinates\": [51.9906251, 7.5987517]}",
        "properties": {
            "username": "Polizei NRW MS",
            "text": "#msverkehr Nach einem #Unfall auf der #SteinfurterStra\u00dfe stadtausw\u00e4rts, zwischen alter Eishalle und Abfahrt #Wilkinghege ist der rechte Fahrstreifen gesperrt.",
            "time": "05:22 AM"
        }
    }];
    if (tweets.length === 1) {
        conv.ask(`Derzeit gibt es eine Meldung`);
    }
    else {
        conv.ask(`Derzeit gibt es ${tweets.length} Meldungen`);
    }
    if (conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
        if (tweets.length === 1) {
            conv.ask(new BasicCard({
                title: `${tweets[0].properties.username} - ${tweets[0].properties.time}`,
                text: tweets[0].properties.text
            }));
        } else {
            conv.ask(new List({
                title: "Die letzten Tweets",
                items: {
                    "first_tweet": {
                        title: `${tweets[0].properties.username} - ${tweets[0].properties.time}`,
                        description: tweets[0].properties.text
                    },
                    "second_tweet": {
                        title: `${tweets[1].properties.username} - ${tweets[1].properties.time}`,
                        description: tweets[1].properties.text
                    },
                }
            }));
        }
    } else {
        let ssml = `<speak>${getTweet(tweets[0])} <break time="1s"/> Kann ich sonst noch was für Dich tun?</speak>`;
        conv.ask(ssml);
    }
    // })
    // .error(function (err) {
    //     conv.ask("Leider gibt es derzeit ein Problem. Versuche es bitte später noch einmal")
    // });

    function getTweet(tweet) {
        return `Um <say-as interpret-as="time" format="hms24">${tweet.properties.time}</say-as> tweetete ${tweet.properties.username} folgendes: <break time="1s"/> ${tweet.properties.text}`;
    }
});

app.intent('push to screen', conv => {
    const capabilities = ['actions.capability.SCREEN_OUTPUT', 'actions.capability.WEB_BROWSER'];
    let notification = "Deine Buskarte";
    let context = "Ich kann Dir auch auf dem Handy eine Karte anzeigen";
    conv.ask(new NewSurface({context, notification, capabilities}));
});

function getAnswer() {
    //var possibleAnswers = ["Dein nächster Bus kommt in {0} Minuten. Danach der nächste kommt in {1} Minuten.",
    //    "In {0} Minuten fährt Dein Bus. Ein weiterer kommt in {1} Minuten.",
    //    "Noch {0} Minuten, bis Dein Bus kommt. Und in {1} Minuten kommt dann der nächste."];

    var possibleAnswers = ["Linie {l1} kommt in {z1} Minuten. Danach kommt Linie {l2} in {z2} Minuten.",
        "In {z1} Minuten fährt Linie {l1}. Ein weiterer Bus der Linie {l2} kommt in {z2} Minuten.",
        "Noch {z1} Minuten, bis Linie {l1} kommt. Und in {z2} Minuten kommt dann Linie {l2}."];
    var rand = Math.floor(Math.random() * possibleAnswers.length);
    return possibleAnswers[rand];
}


const expressApp = express().use(bodyParser.json());
morganBody(expressApp);

expressApp.post('/busassistent', app);

expressApp.listen(9080);