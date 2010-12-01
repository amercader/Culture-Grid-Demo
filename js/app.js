// App namespace
var CG = {
    map: null,

    featuresLayer: null,

    selectedFeature: null,

    selectControl: null,

    features: [],

    radius: 2,

    numResults: 10,

    centerOnResults: false,

    // x and y should be in lat/lon
    doRequest: function(x,y){

        if (!(x && y)) return false;

        var url = "http://culturegrid.org.uk/index/select/?";
        url += "q=dcterms.isPartOf%3AMLAInstitutions";
        url += "&version=2.2";
        url += "&start=0";
        url += "&indent=on";
        url += "&radius=" + this.radius;
        url += "&rows=" + this.numResults;
        url += "&qt=geo";
        url += "&sort=geo_distance%20asc";
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
        var layer = CG.featuresLayer;

        // Delete previous features
        if (layer.features.length)
            layer.removeAllFeatures();

        // Add new features to map
        layer.addFeatures(CG.features);

        // Center map in new features extent
        if (CG.centerOnResults)
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

    onDragComplete: function(feature,pixel){
        var lonlat = this.map.getLonLatFromViewPortPx(pixel);

        // Transform the coordinates from Spherical Mercator to Lat/lon (WGS84)
        lonlat.transform(
            CG.map.getProjectionObject(),
            new OpenLayers.Projection("EPSG:4326"));

        CG.doRequest(lonlat.lon, lonlat.lat);
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
                    externalGraphic:'./img/icons/library.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Museums"
                }),
                symbolizer: {
                    externalGraphic:'./img/icons/museum.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Research Institutes"
                }),
                symbolizer: {
                    externalGraphic:'./img/icons/research.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Cross-domain Institutions"
                }),
                symbolizer: {
                    externalGraphic:'./img/icons/crossdomain.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Media"
                }),
                symbolizer: {
                    externalGraphic:'./img/icons/media.png'
                }
            }),
            new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: "==",
                    property: "type",
                    value: "Archives"
                }),
                symbolizer: {
                    externalGraphic:'./img/icons/archive.png'
                }
            }),
            new OpenLayers.Rule({
                elseFilter: true,
                symbolizer: {
                    externalGraphic:'./img/icons/other.png'
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

        var lonlat = this.map.getLonLatFromViewPortPx(e.xy);


        // Add Marker
        var marker = CG.markerLayer.features[0];
        if (marker){
            // Move the existing marker
            marker.move(lonlat);
        } else {
            // Create a new marker
            marker = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat));
            CG.markerLayer.addFeatures([marker]);
        }

        // Transform the coordinates from Spherical Mercator to Lat/lon (WGS84)
        lonlat.transform(
            CG.map.getProjectionObject(),
            new OpenLayers.Projection("EPSG:4326"));

        CG.doRequest(lonlat.lon, lonlat.lat);

        return true;
    }

});



$(document).ready(function(){

    $("#radius").change(function(){
        CG.radius = $(this).val()
    });
    $("#num_results").change(function(){
        CG.numResults = $(this).val()
    });
    $("#recenter").change(function(){
        CG.centerOnResults = (this.checked)
    });


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
    }),
    marker = new OpenLayers.Layer.Vector("Marker",{
        projection: new OpenLayers.Projection("EPSG:4326"),
        styleMap: new OpenLayers.StyleMap({
            externalGraphic:'./img/marker.png',
            graphicWidth:12,
            graphicHeight:20
        })
    })
    ];
    map.addLayers(layers);

    // We will need a reference to the vector and marker layers
    CG.featuresLayer = vectors;
    CG.markerLayer = marker;

    // Create a control to allow the selection of features
    CG.selectControl = new OpenLayers.Control.SelectFeature(
        [vectors,marker],
        {
            "hover": false,
            "multiple": false
        }
        );
    map.addControl(CG.selectControl);
    vectors.events.register("featureselected",this,CG.onFeatureSelect);
    vectors.events.register("featureunselected",this,CG.onFeatureUnselect);
    CG.selectControl.activate();

    // Create an instance of the custom control that will handle the clicks
    // on the map
    var click = new OpenLayers.Control.Click();
    map.addControl(click);
    click.activate();

    // Create a control to drag the marker
    var drag = new OpenLayers.Control.DragFeature(
        marker,
        {onComplete: CG.onDragComplete});
    map.addControl(drag);
    drag.activate();


    map.setCenter(
        new OpenLayers.LonLat(-1.613616943359375, 54.99337311367353).transform(
            new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject()), 12
        );

    CG.map = map;


}
);
