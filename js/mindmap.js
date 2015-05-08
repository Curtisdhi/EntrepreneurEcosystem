/*
 * The MIT License
 *
 * Copyright (C) 2014-2015 Northeast State Community College and Curtis Hicks
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * Script Settings
 */
var settings = {
    //Google Fusion table id
    tableId: "1QQ2241wObnzZVUVB4SXEw9c-dJlOF06DxTMoqbY_",
    //Google developer api key
    apikey: "AIzaSyDWzhyWLip4dh6WUUJmuunvpeiJgaFplMo",
    //Rather or not to display debug messages.
    //Note, this must be false in order for IE9 to work. 
    debug: false,
    map: {
        //Google map center
        center: new google.maps.LatLng(36.299116, -82.255413),
        zoom: 10,
    }
};


/*
 * Do not edit below this line
 * unless you know what you are doing!
 */

//Google map object
var gmap = {
    map: null,
    layer: null,
    infoWindow: new google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(0, -5),
        maxWidth: 200
    })
};
//Arborjs system object
var sys = null;
//the arbor root node
var rootNode = null;

//kineticjs variables
var kinetic = {
    stage: null,
    nodeLayer: null,
    lineLayer: null
};

var container = null;

var toolTip = null;
var highlightTip = null;

var isMobile = (navigator.userAgent.toLowerCase().indexOf('android') > -1) ||
            (navigator.userAgent.match(/(iPod|iPhone|iPad|BlackBerry|Windows Phone|iemobile)/));

