import twitter, re, pandas as pd, pickle
from datetime import datetime

class twitterminer():
    request_limit = 20


    api = False
    data = []

    twitter_keys = {
        'consumer_key': 'NBVmn9o7gIEzuLi8OMga8lii1'     ,# add your consumer key
        'consumer_secret': 'P8mKEhFjPnxI8FvJ1ipgepa2CfZM4Il0Ez01SiVrWy9l473dlX',# add your consumer secret key
        'access_token_key' : '811906664387530752-u2DEAgIzOCR1dKWuFgokX6jbn8EQesS', # add your access token key
        'access_token_secret': 'AHO6SX5Nu0zD7WNuCDXa15IicNX3TpHvmDaKEQfZXF2wf' # add your access token secret key
    }

    def __init__(self, request_limit=100):
        self.request_limit = request_limit

        # This sets the twitter API object for use internal within the class
        self.set_api()


    def set_api(self):
        self.api = twitter.Api(
            consumer_key=self.twitter_keys['consumer_key'],
            consumer_secret=self.twitter_keys['consumer_secret'],
            access_token_key=self.twitter_keys['access_token_key'],
            access_token_secret=self.twitter_keys['access_token_secret'],
            tweet_mode='extended'
        )


    def mine_tweets(self, key=" set default user to get data from", mine_retweets=False):
        tweets = self.api.GetSearch(term=key, count=self.request_limit)

        data = []

        for tweet in tweets:

            print(tweet)
            if tweet.retweeted_status is None:
                mined = (datetime.strptime(tweet.created_at, "%a %b %d %H:%M:%S %z %Y"), tweet.full_text, tweet.user.name)
                data.append(mined)
        return data

mine = twitterminer()

# insert handle we like
tweets = mine.mine_tweets("#msverkehr")

pickle.dump(tweets, open('tweets.pickle', 'wb'))