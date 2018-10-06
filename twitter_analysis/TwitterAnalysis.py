import pickle
import re
import geojson as geo
import json
from copy import deepcopy
import GeoCoder

tweets_last_week = pickle.load(open("filtered_tweets.pickle", "rb"))
streetnames = pickle.load(open("strassennamen.pickle", "rb"))

def preprocess(texts, tweets=True):
    texts2 = deepcopy(texts)
    if(tweets):
        text_elements = [text[1] for text in texts2]
    else:
        text_elements = texts2

    for i in range(0,len(text_elements)):
        s = text_elements[i].lower().replace(" ", "") #entfernen von leerzeichen und alles lower case
        text_elements[i] = ''.join(c for c in s if c.isalnum()) #entfernen aller sonderzeichen
    return text_elements

tweets_preprocessed = preprocess(tweets_last_week)
streetnames_preprocessed = preprocess(streetnames, tweets = False)

def lookForStreets(streets, tweets):
    hits = []
    for i, tweet in enumerate(tweets):
        street_hits=[]
        for j, street in enumerate(streets):
            if street in tweet:
                street_hits.append((i,j))
        if not len(street_hits)==0:
            hits.append(street_hits)
    return hits

#list of tuples with (street, tweet) indices
hits = lookForStreets(streetnames_preprocessed, tweets_preprocessed)


def retrieve_geodata(raw_data):
    geodata = []
    for street_tweet_list in raw_data:
        for tweet_tuple in street_tweet_list:
            geocode = GeoCoder.getLocation(streetnames[tweet_tuple[1]])
            point = geo.Point((geocode[0],geocode[1]))
            tweet = tweets_last_week[tweet_tuple[0]]
            json = {
                "type": "Feature",
                    "geometry": geo.dumps(point),
                    "properties": {
                        "username": tweet[2],
                        "text": tweet[1],
                        "time": str(tweet[0])
                    }
            }
            geodata.append(json)
    return geodata

geodata = retrieve_geodata(hits)




with open("geodata.json", 'w') as outfile:
    outfile.write(json.dumps(geodata))