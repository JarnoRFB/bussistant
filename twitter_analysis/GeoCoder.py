from geopy.geocoders import Nominatim

def getLocation(street):
    # returns a tuple with latitude, longitude, and the address as a string to check the locations correctness if needed
    geolocator = Nominatim(user_agent="Busassitant",
                           format_string="%s, Münster")
    location = geolocator.geocode(street)
    #print(location.address)
    #print((location.latitude, location.longitude))
    return((location.latitude, location.longitude, location.address))
getLocation("Schlossplatz")