(function($) {

    /*
    * Arbor render handler
    */
    Renderer = function() {
        //var canvas = container.find("canvas").get(0);
        var hidden = false;
        var that = {
            init: function(pSystem) {
                sys = pSystem;
                sys.screen({
                    size: {
                        width: container.width(),
                        height: container.height()
                    },
                    padding: [36, 60, 36, 60]
                });
                $(window).resize(that.resize);
                that.resize();

            },
            resize: function() {
                var width = $("#mindmap-container").width();
                var height = $("#mindmap-container").height();
                kinetic.stage.setWidth(width);
                kinetic.stage.setHeight(height);
                //if (settings.debug) console.log(width + " : " + height);
                sys.screen({
                    size: {
                        width: width,
                        height: height
                    }
                });
                that.redraw();
            },
            redraw: function() {
                //console.log(sys.energy())
                sys.eachEdge(function(edge, p1, p2) {
                    var line = edge.data.kinetic.line;
                    var sG = edge.source.data.kinetic.group;
                    var tG = edge.target.data.kinetic.group;
                    
                    line.setPoints(
                        [sG.x(),
                        sG.y(), 
                        tG.x(), 
                        tG.y()
                    ]);

                });
                sys.eachNode(function(node, pt) {
                    //console.log(pt);
                    node.data.kinetic.group.x(pt.x);
                    node.data.kinetic.group.y(pt.y);

                });
                kinetic.lineLayer.draw();
                kinetic.nodeLayer.draw();

            }
        }

        return that;
    }

    /*
    * A custom jQuery animation.
    * It is a blend of a fadein-out and slideup-down
    */
    $.fn.slideFadeToggle = function(speed, easing, callback) {
        return this.animate({
            opacity: 'toggle',
            height: 'toggle',
        }, 
		{
			//We need to trigger the window resize event so the canvas will automatically stretch
			step: function() { $(window).resize(); }
		}, speed, easing, callback);
    };

    /*
     * Initialize google maps
     */
    function gmapInitialize() {
        google.maps.visualRefresh = true;
        var mapDiv = document.getElementById('map-canvas');
        //This code doesn't work? Even though it's straight from Google's documentation?
        //Might because my HTML is missing a meta tag with name viewport.
        /* if (isMobile) {
            var viewport = document.querySelector("meta[name=viewport]");
            viewport.setAttribute('content', 'initial-scale=1.0, user-scalable=no');
            mapDiv.style.width = '100%';
            mapDiv.style.height = '100%';
        } */

        gmap.map = new google.maps.Map(mapDiv, {
            center: settings.map.center,
            zoom: settings.map.zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
        });
        gmap.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend-open'));
        gmap.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend'));

        gmap.layer = new google.maps.FusionTablesLayer({
            suppressInfoWindows: true,
            map: gmap.map,
            heatmap: {
                enabled: false
            },
            query: {
                select: "geometry",
                from: settings.tableId,
                orderBy: "Node Id"
            },
            options: {
                styleId: 2,
                templateId: 3
            }
        });

        //Settings for Fusion Tips
        gmap.layer.enableMapTips({
            googleApiKey: settings.apikey,
            select: "Name", // list of columns to query, typially need only one column.
            from: settings.tableId, // fusion table name
            where: "'Node Id' NOT EQUAL TO ''", //Do not include blank Node Ids
            geometryColumn: "geometry", // geometry column name
            suppressMapTips: true, // optional, whether to show map tips. default false
            delay: 200, // milliseconds mouse pause before send a server query. default 300.
            tolerance: 12 // tolerance in pixel around mouse. default is 6.

        });

        //This code doesn't work? Even though it's straight from Google's documentation?
        /*if (isMobile) {
            var legend = document.getElementById('googft-legend');
            var legendOpenButton = document.getElementById('googft-legend-open');
            var legendCloseButton = document.getElementById('googft-legend-close');
            legend.style.display = 'none';
            legendOpenButton.style.display = 'block';
            legendCloseButton.style.display = 'block';
            legendOpenButton.onclick = function() {
                legend.style.display = 'block';
                legendOpenButton.style.display = 'none';
            }
            legendCloseButton.onclick = function() {
                legend.style.display = 'none';
                legendOpenButton.style.display = 'block';
            }
        }*/


        google.maps.event.addListener(gmap.layer, 'click', function(e) {
            if (settings.debug) console.log(e);
            var nodeId = e.row["Node Id"].value;
            if (nodeId) {
                popOpenMindMap(nodeId);
            }
        });

        google.maps.event.addListener(gmap.layer, 'mouseover', function(e) {
            if (settings.debug) console.log(e);
            if (gmap.infoWindow) {
                clearTimeout(gmap.infoWindow.timer);
            }
            
            var content = '<div class="googft-info-window"><p>' + e.row.Name.value + '</p></div>';
            
            gmap.infoWindow.setContent(content);
            gmap.infoWindow.setPosition(e.latLng);
            
            gmap.infoWindow.open(gmap.map);
        });

        google.maps.event.addListener(gmap.layer, 'mouseout', function(e) {
            if (gmap.infoWindow) {
                gmap.infoWindow.timer = setTimeout(function() {
                    gmap.infoWindow.close();
                }, 800);
            }
        });

    }

    google.maps.event.addDomListener(window, 'load', gmapInitialize);


    $(document).ready(function() {
        container = $("#mindmap-container");
        //hide the context menu on right clicks
        container[0].addEventListener('contextmenu', function (event) {
          event.preventDefault();
        });
        
        /* Set up KineticJs */
        kinetic.stage = new Kinetic.Stage({
            container: 'mindmap-container',
            width: 800,
            height: 500
        });
        kinetic.nodeLayer = new Kinetic.Layer();
        kinetic.lineLayer = new Kinetic.Layer();
        kinetic.stage.add(kinetic.lineLayer);
        kinetic.stage.add(kinetic.nodeLayer);

        /* Set up Arbor */
        sys = arbor.ParticleSystem();
        sys.parameters({
            friction: 0.5,
            stiffness: 512,
            repulsion: 2600,
            gravity: true,
            dt: 0.02,
            fps: 55,
            precison: 0.5
        });
        sys.screenPadding(100);
        sys.renderer = Renderer();
        
        window.setTimeout(function() {
            sys.eachNode   
        }, 5000);
        
        /* 
        * Query our Fusion table 
        * jsonp is required for IE9 and 10 support 
        * 
        * Do note I am using Fusion V1 and not V2.
        * I am not sure how to properly Auth with V2. 
        */
        var query = "SELECT * FROM " + settings.tableId + " WHERE 'Node Id' NOT EQUAL TO '' ORDER BY 'Node Id'";
        var url =  "https://www.googleapis.com/fusiontables/v1/query?sql=" + query + "&key=" + settings.apikey;
        $.ajax({ 
            url: url,
            crossDomain:true,
            dataType: "jsonp"
        }).done(function(data) {
            if (settings.debug) console.log(data);
            buildNodes(data);
        });
        //need to on a timer for some reason...
        window.setTimeout(function() { rootNode.fixed = true; }, 2000);

        /*
         * Gets the column indexes for our Fusion Table
         * This is used to ensure that we are using the correct index for a column 
         *
         * Accepts an Array of column index and name data
         */
        function getColumnIndexs(columns) {
            var indexs = {};
            //find the index of node Id
            $.each(columns, function(i, value) {
                switch (value) {
                    case "Node Id":
                        indexs.id = i;
                        break;
                    case "Node Relation":
                        indexs.relation = i;
                        break;
                    case "Node Color":
                        indexs.color = i;
                        break;
                    case "Node Label":
                        indexs.label = i;
                        break;
                    case "Name":
                        indexs.name = i;
                        break;
                    case "Link":
                        indexs.link = i;
                        break;
                }
            });
            return indexs;
        }

        /*
         * Builds our mindmap node map
         *
         * Accepts JSON data from Google Fusion table
         */
        function buildNodes(data) {
            var nodes = [];

            var columns = data.columns;
            var rows = data.rows;

            var index = getColumnIndexs(columns);

            $.each(rows, function() {
                var id = $(this)[index.id].trim();
                var name = $(this)[index.name].trim();
                var label = $(this)[index.label].trim();
                var link = $(this)[index.link].trim();
                var color = $(this)[index.color].trim();
                var relations = $(this)[index.relation].split(',');
                $.each(relations, function(i) {
                    relations[i] = relations[i].trim();
                });

                if (id && (name || label)) {
                    var i = nodes.length;

                    nodes[i] = sys.addNode(id, {
                        label: label ? label : name, //use label if label is not empty
                        link: link,
                        relations: relations,
                        kinetic: {
                            color: color,
                            group: group
                        },
                        expanded: false
                    });

                    var group = createDrawGroup(nodes[i]);
                    nodes[i].data.kinetic.group = group;

                    if (link === "#root") {
                        rootNode = nodes[i];
                        group.setVisible(true);
                        group.on("click", toggleView);   
                    }

                }

            });

            /*
            * Link nodes and create a line shape for KineticJs
            */
            $.each(nodes, function(id, node) {
                var relations = node.data.relations;
                $.each(relations, function(i, rel) {
                    var relation = sys.getNode(rel);
                    if (relation) {
                        var line = new Kinetic.Line({
                            points: [],
                            strokeWidth: 2,
                            stroke: "gray",
                            tension: 1,
                            dash: [10, 5, 3, 5],
                            visible: false
                        });
                        kinetic.lineLayer.add(line);

                        sys.addEdge(relation, node, {
                            kinetic: {
                                line: line
                            }
                        });
                    }
                });
            });
            
            toggleNode(rootNode);
        }

        /*
        * Creates our Kinetic graphics scene from our Arbor node.
        * This function binds several events to the node group  
        *
        * Accepts an Arbor node
        */
        function createDrawGroup(node) {
            var text = new Kinetic.Text({
                text: node.data.label,
                x: 0,
                y: 0,
                fill: "white",
                align: "center",
                padding: 5
            });
            
            /*
            * Shape settings
            */
            var shapeOptions = {
                width: text.getWidth(),
                height: text.getHeight(),
                x: 0,
                y: 0,
                fill: node.data.kinetic.color,
                //stroke: "white", //Using stroke is too much for chrome to handle...
                cornerRadius: 4,
                shadowOffset: {
                    x: 5,
                    y: 5
                },
                shadowColor: "gray",
                shadowBlur: 8
            };

            var shape = new Kinetic.Rect(shapeOptions);

            var group = new Kinetic.Group({
                draggable: !isMobile, //We do not want it draggle if mobile.
                offset: {
                    x: shape.getWidth() / 2,
                    y: shape.getHeight() / 2
                },
                visible: false
            });

            group.add(shape);
            group.add(text);
            kinetic.nodeLayer.add(group);

            //Turn off the node's physics
            group.on("dragstart", function(e) {
                document.body.style.cursor = 'move';
                e.target.node.fixed = true;
                //Do not unfix children if node is root.
                if (e.target.node != rootNode) {
                    //unfix children to allow the children to move with parent
                    unfixChildren(e.target.node);
                }
            });
            //Turn physics back on
            group.on("dragend", function(e) {
                document.body.style.cursor = 'default';
            });
            group.on("dragmove", function(e) {
                var pt = arbor.Point(e.target.x(), e.target.y());
                e.target.node.p = sys.fromScreen(pt);
                //if (settings.debug) console.log(e.target.node);
            });

            group.on("click tap", function(e) {
                
                var node = e.target.parent.node;
                console.log(e);
                if (e.evt.button == 0) {
                    var link = node.data.link;

                    if (link && link !== "#root") {
                        window.open(link, "_BLANK");
                    } else if (link !== "#root") {
                        toggleNode(e.target.parent.node);
                    }

                    if (!link.trim()) {
                        link = node.data.expanded ? "Click to Collapse" : "Click to Expand";
                        changeTooltipText(toolTip, link);
                    }

                    kinetic.nodeLayer.draw();
                }
                //toggle fixed on right click
                else {
                    node.fixed = !node.fixed;
                }
            });

            group.on("mouseenter touchstart", function(e) {
                var node = e.target.parent.node;
                if (node) {
                    var link = node.data.link;
                    document.body.style.cursor = 'pointer';
                    if (link === "#root") {
                        link = "Go back to map";
                    } else if (!link.trim()) {
                        link = node.data.expanded ? "Click to Collapse" : "Click to Expand";
                    } else {
                        window.status = link;
                    }

                    //if (settings.debug) console.log(link);
                    removeTooltip(toolTip);
                    toolTip = displayTooltip(e.target.parent, link);

                    e.target.parent.moveToTop();

                    kinetic.nodeLayer.draw();
                }
            });
            group.on("mouseleave touchend", function(e) {
                document.body.style.cursor = 'default';
                window.status = "";
                removeTooltip(toolTip);
                kinetic.nodeLayer.draw();
            });

            //assoicate our group with our arbor node 
            group.node = node;

            return group;
        }

    });
    
    $("#map-canvas").parent().show();
    
})(this.jQuery);

