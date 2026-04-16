import requests
print(requests.get('http://overpass-api.de/api/interpreter', params={'data': '[out:json];node[\"amenity\"=\"hospital\"](around:5000,17.3850,78.4867);out center;'}).text)
