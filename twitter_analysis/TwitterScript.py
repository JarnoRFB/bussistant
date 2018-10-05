# from https://gist.github.com/vickyqian/f70e9ab3910c7c290d9d715491cde44c

import tweepy
import pickle

# Lädt die Tweets mit Hashtag MSVerkehr der letzten Woche und speichert sie in MSVerkehrLastWeek.pickle


####input your credentials here
consumer_key = 'NBVmn9o7gIEzuLi8OMga8lii1'
consumer_secret = 'P8mKEhFjPnxI8FvJ1ipgepa2CfZM4Il0Ez01SiVrWy9l473dlX'
access_token = '811906664387530752-u2DEAgIzOCR1dKWuFgokX6jbn8EQesS'
access_token_secret = 'AHO6SX5Nu0zD7WNuCDXa15IicNX3TpHvmDaKEQfZXF2wf'

auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
api = tweepy.API(auth,wait_on_rate_limit=True)

tweets = []
for tweet in tweepy.Cursor(api.search, q="#msverkehr",count=100,
                           lang="de",
                           since="2018-09-28",
                           tweet_mode = "extended").items():
    print(tweet.created_at, tweet.text)
    tweets.append((tweet.created_at, tweet.text, tweet))

pickle.dump(tweets, open("MSVerkehrLastWeekExtended.pickle", "wb"))