/*
* Recurvisly unfixes children to allow them to freely move with their parent
* Accepts an arbor node object
*/
function unfixChildren(node) {
    edges = sys.getEdgesFrom(node);
    if (edges && edges.length > 0) {
        $.each(edges, function(i, edge) {
            var child = edge.target;
            child.fixed = false;
            unfixChildren(child);
        });
    }
}

/*
* Collapses all nodes and brings up the mindmap
* Then expands the node and highlights it
*
* Accepts a String of the node's name
*/
function popOpenMindMap(nodeId) {
    if (settings.debug) console.log(nodeId);
    toggleView();
    var node = sys.getNode(nodeId.trim());
    collapseNode(rootNode);
    //expandNode(rootNode);
    expandNode(node);
    removeTooltip(highlightTip);
    highlightTip = displayTooltip(node.data.kinetic.group, node.data.link);
	node.data.kinetic.group.moveToTop();
    
    kinetic.lineLayer.draw();
    kinetic.nodeLayer.draw();
	
}

/*
* A quick function that toggle expands and collapses a node
*
* Accepts an Arbor node object
*/
function toggleNode(node) {
    if (node.data.expanded) {
        collapseNode(node);
    } else {
        expandNode(node);
    }
    kinetic.lineLayer.draw();
    kinetic.nodeLayer.draw();
}

