import folium #Les librairies
import pandas as pd


df = pd.read_csv('coronavirus-pays-20-04-01.csv', encoding='utf-16', sep='\t') #Lecture du fichier
# df.head()
m = folium.Map([47.996470277440324, 7.084370951587293], zoom_start = 6) #La localisation de départ pour cadrer les résultats

taux, infections, deces, guerisons = '','','',''

for indice, ligne in df.iterrows():
    taux = str(ligne['TauxInfection'])
    infections = str(ligne['Infections'])
    deces = str(ligne['Deces'])
    guerisons = str(ligne['Guerisons'])
    #for creating circle marker
    folium.CircleMarker(location = [ligne['Latitudes'], ligne['Longitudes']],
                       radius = 5,
                       color='red',
                       fill = True,
                       fill_color="red").add_to(m)
    #for creating marker
    folium.Marker(location = [ligne['Latitudes'], ligne['Longitudes']],
    			  # adding information that need to be displayed on tooltip
    			  tooltip = ligne['Pays'],
                  # adding information that need to be displayed on popup
                  popup=folium.Popup(('<strong><b>Pays : '+ligne['Pays']+'</strong> <br>' +
                    '<strong><b>Infections : '+infections+'</strong><br>' +
                    '<strong><font color= red>Déces : </font>'+deces+'</strong><br>' +
                    '<strong><font color=green>Guérisons : </font>'+guerisons+'</strong><br>' +
                    '<strong><b>Taux d\'infection : '+taux+'</strong>' ),max_width=200)).add_to(m)
    m.save(outfile='Covid_01042020.html') #Le fichier de sortie est une map au format "html"
    #to show the map
    #m

# for (index,row) in df.iterrows():
#     folium.Marker(location = [row['Latitudes'], row['Longitudes']], popup = row['Noms'], tooltip = row['Adresses'], icon=folium.Icon(color = 'red', icon = 'info-sign')).add_to(m) #Inscris un marqueur aux endroits donnés avec la lontitude et lagitude
#     m.save(outfile='visualisation.html') #Le fichier de sortie est une map au format "html"