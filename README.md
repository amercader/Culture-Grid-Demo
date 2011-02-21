This is a quick demo I built for the Culture Grid Hack Day. It uses the Culture
Grid API to show the nearest MLA institutions to a given point.

* Drag the map to move around, use the mouse wheel to zoom in and out (The map
is centered in Newcastle, but you can query anywhere in Britain).
* Click on the map or drag the marker around to get the results. Clicking on the
icons will give you more information.

**Known issues**

* Coincident points are not handled, so if two or more institutions are located
in the same place, only one will be shown.
* Tested on Firefox 3.6 and 4, Chrome 7 and IE 8. I'm not sure how older
browsers will cope with a lot of markers loaded.

**TODO**

Some nice things that could be improved or added:

* Handle coincident points.
* Show an special icon for institutions where collections can be searched.
* Page results.
* Choose between different collections on a given institution.
* Add locators by address, post code, etc.
* Permalink.
* API to embed a map with cultural institutions on any website.
* ...

For any comments:

Adrià Mercader (**amercadero at gmail.com**) - [http://amercader.net]()

Built with jQuery and OpenLayers.
