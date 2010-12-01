// App namespace
var CG = {
    map: null,

    vectorLayer: null,

    results: [],

    doRequest: function(){

        var url = "http://culturegrid.org.uk/index/select/?";
        url += "q=dcterms.isPartOf%3AMLAInstitutions";
        url += "&version=2.2";
        url += "&start=0";
        url += "&rows=100";
        url += "&indent=on";
        /*
        url += "&lat=53.3813152288178";
        url += "&long=-2.4811235692305";
        */
       url += "&lat=54.99337311367353";
        url += "&long=-1.613616943359375";
        //-1.613616943359375, 54.99337311367353
        url += "&radius=20";
        url += "&qt=geo";
        url += "&sort=geo_distance%20asc";


        url = "proxy.php?url="+escape(url);

        $.get(url,function(results){

            CG.features = [];

            // Create an array of new features from the results
            $(results).find("doc").each(function(){

                var x = parseFloat($(this).find("double[name=lng]").text());
                var y = parseFloat($(this).find("double[name=lat]").text());

                CG.features.push(
                new OpenLayers.Feature.Vector(
                // Geometry: We need to transform Lat/Lon to Mercator
                    new OpenLayers.Geometry.Point(x,y).transform(
                        new OpenLayers.Projection("EPSG:4326"),
                        CG.map.getProjectionObject()
                    ),
                // Attributes
                    {
                        "name": $(this).find("str[name=dc.title]").text(),
                        "address": $(this).find("str[name=institution_address]").text(),
                        "type": $(this).find("str[name=institution_sector]").text()
                    }
            )
            );


                if (CG.features.length)
                    CG.mapResults();

            })
        })
    },

        mapResults: function(){
            // Get features layer
            var layer = CG.vectorLayer;

            // Delete previous features
            if (layer.features.length)
                layer.removeAllFeatures();

            // Add new features to map
            layer.addFeatures(CG.features);

            // Center map in new features extent
            CG.map.zoomToExtent(layer.getDataExtent());


        },

        onFeatureSelect: function(feature){
            CG.selectedFeature = feature;

            var html = "<div class=\"popup\">";
                html += "<div class=\"name\">" + feature.attributes.name +"</div>";
                html += "<div class=\"address\">" + feature.attributes.address+"</div>"
                html += "</div>"

            var popup = new OpenLayers.Popup.FramedCloud("Feature Info",
            feature.geometry.getBounds().getCenterLonLat(),
            null,
            html,
            null, true, CG.onPopupClose);

            feature.popup = popup;
            CG.map.addPopup(popup);

        },

        onPopupClose: function(event){
            CG.selectControl.unselect(CG.selectedFeature);
        },

        onFeatureUnselect: function(feature){
            CG.map.removePopup(feature.popup);
            feature.popup.destroy();
            feature.popup = null;
        },

        getFeatureStyles: function(){

        var style = new OpenLayers.Style({
            "cursor":"pointer",
            graphicWidth:32,
            graphicHeight:37});
        
        style.addRules([
            
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Libraries"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/library.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Museums"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/museum.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Research Institutes"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/research.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Cross-domain Institutions"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/crossdomain.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Media"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/media.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==", property: "type",value: "Archives"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/archive.png'
                }
            }),
            new OpenLayers.Rule({
                elseFilter: true,
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/other.png'
                }
            })
            ]);

            return new OpenLayers.StyleMap(style);
        }

    };


    $(document).ready(function(){

        $("#search").click(function(){
            CG.doRequest()
        })

        // Set map div size
        $("#map").width($(window).width());
        $("#map").height($(window).height());



        // Create a new map
        var map = new OpenLayers.Map("map" ,
        {
            projection: new OpenLayers.Projection("EPSG:900913"),
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
            units: "m",
            controls: [
                new OpenLayers.Control.LayerSwitcher(),
                new OpenLayers.Control.Navigation()
            ]
        });

        // Create layers to add
        var layers = [
            osm = new OpenLayers.Layer.OSM("Simple OSM Map"),
            gsat = new OpenLayers.Layer.Google("Google Satellite",
                    {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
            ),
            vectors = new OpenLayers.Layer.Vector("Results",{
                projection: new OpenLayers.Projection("EPSG:4326"),
                styleMap: CG.getFeatureStyles()
            })
        ];

        // We will need a reference to the vector layer
        CG.vectorLayer = vectors;

        // Create control to allow the selection of features
        CG.selectControl = new OpenLayers.Control.SelectFeature(
        vectors,
        {
            "hover": false,
            "multiple": false,
            "onSelect": CG.onFeatureSelect,
            "onUnselect": CG.onFeatureUnselect
        }
    );
        map.addControl(CG.selectControl);
        CG.selectControl.activate();
    
    
    

        map.addLayers(layers);

        map.setCenter(
        new OpenLayers.LonLat(-1.613616943359375, 54.99337311367353).transform(
        new OpenLayers.Projection("EPSG:4326"),
        map.getProjectionObject()
    ), 12
    );

        CG.map = map;


    }
);
