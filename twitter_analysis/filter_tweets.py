import pickle
from datetime import datetime
from datetime import timedelta
import pytz

utc=pytz.UTC #needed for datetime comparison

tweets_last_week = pickle.load(open("tweets.pickle", "rb"))
credible_tweeters = ["Polizei NRW MS", "WN", "Stadtwerke Münster"]

print("number of tweets before filter: "+str(len(tweets_last_week)))

def filter_credibility(tweets, credible_tweeters):
    credible_tweets = []
    for tweet in tweets:
        if tweet[2] in credible_tweeters:
            #print(tweet[2].author.name)
            credible_tweets.append(tweet)
    return credible_tweets

credible_tweets = filter_credibility(tweets_last_week, credible_tweeters)

print("number of tweets after credibility filter: "+str(len(credible_tweets)))


def filter_time(tweets, days):
    recent_tweets = []
    for tweet in tweets:
        if tweet[0] > utc.localize(datetime.now()) - timedelta(hours = 24*days):
            recent_tweets.append(tweet)
    return recent_tweets

recent_tweets = filter_time(credible_tweets, 2)

print("number of tweets after time filter: "+str(len(recent_tweets)))

pickle.dump(recent_tweets, open('filtered_tweets.pickle', 'wb'))