/*
* Recurvisily expands a node structure. 
* This function propagates down to the root expanding each node
* It always expands the first level of children of the node.
* 
* Accepts an Arbor node object
*/
function expandNode(node) {
    fromEdges = sys.getEdgesFrom(node);
    toEdges = sys.getEdgesTo(node);

    $.each(fromEdges, function(i, edge) {
        var child = edge.target;

        /*var tween = new Kinetic.Tween({
            node: child.data.kinetic.group,
            opacity: 1,
            duration: 1,
            easing: Kinetic.Easings.EaseIn
        });*/
        // node.data.kinetic.group.setVisible(true);
        child.data.kinetic.group.setVisible(true);
        edge.data.kinetic.line.setVisible(true);
        
        var connections = sys.getEdgesTo(child);
        if (connections && connections.length > 1) {
             $.each(connections, function(i, e) {
                e.data.kinetic.line.setVisible(true);
             });
        }


        //child.data.kinetic.group.setOpacity(0);
    });


    $.each(toEdges, function(i, edge) {
        var parent = edge.source;

        expandNode(parent);
    });
    
    node.data.expanded = true;
    
}

/*
* Recurvisily collapses a node structure. 
* This function goes up from the first node and 
* continues until all attached nodes are collapsed.
*
* Accepts an Arbor node object
*/
function collapseNode(node) {
    edges = sys.getEdgesFrom(node);

    if (edges && edges.length > 0) {
        $.each(edges, function(i, edge) {
            var child = edge.target;
			var connections = sys.getEdgesTo(child);
			var multiConnectionsExpanded = false;
			if (connections && connections.length > 1) {
				 $.each(connections, function(i, e) {
                     //if attached nodes (not including the one we are collapsing)
                     //are expanded, we do not want to collapse the child node,
                     //as it is part of another expanded node structure.
					if (e.source.data.expanded && e.source !== node) {
						multiConnectionsExpanded = true;
					}
                 //console.log(e.source.data.expanded +" : "+ e.source.name);
				 });
			}
            
            //if we're not connected to other expanded nodes, then continue to collapse.
			if (!multiConnectionsExpanded) {
                //clean up connected lines
                if (connections && connections.length > 1) {
                     $.each(connections, function(i, e) {
                        e.data.kinetic.line.setVisible(false); 
                     });
                }
                
				child.data.kinetic.group.setVisible(false);
				edge.data.kinetic.line.setVisible(false);
				collapseNode(child);
			}
        });
        node.data.expanded = false;

    }

}

/*
* Toggles views between the Google maps and our mindmap
*/
function toggleView() {
    //sys.renderer.switchMode();
    container.parent().slideFadeToggle();
    $("#map-canvas").parent().slideFadeToggle();
}

/*
* A quick function to change a tooltip's text
*
* Accepts a Kinetic Tag object and a String
*/
function changeTooltipText(tip, text) {
    tip.getText().setText(text);
}

/*
* Creates a Kinetic Tag object and binds it to the supplied Kinetic Group
* 
* Accepts a Kinetic Group object and a String
*/
function displayTooltip(group, text) {
    var tip = new Kinetic.Label({
        x: group.offsetX(),
        opacity: 0.75
    });

    tip.add(new Kinetic.Tag({
        fill: "black",
        stroke: "gray",
        pointerDirection: "down",
        pointerWidth: 10,
        pointerHeight: 10
    }));

    tip.add(new Kinetic.Text({
        text: text,
        padding: 5,
        fill: "white"
    }));
    group.add(tip);
    return tip;
}

/*
* Destroys the tooltip
*
* Accepts a Kinetic Tag object
*/
function removeTooltip(tip) {
    if (tip) {
        tip.destroy();
    }
}