// App namespace
var CG = {
    map: null,

    featuresLayer: null,

    selectedFeature: null,

    selectControl: null,

    clickControl: null,

    features: [],

    radius: 2,

    numResults: 10,

    centerOnResults: false,

    avoidNextClick: false,

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
        url += "&wt=json";      //JSON output


        url = "proxy.php?url="+escape(url);

        if ($("#message").is(":visible")) $("#message").hide("slide",{ direction: "up" },1000);
        $("#loading").show("slide",{ direction: "up" },500);

        $.getJSON(url,function(results){
            CG.features = [];

            // Create an array of new features from the results
            if (results && results.response && results.response.docs){
                var docs = results.response.docs;
                var doc;
                for (var i = 0; i < docs.length; i++){
                    doc = docs[i];                    
                    CG.features.push(
                        new OpenLayers.Feature.Vector(
                            // Geometry: We need to transform Lat/Lon to Mercator
                            new OpenLayers.Geometry.Point(doc.lng,doc.lat).transform(
                                new OpenLayers.Projection("EPSG:4326"),
                                CG.map.getProjectionObject()
                                ),
                                // Attributes
                                {
                                "name": doc["dc.title"][0],
                                "address": doc.institution_address,
                                "type": doc.institution_sector,
                                "website": doc["oai_is.website"],
                                "distance": doc.geo_distance

                            }
                            )
                        );
                }
            }

            $("#loading").hide("slide",{ direction: "up" },500);

            if (CG.features.length)
                CG.mapResults();
            else
                $("#message").html("No results found").show("slide",{ direction: "up" },500);


        })

        return true;
    },

    searchCollection: function(){
        var collection = escape($("#current_collection").val());
        var text = escape($("#collection_search").val());


        var url = "http://culturegrid.org.uk/index/select/?";
        url += "q=dcterms.isPartOf_Name%3A\"" + collection +"\"%20AND%20text%3A" + text;
        url += "&version=2.2";
        url += "&start=0";
        url += "&rows=5";
        url += "&wt=json";      //JSON output

        url = "proxy.php?url="+escape(url);

        if ($("#message").is(":visible")) $("#message").hide("slide",{ direction: "up" },1000);
        $("#loading").show("slide",{ direction: "up" },500);

        $.getJSON(url,function(results){

            if (results && results.response && results.response.docs){
                var docs = results.response.docs;
                var doc;
                if (docs.length == 0){
                    $("#message").html("No results found").show("slide",{ direction: "up" },500);
                    return false;
                }
                var div = $("<div></div>");
                var header = $("<div></div>");

                header.attr("class","results-header");
                header.html("Results found: "+results.response.numFound + " (Only the first five shown)");

                div.append(header);

                for (var i = 0; i < docs.length; i++){
                    doc = docs[i];
                    result = $("<div></div>");
                    result.addClass("results-item");

                    divimg = $("<div></div>");
                    divimg.addClass("results-layout results-divimg");
                    if (doc["pndsterms.thumbnail"]){
                        img = $("<img />");
                        img.attr({"src":doc["pndsterms.thumbnail"]
                                ,"class":"results-img"});
                        divimg.append(img)
                    } else {
                        divimg.addClass("results-noimg");
                    }

                    result.append(divimg);

                    divright = $("<div></div>");
                    divright.addClass("results-layout results-divright");

                    title = $("<div></div>");
                    title.html(doc["dc.title"][0]);
                    title.addClass("results-title");
                    divright.append(title)

                    url = $("<div></div>");
                    a = $("<a />")
                    a.attr({"href":doc["dc.related.link"],"target":"_blank"})
                    a.html("View resource")
                    url.addClass("results-url");
                    url.append(a);
                    divright.append(url);

                    result.append(divright);

                    div.append(result);
                }

                div.dialog({
                    "title":"Results",
                    "width":500
                })

            }
            $("#loading").hide("slide",{ direction: "up" },500);
        });
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

        CG.avoidNextClick = true;

        var feature = event.feature;
        CG.selectedFeature = feature;

        var html = "<div class=\"popup\">";
        html += (feature.attributes.type) ? "<div class=\"type\">" +  feature.attributes.type + "</div>" : "<div class=\"type\">Unknown</div>" ;
        html += "<div class=\"name\">" + feature.attributes.name +"</div>";
        html += "<div class=\"address\">" + feature.attributes.address+"</div>"

        if (feature.attributes.website)
            html += "<div class=\"website\"><a href=\"" + feature.attributes.website + "\" target=\"_blank\">" + feature.attributes.website +"</a></div>"
        html += "<div class=\"distance\">Distance: " + parseFloat(feature.attributes.distance).toFixed(2)+" miles</div>"
        html += "</div>"

        if (institutions[feature.attributes.name]){
            html += "<div class=\"collections\">"
            html += "<div style=\"font-weight: bold\">Search the '" + institutions[feature.attributes.name].collections[0] + "' collection:</div>"
            html += "<form><input type=\"text\" id=\"collection_search\"/> <input type=\"button\" onclick=\"CG.searchCollection()\" value=\"Search\" />"
            html += "<input type=\"hidden\" id=\"current_collection\" value=\"" + institutions[feature.attributes.name].collections[0] + "\">"
            html += "</form>"
            html += "</div>"
        }



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
        CG.avoidNextClick = true;
        
        CG.selectControl.unselect(CG.selectedFeature);
        CG.selectedFeature = null;
    },

    onFeatureUnselect: function(event){
        CG.map.removePopup(event.feature.popup);
        event.feature.popup.destroy();
        event.feature.popup = null;
    },

    onDragComplete: function(feature,pixel){

        if (CG.selectedFeature){
            CG.selectControl.unselect(CG.selectedFeature);
            CG.selectedFeature = null;
        }

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
    },

    showDialog: function(){
        $("#about").dialog({
            width:720,
            height:475,
            title: "About / Help"
        });
    },

    onLocation: function(position){

        // Get location from browser
        var point = new OpenLayers.LonLat(position.coords.longitude, position.coords.latitude)
                    .transform(new OpenLayers.Projection("EPSG:4326"),CG.map.getProjectionObject());

        // Add Marker
        var marker = CG.markerLayer.features[0];
        if (marker){
            // Move the existing marker
            marker.move(lonlat);
        } else {
            // Create a new marker
            marker = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(point.lon, point.lat));
            CG.markerLayer.addFeatures([marker]);
        }
        
        // Center map
        CG.map.setCenter(point);
        
        // Do request on these coordinates
        CG.doRequest(position.coords.longitude, position.coords.latitude);
    },

    onLocationError: function(){
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

        // Prevent the request when clicking a feature or closing a popup.
        // Not sure if it's the best way of doing it though
        if (CG.avoidNextClick){
            CG.avoidNextClick = false;
            return false;
        }

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

    // Register events
    $("#radius").change(function(){
        CG.radius = $(this).val()
    });
    $("#num_results").change(function(){
        CG.numResults = $(this).val()
    });
    $("#recenter").change(function(){
        CG.centerOnResults = (this.checked)
    });
    $("#show_about").click(function(){
        CG.showDialog();
    });


    // Set element positions
    $("#loading").css("left",$(window).width()/2 - $("#loading").width()/2);
    $("#message").css("left",$(window).width()/2 - $("#message").width()/2);



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
    CG.clickControl = new OpenLayers.Control.Click();
    map.addControl(CG.clickControl);
    CG.clickControl.activate();

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

    // Show About / help
    CG.showDialog();


    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(CG.onLocation, CG.onLocationError);
    } else {
        $("#message").html("Your browser does not support geolocation").show("slide",{ direction: "up" },500);
    }

}
);
