import pickle
import re

tweets_last_week = pickle.load(open("MSVerkehrLastWeek.pickle", "rb"))
streetnames = pickle.load(open("streetnames.pickle", "rb"))


tweet_texts = [text[1] for text in tweets_last_week]
for i in range(0,len(tweet_texts)):
    s = tweet_texts[i].lower().replace(" ", "") #entfernen von leerzeichen und alles lower case
    tweet_texts[i] = ''.join(c for c in s if c.isalnum()) #entfernen aller sonderzeichen
    print(tweet_texts[i])