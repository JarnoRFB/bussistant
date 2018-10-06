import requests
from bs4 import BeautifulSoup# specify the url
from string import ascii_lowercase

''' Scraping the internet to retrieve all streetnames of Münster '''

filename = 'webex.js'
fin=open(filename,'r')

def analyze(file):

    result = []

    ''' Function we used for retrieving webex.js '''
    # quote_page = requests.get("https://www.stadt-muenster.de/ms/strassennamen/" + char + ".html")
    #
    # soup = BeautifulSoup(quote_page.content, 'html.parser')# Take out the <div> of name and get its value
    #
    # name_box = soup.find('div', attrs={'id': 'content_mitte'})
    # name_box = soup.find('div', attrs={'style': 'width:33%; float:left'})
    # for char in ascii_lowercase:
    #     print(char)
    #     if(char == 't'):
    #         list.append(analyze('st'))
    #     if(char == 'x'):
    #         continue
    #     list.append(analyze(char))
    # print(list)

    scraping = False

    for row in file:
        print(type(row))
        print(row)
        if 'Straßenverzeichnis' in row:
            print(123123)
            scraping = True
        if scraping:
            print(row)
            if '<li><a href=' in row:
                array = row.split(">")
                print(array)
                array2 = array[2].split("<")
                result.append(array2[0])

        if '<li><a href="a.html">A</a></li>' in row:
            scraping = False
        if 'Process finished with exit code 0' in row:
            return result


    return result



list = []

import pickle

streetnames = analyze(fin)

streetnames2 =[]

for e in streetnames:
   if e == "A":
       continue
   if e == "":
       continue
   else:
       streetnames2.append(e)

pickle.dump(streetnames2, open('strassennamen.pickle', 'wb'))