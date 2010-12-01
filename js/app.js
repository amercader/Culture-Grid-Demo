// App namespace
var CG = {
    map: null,

    vectorLayer: null,

    results: [],

    // x and y should be in lat/lon
    doRequest: function(x,y){

        if (!(x && y)) return false;

        var url = "http://culturegrid.org.uk/index/select/?";
        url += "q=dcterms.isPartOf%3AMLAInstitutions";
        url += "&version=2.2";
        url += "&start=0";
        url += "&rows=100";
        url += "&indent=on";
        url += "&radius=20";
        url += "&qt=geo";
        url += "&sort=geo_distance%20asc";
        /*
        url += "&lat=53.3813152288178";
        url += "&long=-2.4811235692305";
        */
        /*
        url += "&lat=54.99337311367353";
        url += "&long=-1.613616943359375";
        */
        url += "&lat=" + y;
        url += "&long=" + x;



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

        return true;
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

    onFeatureSelect: function(event){

        var feature = event.feature;
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

        return false;
    },

    onPopupClose: function(event){
        CG.selectControl.unselect(CG.selectedFeature);
    },

    onFeatureUnselect: function(event){
        CG.map.removePopup(event.feature.popup);
        event.feature.popup.destroy();
        event.feature.popup = null;
    },

    getFeatureStyles: function(){

        // Default properties for all rules
        var style = new OpenLayers.Style({
            "cursor":"pointer",
            graphicWidth:32,
            graphicHeight:37
        });
        
        style.addRules([
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Libraries"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/library.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Museums"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/museum.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Research Institutes"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/research.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Cross-domain Institutions"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/crossdomain.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Media"
                }),
                symbolizer: {
                    externalGraphic:'http://localhost/culturegrid/img/icons/media.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Archives"
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

// Custom control to handle clicks on the map
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
    
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': true
    },

    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
        {}, this.defaultHandlerOptions
            );
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
            );
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.trigger
            }, this.handlerOptions
            );
    },

    trigger: function(e) {

        // Prevent the request when clicking a feature.
        // Not sure if it's the best way of doing it though
        if (e.target.tagName == "image")
            return false;
        
        console.log("Request sent");

        var lonlat = this.map.getLonLatFromViewPortPx(e.xy);
        // Transform the coordinates from Spherical Mercator to Lat/lon (WGS84)
        lonlat.transform(
            CG.map.getProjectionObject(),
            new OpenLayers.Projection("EPSG:4326"));
        CG.doRequest(lonlat.lon, lonlat.lat);

        return true;
    }

});



$(document).ready(function(){

    // Set map div size
    $("#map").width($(window).width());
    $("#map").height($(window).height());


    // Create a new map
    var map = new OpenLayers.Map("map" ,
    {
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        units: "m",
        fallThrough: true,
        controls: [
        new OpenLayers.Control.LayerSwitcher(),
        new OpenLayers.Control.Navigation()
        ]
    });

    // Create layers to add
    var layers = [
    osm = new OpenLayers.Layer.OSM("Simple OSM Map"),
    gsat = new OpenLayers.Layer.Google("Google Satellite",
    {
        type: google.maps.MapTypeId.SATELLITE,
        numZoomLevels: 22
    }
    ),
    vectors = new OpenLayers.Layer.Vector("Results",{
        projection: new OpenLayers.Projection("EPSG:4326"),
        styleMap: CG.getFeatureStyles()
    })
    ];

    // We will need a reference to the vector layer
    CG.vectorLayer = vectors;

    // Create a control to allow the selection of features
    CG.selectControl = new OpenLayers.Control.SelectFeature(
        vectors,
        {
            "hover": false,
            "multiple": false
        }
        );
    map.addControl(CG.selectControl);
    CG.selectControl.activate();
    vectors.events.register("featureselected",this,CG.onFeatureSelect);
    vectors.events.register("featureunselected",this,CG.onFeatureUnselect);


    // Create an instance of the custom control that will handle the clicks
    // on the map
    var click = new OpenLayers.Control.Click();
    map.addControl(click);
    click.activate();


    map.addLayers(layers);

    map.setCenter(
        new OpenLayers.LonLat(-1.613616943359375, 54.99337311367353).transform(
            new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject()), 12
        );

    CG.map = map;


}
);