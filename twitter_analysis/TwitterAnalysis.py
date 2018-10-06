import pickle
import re

tweets_last_week = pickle.load(open("MSVerkehrLastWeek.pickle", "rb"))
streetnames = pickle.load(open("strassennamen.pickle", "rb"))




def preprocess(texts, tweets=True):
    if(tweets):
        text_elements = [text[1] for text in texts]
    else:
        text_elements = texts

    for i in range(0,len(text_elements)):
        s = text_elements[i].lower().replace(" ", "") #entfernen von leerzeichen und alles lower case
        text_elements[i] = ''.join(c for c in s if c.isalnum()) #entfernen aller sonderzeichen
        print(text_elements[i])
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

def giveEventInformation(indices):
    eventInformation = []
    for street_tweet_list in indices:
        