const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const moment = require('moment');

// Import the appropriate service and chosen wrappers
const {
    dialogflow,
    Image,
    BasicCard,
    Button
} = require('actions-on-google');

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents

app.intent('Default Welcome Intent', conv => {
    conv.ask('Hi, how is it going?');
    if (!conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
        return;
    }
    conv.ask(new BasicCard({
        text: `This is a basic card.  Text in a basic card can include "quotes" and
  most other unicode characters including emoji 📱.  Basic cards also support
  some markdown formatting like *emphasis* or _italics_, **strong** or
  __bold__, and ***bold itallic*** or ___strong emphasis___ as well as other
  things like line  \nbreaks`, // Note the two spaces before '\n' required for
                               // a line break to be rendered in the card.
        subtitle: 'This is a subtitle',
        title: 'Title: this is a title',
        buttons: new Button({
            title: 'This is a button',
            url: 'https://assistant.google.com/',
        }),
        image: new Image({
            url: 'http://www.wisoveg.de/rheinland/vwm/busse/bus248i.jpg?64,45',
            alt: 'Image alternate text',
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

function calcMinutes (zukunft, now) {
    return Math.round(moment.duration(moment(zukunft).diff(now)).asMinutes());
}

app.intent('Nächster Standardbus', conv => {
    let linienURL = 'https://swms-conterra.fmecloud.com/fmedatastreaming/IVU/service.fmw/haltestellen/4341502';
    var options = {
        uri: linienURL,
        json: true
    };
    return rp(options)
        .then(function (json) {
            console.log(json);
            console.log(JSON.stringify(json, null, 2));
            let now = moment.utc();
            let fahrten = json["properties"].fahrten.map(
                fahrt => {
                    let newFahrt = {
                        fahrtbezeichner: fahrt.farbbezeichner,
                        linienid: fahrt.linienId,
                        linientext: fahrt.linientext,
                        richtungstext: fahrt.richtungstext,
                        ankunftszeit: fahrt.ankunftsprognose || fahrt.ankunftszeit,
                        abfahrtszeit: fahrt.abfahrtsprognose || fahrt.abfahrtszeit,
                        arrivalInMinutes: calcMinutes(fahrt.ankunftsprognose || fahrt.ankunftszeit, now)
                    };
                    return newFahrt;
                }
            );
            var arrival = fahrten[0].arrivalInMinutes;
            var arrival2 = fahrten[1].arrivalInMinutes;
            let selectedAnswer = getAnswer();
            // let arrivalAsDate = moment(arrival);
            // let arrival2AsDate = moment(arrival2);
            // let minutes = Math.round(moment.duration(arrivalAsDate.diff(now)).asMinutes());
            // let minutes2 = Math.round(moment.duration(arrival2AsDate.diff(now)).asMinutes());
            let answer = selectedAnswer.replace("{0}", arrival).replace("{1}", arrival2);
            conv.ask(answer)
        })
        .catch(function (err) {
            console.error(err);
            conv.ask("Ups. Gerade gibt es ein Problem mit unserem Backend. Bitte versuche es gleich noch einmal")
        });
});

function getAnswer() {
    var rand = Math.floor(Math.random() * 2);
    console.log(`rand: ${rand}`);
    var possibleAnswers = ["Dein nächster Bus kommt in {0} Minuten. Danach der nächste kommt in {1} Minuten.",
        "In {0} Minuten fährt Dein Bus. Ein weitere kommt in {1} Minuten.",
        "Noch {0} Minuten, bis Dein Bus kommt. Und in {1} Minuten kommt dann der nächste."];
    let selectedAnswer = possibleAnswers[rand];
    return selectedAnswer;
}


const expressApp = express().use(bodyParser.json());

expressApp.post('/busassistent', app);

expressApp.listen(9080);