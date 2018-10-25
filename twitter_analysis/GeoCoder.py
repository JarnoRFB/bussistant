from geopy.geocoders import Nominatim

def getLocation(street):
    import ssl

    # Disable SSL certificate verification
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        # Legacy Python that doesn't verify HTTPS certificates by default
        pass
    else:
        # Handle target environment that doesn't support HTTPS verification
        ssl._create_default_https_context = _create_unverified_https_context

    # returns a tuple with latitude, longitude, and the address as a string to check the locations correctness if needed
    geolocator = Nominatim(user_agent="Busassitant",
                           format_string="%s, Münster")
    location = geolocator.geocode(street)
    #print(location.address)
    #print((location.latitude, location.longitude))
    return((location.latitude, location.longitude, location.address))
getLocation("Schlossplatz")