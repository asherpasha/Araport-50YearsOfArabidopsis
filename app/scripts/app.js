///*globals d3*/
// global variables
var allPubs = {}; // an associative array keyed by BCI_ID of all publications, including Title, Author, Year, etc.
var allLinks = {}; // an associative array keyed by BCI_ID of all the pubs that reference a specific pub
var allBackLinks = {}; // an associative array keyed by BCI_ID of the pubs that a specific pub references
var allConceptCodes = []; // a duplicate of allPubs, but cast as an array with 'value' and 'label' tags so autocomplete can use it
var searchMode = false;
var displayMode = "category46";
//var displayMode = "citationType";

var autocompleteArray = [];

var margin = {
        top: 30,
        right: 20,
        bottom: 35,
        left: 60
    },
    width = jQuery("#chartWindow").width() - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.category20();

// initialize the tooltips
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .direction('n')
    .html(function(d) {
        var contents = "<div class='tip-title'>" + d.Title + "</div>";
        contents += "<div class='tip-body'>" + d.Authors + "</div>";
        contents += "<div class='tip-body'>" + d.Addresses + "</div>";
        contents += "<div class='tip-body'>" + d.Journal + " (" + d.Year + ":" + d.Volume + ")</div>";
        if (d.NumNotAthCitations > 0) {
            contents += "<div class='tip-citations' style='margin-top: 10px;'>Non-Ath Citations: " + d.NumNotAthCitations + "</div>";
            contents += "<div class='tip-citations'>Citations: " + d.Citations + " " + citationIndicator(d.Citations) + "</div>";
        } else {
            contents += "<div class='tip-citations' style='margin-top: 10px;'>Citations: " + d.Citations + " " + citationIndicator(d.Citations) + "</div>";
        }
        //contents += "<div class='tip-body'>Cited by: "+d.CitationType+"</div>";
        //contents += "<div class='infoBox-categoryMarker "+d.CitationType+"'></div>";
        contents += "<div class='tip-citations' style='margin-top:8px'>" + allConceptCodes[d.Category46].Category + "</div>";
        return contents;
    })
    .offset([-15, -2]); // y, x


//--------------------------------------------//
// Small function to return the html for a slider bar to be used as a size indicator
function citationIndicator(num) {

    var barSize = d3.scale.log().domain([1, 4000]).range([0, 100]);
    //console.log(barSize(num));
    var citationIndicator = "<div class='citationIndicatorBase'>";
    citationIndicator += "<div class='citationIndicatorBar' style='width:" + Math.min(barSize(num), 100) + "px;'></div>";
    citationIndicator += "</div>";

    return citationIndicator;
}


// Small function to return the html for a slider bar to be used as a size indicator
function nonAthCitationIndicator(nonAthNum, athNum, color) {

    var barSize = d3.scale.log().domain([1, 4000]).range([0, 100]);
    var nonAthbarSize = barSize(athNum) * (nonAthNum / athNum);
    //console.log(barSize(num));
    var citationIndicator = "<div class='citationIndicatorBase'>";
    citationIndicator += "<div class='citationIndicatorBar' style='width:" + Math.min(nonAthbarSize, 100) + "px; background-color:" + color + ";'></div>";
    citationIndicator += "</div>";

    return citationIndicator;
}

//--------------------------------------------//
// Load concept codes data
function loadConceptCodes() {
	query = {
		file: "three"
	};

	window.Agave.api.adama.search({
		'namespace':'asher-dev', 'service': '50years_v0.1.1', 'queryParams': query
	} , function(response) {
		var mydata = JSON.parse(response.data);
		var datatemp = mydata.stuff;
		//alert(datatemp);
		data = getd3tsv(datatemp);
        //console.log(data);
        for (var i = 0; i < data.length; i++) {
            // Add to the array
            allConceptCodes[data[i].ConceptCode] = data[i];
        }
        console.log("Loaded all Concept Codes");

        // prebuild legend
        if (displayMode == "category46") {
            drawCategory46Legend();
        } else {
            drawCitationTypeLegend();
        }
    })
}


//--------------------------------------------//
// Load interactions data
function loadInteractions() {
	query = {
		file: "one"
	};

	window.Agave.api.adama.search({
		'namespace':'asher-dev', 'service': '50years_v0.1.1', 'queryParams': query
	} , function(response) {
		// I don't know why do we need this, but we need these lines for the code to work.
		if (response.length == 0) {
			setTimeout(callback, 2000);
		}

		var mydata = JSON.parse(response.data);
		var datatemp = mydata.stuff;
		//alert(datatemp);
		data = getd3tsv(datatemp);
        console.log("Loaded allLinks");

        for (var i = 0; i < data.length; i++) {
            // If BCI_ID exists, add the links to the array
            if (data[i].BCI_ID in allLinks) {
                allLinks[data[i].BCI_ID].push(data[i].Citing);
            }
            // otherwise create a new record and the element to the array
            else {
                allLinks[data[i].BCI_ID] = [];
                allLinks[data[i].BCI_ID].push(data[i].Citing);
            }
        };

        console.log("Built associative array of citations.");


        for (var i = 0; i < data.length; i++) {
            // If BCI_ID exists, add the links to the array
            if (data[i].Citing in allBackLinks) {
                allBackLinks[data[i].Citing].push(data[i].BCI_ID);
           
            // otherwise create a new record and the element to the array
            } else {
                allBackLinks[data[i].Citing] = [];
                allBackLinks[data[i].Citing].push(data[i].BCI_ID);
            }
        };

        console.log("Built associative array of backward references");


        console.log("Ready to use.");
    });
}

//--------------------------------------------//
// assign colors to each object
function makeCategoryColorTable() {
    // this is buried in a try catch because it was producing errors without it... 
    for (i in allPubs) {
        try {
            allPubs[i].Color = allConceptCodes[allPubs[i].Category46].Color;
        } catch (e) {
            allPubs[i].Color = "#000000";
        }
    }

    console.log("Colors are assigned");
    console.log("Getting ready to draw chart to screen...");
}



function makeCitationTypeColorTable() {
    for (i in allPubs) {
        if (allPubs[i].CitationType == "None") {
            allPubs[i].Color = "#BBBBBB";
        } else if (allPubs[i].CitationType == "Ath") {
            allPubs[i].Color = "#1973FF";
        } else if (allPubs[i].CitationType == "NotAth") {
            allPubs[i].Color = "#99CC00";
        } else {
            allPubs[i].Color = "#000000";
        }
    }

    console.log("Colors are assigned");
    console.log("Getting ready to draw chart to screen...");

}

// formats data so it looks like tsv output data
function getd3tsv(data) {
	var finalData = new Array();
	var dataArray = data.split("\n");
	var header = dataArray.shift();
	var headerArray = header.split("\t");
	var dataLineArray = new Array();
	var jsonString = "";

	dataArray.forEach(function(dataRow) {
		dataLineArray = dataRow.split("\t");
		jsonString = '{';
		for (var i = 0; i < dataLineArray.length; i++)  {
			jsonString = jsonString + '"' + headerArray[i] + '":"' + dataLineArray[i] + '"';
			if (i < dataLineArray.length -1) {
				jsonString = jsonString + ",";
			}
		}
		jsonString = jsonString + '}';
		//alert(jsonString);
		//alert("here0");
		jsonString = JSON.parse(jsonString);
		//alert("here1");
		//alert(jsonString);
		finalData.push(jsonString);
		//alert(finalData[0].Title);
	});
	return finalData;
}

//--------------------------------------------//
// make the SVG chart
function makeChart(type) {

    displayMode = type;
    // clear the contents of the chart div before we begin
    // Show the loading gif after a brief delay.... maybe trick it into runing in separate thread? Nope - doesn't work
    //setTimeout(function() {
    jQuery("#chartWindow").html("<div class='loadingMessage'>Building chart...</div>");
    jQuery("#chartWindow").append("<div class='loadingGif'><img src='http://bar.utoronto.ca/webservices/araport/50Years/loading.gif' style='width:150px'></div>");
    //}, 250);

    // add 'building chart' message



    if (type == "citationType") {
        console.log("building chart by Citation Type");
    }

    // based on d3 scatterplot by Mike Bostock: http://bl.ocks.org/mbostock/3887118



    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(d3.format("d"));

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");


    var svg = d3.select("#chartWindow").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var numPubsPerYear = [];
    for (var i = 1927; i < 2016; i++) {
        numPubsPerYear[i] = 0;
    };



    if (type == "category46") {
        // grey out button
        jQuery('#btn-showNotAth').removeClass('disabled');
        jQuery('#btn-showCategory46').addClass('disabled');

        console.log("building chart by Category46");
        // LOAD DATA
		query = {
			file: "two"
		};

		window.Agave.api.adama.search({
			'namespace':'asher-dev', 'service': '50years_v0.1.1', 'queryParams': query
		} , function(response) {
			var mydata = JSON.parse(response.data);
			var datatemp = mydata.stuff;
			//alert(datatemp);
			data = getd3tsv(datatemp);

                buildAssociativeArrayOfData(data);
                // make a color table for each category
                makeCategoryColorTable();

                // set y positions for each element based on how many pubs there are per year
                data.forEach(function(d) {
                    numPubsPerYear[d.Year] += 1;
                    d.y = numPubsPerYear[d.Year];
                });

                ///console.log (numPubsPerYear);

                // set range of axis
                x.domain([1965, 2015]);
                y.domain([0, 4000]);

                // add axis labels
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width)
                    .attr("y", -6)
                    .style("text-anchor", "end")
                    .text("Year");

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", -height / 2)
                    .attr("y", -60)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Publications");

                // Add tooltips
                svg.call(tip);

                // The slow part... !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

                // Add extended mouseover targets for each data point
                svg.selectAll(".mouseTarget")
                    .data(data)
                    .enter().append("rect")
                    .attr("id", function(d) {
                        return "mouseTarget" + d.BCI_ID
                    }) // give each circle an ID tag
                    //.attr("class", "pub")
                    .attr("class", function(d) {
                        return "mouseTarget"
                    })
                    .attr("height", "1")
                    .attr("width", function(d) {
                        return dotSize(3500);
                    })
                    .attr("y", function(d) {
                        return y(d.y);
                    }) //- (y(numPubsPerYear[d.Year])/2); })
                    .attr("x", function(d) {
                        return x(d.Year);
                    })
                    .style("fill", function(d) {
                        return "rgba(255,255,255,0)";
                    })
                    .style("display", function(d) {
                        if (d.Year < 1965) {
                            return "none"; // don't show any pubs prior to 1965
                        } else {
                            return "block";
                        }
                    })

                // action listeners
                .attr("onmouseover", function(d) { // run our mouseOverNode function on mouseover
                        return "tip.show( allPubs['" + d.BCI_ID + "'], mouseTarget" + d.BCI_ID + "); mouseOverPub('" + d.BCI_ID + "')"
                    })
                    .attr("onmouseout", function(d) { // run our mouseOutNode function on mouseout
                        return "tip.hide( allPubs['" + d.BCI_ID + "'], mouseTarget" + d.BCI_ID + "); mouseOutPub('" + d.BCI_ID + "')"
                    })
                    .attr("onclick", function(d) { // run our mouseOutNode function on mouseout
                        return "mouseClickPub('" + d.BCI_ID + "')"
                    });



                // Add dots for each data point
                svg.selectAll(".pub")
                    .data(data)
                    .enter().append("rect")
                    .attr("id", function(d) {
                        return "pub" + d.BCI_ID
                    }) // give each circle an ID tag
                    //.attr("class", "pub")
                    .attr("class", function(d) {
                        return "pub category" + d.Category46;
                    })
                    .attr("height", "1")
                    .attr("width", function(d) {
                        return dotSize(d.Citations);
                    })
                    .attr("y", function(d) {
                        return y(d.y);
                    }) //- (y(numPubsPerYear[d.Year])/2); })
                    .attr("x", function(d) {
                        return x(d.Year);
                    })
                    .style("fill", function(d) {
                        return d.Color;
                    })
                    .style("display", function(d) {
                        if (d.Year < 1965) {
                            return "none"; // don't show any pubs prior to 1965
                        } else {
                            return "block";
                        }
                    });


                // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                console.log("Chart is complete... get Links");


                // update the html page (add buttons, remove loading screen)
                jQuery('#buttonsBelowChart').css('display', 'block');
                jQuery('.loadingMessage').remove();
                jQuery('.loadingGif').remove();

            })
           	/* .on("progress", function(event) {
                //update progress bar
                if (d3.event.lengthComputable) {
                    var percentComplete = Math.round(d3.event.loaded * 100 / d3.event.total);
                    //console.log("Downloading data: "+percentComplete+"%");
                    if (percentComplete == 100) {
                        console.log("Building chart.... stand by...");
                    }
                }
            }); */
    } else if (type == "citationType") {
        console.log("building chart by Citation Type");
        jQuery('#btn-showNotAth').addClass('disabled');
        jQuery('#btn-showCategory46').removeClass('disabled');
        // LOAD DATA
		query = {
			file: "four"
		};

		window.Agave.api.adama.search({
			'namespace':'asher-dev', 'service': '50years_v0.1.1', 'queryParams': query
		} , function(response) {
			var mydata = JSON.parse(response.data);
			var datatemp = mydata.stuff;
			//alert(datatemp);
			data = getd3tsv(datatemp);

                buildAssociativeArrayOfData(data);
                // make a color table for each citationType
                makeCitationTypeColorTable();

                // set y positions for each element based on how many pubs there are per year
                data.forEach(function(d) {
                    numPubsPerYear[d.Year] += 1;
                    d.y = numPubsPerYear[d.Year];
                });

                ///console.log (numPubsPerYear);

                // set range of axis
                x.domain([1965, 2015]);
                y.domain([0, 4000]);

                // add axis labels
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width)
                    .attr("y", -6)
                    .style("text-anchor", "end")
                    .text("Year");

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", -height / 2)
                    .attr("y", -60)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Publications");

                // Add tooltips
                svg.call(tip);

                // The slow part... !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

                // Add extended mouseover targets for each data point
                svg.selectAll(".mouseTarget")
                    .data(data)
                    .enter().append("rect")
                    .attr("id", function(d) {
                        return "mouseTarget" + d.BCI_ID
                    }) // give each circle an ID tag
                    //.attr("class", "pub")
                    .attr("class", function(d) {
                        return "mouseTarget"
                    })
                    .attr("height", "1")
                    .attr("width", function(d) {
                        return dotSize(3500);
                    })
                    .attr("y", function(d) {
                        return y(d.y);
                    }) //- (y(numPubsPerYear[d.Year])/2); })
                    .attr("x", function(d) {
                        return x(d.Year);
                    })
                    .style("fill", function(d) {
                        return "rgba(255,255,255,0)";
                    })
                    .style("display", function(d) {
                        if (d.Year < 1965) {
                            return "none"; // don't show any pubs prior to 1965
                        } else {
                            return "block";
                        }
                    })

                // action listeners
                .attr("onmouseover", function(d) { // run our mouseOverNode function on mouseover
                        return "tip.show( allPubs['" + d.BCI_ID + "'], mouseTarget" + d.BCI_ID + "); mouseOverPub('" + d.BCI_ID + "')"
                    })
                    .attr("onmouseout", function(d) { // run our mouseOutNode function on mouseout
                        return "tip.hide( allPubs['" + d.BCI_ID + "'], mouseTarget" + d.BCI_ID + "); mouseOutPub('" + d.BCI_ID + "')"
                    })
                    .attr("onclick", function(d) { // run our mouseOutNode function on mouseout
                        return "mouseClickPub('" + d.BCI_ID + "')"
                    });



                // Add dots for each data point
                svg.selectAll(".pub")
                    .data(data)
                    .enter().append("rect")
                    .attr("id", function(d) {
                        return "pub" + d.BCI_ID
                    }) // give each circle an ID tag
                    //.attr("class", "pub")
                    .attr("class", function(d) {
                        return "pub category" + d.Category46;
                    })
                    .attr("height", "1")
                    .attr("width", function(d) {
                        return dotSize(d.Citations);
                    })
                    .attr("y", function(d) {
                        return y(d.y);
                    }) //- (y(numPubsPerYear[d.Year])/2); })
                    .attr("x", function(d) {
                        return x(d.Year);
                    })
                    .style("fill", function(d) {
                        return d.Color;
                    })
                    .style("display", function(d) {
                        if (d.Year < 1965) {
                            return "none"; // don't show any pubs prior to 1965
                        } else {
                            return "block";
                        }
                    });


                // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                console.log("Chart is complete... get Links");

                // update the html page (add buttons, remove loading screen)
                jQuery('#buttonsBelowChart').css('display', 'block');
                jQuery('.loadingMessage').remove();
                jQuery('.loadingGif').remove();


            });
            /*.on("progress", function(event) {
                //update progress bar
                if (d3.event.lengthComputable) {
                    var percentComplete = Math.round(d3.event.loaded * 100 / d3.event.total);
                    //console.log("Downloading data: "+percentComplete+"%");
                    if (percentComplete == 100) {
                        console.log("Building chart.... stand by...");
                    }
                }
            });*/
    }

}


//--------------------------------------------//
// store loaded data in a global array of All Pubs
function buildAssociativeArrayOfData(data) {
    allPubs = {};

    // store a global copy with BCI_ID as the key
    for (var i = 0; i < data.length; i++) {
        allPubs[data[i].BCI_ID] = data[i];
        //console.log(data[i]);

        allPubs[data[i].BCI_ID].y = y(data[i].Year);

        // keep a record of which BCI_ID's come previous and next to this one, and store the Y position
        // (these are used to populate the magnificaiton window when you hover over a pub)
        if (i > 0 && i < data.length - 1) {
            allPubs[data[i].BCI_ID].previousBCI_ID = data[i - 1].BCI_ID;
            allPubs[data[i].BCI_ID].nextBCI_ID = data[i + 1].BCI_ID;
        } else {
            allPubs[data[i].BCI_ID].previousBCI_ID = "BCI_ID00000000";
            allPubs[data[i].BCI_ID].nextBCI_ID = "BCI_ID00000000";
        }
    };

    buildAutocompleteArray();
}

//--------------------------------------------//
// Autocomplete requires an array instead of an associative array
function buildAutocompleteArray() {
    var counter = 0;
    autocompleteArray = [];

    for (i in allPubs) {
        autocompleteArray.push(allPubs[i]);
        autocompleteArray[counter].label = allPubs[i].Title;
        autocompleteArray[counter].value = allPubs[i].BCI_ID;
        counter++;
    }
}



//--------------------------------------------//
// mouse over / mouse out functions
var mouseOver; // a global variable to keep track of which pub the mouse is over
function mouseOverPub(BCI_ID) {
    mouseOver = BCI_ID;
    //console.log("mouseOver: "+BCI_ID);
    // add a marker over the current pub
    var xx = parseInt(jQuery('#pub' + BCI_ID).attr("x"));

    //var yy = y(allPubs[BCI_ID].Year);
    var yy = parseInt(jQuery('#pub' + BCI_ID).attr("y"));
    var width = parseInt(jQuery('#mouseTarget' + BCI_ID).attr("width")) - 2;


    var svg = d3.select("svg");

    // draw a small line to indicate which pub we're over now
    svg.append("rect")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("class", "highlightedPubMarker")
        .attr("width", width)
        .attr("height", 1)
        .attr("x", xx)
        .attr("y", yy)
        .style("fill", "#000000")
        .attr('opacity', .75);

    // make sure the previous Year is gone before you draw this one
    jQuery('.YearIndicator').remove();
    svg.append("text")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("class", "YearIndicator")
        .attr("x", xx + 15)
        .attr("y", height + 35)
        .style("text-anchor", "end")
        //.style("font-weight", "bold")
        .text(allPubs[BCI_ID].Year);

}

//--------------------------------------------//
function mouseOutPub(BCI_ID) {
    //console.log("mouseOver: "+BCI_ID);

    jQuery('.highlightedPubMarker').remove();

    if (!infoBoxOpen) {
        jQuery('.interactionLine').remove();
        jQuery('.interactionMarker').remove();
        jQuery('.interactionParent').remove();
        jQuery('.referenceLine').remove();
        jQuery('.referenceMarker').remove();
        jQuery('.YearIndicator').remove();
    }

}

var infoBoxOpen = false;

//--------------------------------------------//
// when a user  clicks on a pub
function mouseClickPub(BCI_ID) {
    //console.log("mouseClick: "+BCI_ID+"  category46: "+allPubs[BCI_ID].Category46);
    tip.hide();
    // remove previous infoBox if there are any
    jQuery('#infoBox').remove();
    //	jQuery('.highlightedPubMarker').remove();


    // add selected article name to searchBox
    //jQuery("#searchBox").val(allPubs[BCI_ID].Title).focus();
    //jQuery("#searchclear").show();	


    var svg = d3.select("svg");

    // fade out the background by appending a white rect over it
    svg.append("rect")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("id", "whiteMask")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 1)
        .style("fill", "#FFFFFF")
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', .75);
    // .attr("pointer-events", "none"); // set by CSS

    // add a marker over the current pub
    // first get x, y, width parameters from current rect
    var xx = parseInt(jQuery('#pub' + BCI_ID).attr("x")) + 5;
    var yy = parseInt(jQuery('#pub' + BCI_ID).attr("y"));

    // remove the old interaction lines and redraw them over the white mask
    jQuery('.interactionLine').remove();
    jQuery('.interactionMarker').remove();
    jQuery('.referenceLine').remove();
    jQuery('.referenceMarker').remove();


    // draw interaction partner, reference partner, and upward pointing non-Ath citation lines
    if (allPubs[BCI_ID].CitationType == "NotAth") {
        drawNonAthInteractionLines(BCI_ID, xx, yy, allPubs[BCI_ID].NumNotAthCitations);
    }
    drawCitingPubs(BCI_ID, xx, yy);
    drawCitedPubs(BCI_ID, xx, yy);

    // <div> dot over highlighted pub
    var offset = jQuery('#chartWindow').position();

    var highlighedPub = "<div class='interactionParent animated zoomIn " + allPubs[BCI_ID].CitationType + "' ";

    highlighedPub += "style='top:" + (yy + offset.top + margin.top - 10) + "px; left:" + (xx + offset.left + margin.left - 3) + "px; ";
    highlighedPub += "background: " + allPubs[BCI_ID].Color + ";' ";
    highlighedPub += "onclick='closeInfoBox();'>";
    highlighedPub += "</div>";

    //	console.log(highlighedPub);
    jQuery('#chartWindow').append(highlighedPub);

    var infoBox = "<div id='infoBox' class='infoBox animated fadeIn ui-widget-content'>";
    infoBox += "<div class='infoBox-title'>" + allPubs[BCI_ID].Title + "</div>";
    infoBox += "<div class='infoBox-body'>" + allPubs[BCI_ID].Authors + "</div>";
    infoBox += "<div class='infoBox-body'>" + allPubs[BCI_ID].Addresses + "</div>";
    infoBox += "<div class='infoBox-body'  style='margin-bottom:10px;'>" + allPubs[BCI_ID].Journal + " (" + allPubs[BCI_ID].Year + ":" + allPubs[BCI_ID].Volume + ")</div>";
    if (allPubs[BCI_ID].NumNotAthCitations > 0) {
        infoBox += "<div class='infoBox-citations'>Non-Arabidopsis Citations: " + allPubs[BCI_ID].NumNotAthCitations + "</div>";
    }
    infoBox += "<div class='infoBox-citations'>Citations: " + allPubs[BCI_ID].Citations + " " + citationIndicator(allPubs[BCI_ID].Citations) + "</div>";
    infoBox += "<div class='infoBox-categoryMarker " + allPubs[BCI_ID].CitationType + "' style='background:" + allPubs[BCI_ID].Color + "'></div>";
    infoBox += "<div class='infoBox-citations' style='margin-top:5px;'>" + (allConceptCodes[allPubs[BCI_ID].Category46].CategoryName || "Other") + "</div>";
    // infoBox += "<div class='infoBox-citations'>Cited by: "+allPubs[BCI_ID].CitationType+"</div>";
    infoBox += "<br><button class='btn btn-primary pull-left' type='button' onclick='window.open(\"https://scholar.google.ca/scholar?hl=en&q=" + allPubs[BCI_ID].Title + "\")'>Link to Google Scholar</button>";
    infoBox += "<button class='btn btn-primary pull-right' type='button' onclick='closeInfoBox()'>Close</button>";
    infoBox += "</div>";


    jQuery('#chartWindow').append(infoBox);
    jQuery('#infoBox').draggable();
    /*
    	jQuery('#infoBox').css("opacity:0");


    	setTimeout(function() {
    		jQuery('#infoBox').css("opacity:.95");
    	}, 5);

    */



    infoBoxOpen = true;

}


//--------------------------------------------//
function closeInfoBox() {
    // console.log("Closing infoBox("+BCI_ID+")");
    // remove previous whiteMask and infoBox if there are any
    jQuery('#whiteMask').remove();
    jQuery('.referenceMarker').remove();
    jQuery('.interactionMarker').remove();
    jQuery('.interactionParent').remove();
    jQuery('.highlightedPubMarker').remove();
    jQuery('#infoBox').remove();
    jQuery('.interactionLine').remove();
    jQuery('.referenceLine').remove();
    jQuery('.nonAthInteractionLine').remove();
    jQuery('.numNonArabidopsisCitations').remove();
    jQuery('.YearIndicator').remove();
    //jQuery("#searchBox").val('').focus();
    //jQuery("#searchclear").hide();		

    infoBoxOpen = false;
    if (searchMode) {
        searchForMatches();
    }

}

//--------------------------------------------//
// Escape key listener... press Escape key to closeInfoBox()
jQuery(document).keyup(function(e) {

    if (e.keyCode == 27) {
        closeInfoBox();
    } // escape key maps to keycode `27`
});



//--------------------------------------------//
function closeResultsBox() {
    // console.log("Closing infoBox("+BCI_ID+")");
    // remove previous whiteMask and infoBox if there are any
    jQuery('#whiteMask').remove();
    jQuery('.resultsBox').remove();
    jQuery('.highlightedPubMarker').remove();
    jQuery('.interactionLine').remove();
    jQuery('.interactionMarker').remove();
    jQuery('.interactionParent').remove();
    jQuery('.referenceLine').remove();
    jQuery('.referenceMarker').remove();
    jQuery('.nonAthInteractionLine').remove();
    jQuery('.numNonArabidopsisCitations').remove();
    jQuery('.YearIndicator').remove();
    //jQuery("#searchBox").val('').focus();
    //jQuery("#searchclear").hide();		

    searchMode = false;
}

//--------------------------------------------//
// determine size of object
function dotSize(v) {
    var scale = d3.scale.log().domain([1, 4000]).range([2, (width / 40)]);

    // don't return anything smaller than 2
    if (scale(v) > 2) {
        return scale(v);
    } else {
        return 2;
    }

}


//--------------------------------------------//
// Draw non ath interaction lines pointing off screen
function drawNonAthInteractionLines(BCI_ID, x, y, num) {
    var svg = d3.select("svg");
    var gap = 4; // 5px between each line at the end

    // x,y are the coordinates of the parent node (i.e., the beginning of the line)
    x += 7; // nudge the start position slightly right so it's in the middle of a column

    // iterate through each of the lines in num
    for (var i = 0; i < num; i++) {
        // ix is the x position of the end of the line
        var ix = x - (gap * num / 2) + (i * gap);
        var iy = 20
            /// curved interaction lines
            // curved interaction lines from: http://bl.ocks.org/mbostock/4063550
        var midX = ((4 * x) + ix) / 5;
        var midY = 100;


        //The data for our line
        //var lineData = [ { "x": x, "y": y},  { "x": midX,  "y": midY}, { "x": ix,  "y": iy} ];
        var lineData = [{
            "x": x,
            "y": y
        }, {
            "x": midX,
            "y": midY
        }, {
            "x": ix,
            "y": iy
        }];

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function(d) {
                return d.x;
            })
            .y(function(d) {
                return d.y;
            });


        // define marker from: https://gist.github.com/satomacoto/3384995
        svg.append("svg:defs").selectAll("marker")
            .data(["arrow"])
            .enter().append("svg:marker")
            .attr("id", String)
            .attr("viewBox", "0 0 20 20")
            .attr("refX", 0)
            .attr("refY", 10)
            .attr("markerWidth", 8)
            .attr("markerHeight", 6)
            .attr("fill", "#99CC00")
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M 0 0 L 20 10 L 0 20 z");

        svg.append("path")
            .attr("d", line(lineData))
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("class", "nonAthInteractionLine")
            .attr("fill", "none")
            .attr("stroke-width", 1)
            .attr("stroke", "#99CC00")
            .attr('opacity', 0.8)
            .attr("marker-end", "url(#arrow)")
            .attr("pointer-events", "none");

    }

    svg.append("text")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("class", "numNonArabidopsisCitations")
        .attr("x", x)
        .attr("y", 10)
        .attr("fill", "#666666")
        .style("text-anchor", "middle")
        .style("font-weight", "normal")
        .style("font-size", ".8em")
        .text(allPubs[BCI_ID].NumNotAthCitations + " Non-Ath citations");



}


//--------------------------------------------//
// Draw Citations
function drawCitingPubs(BCI_ID, x, y) {
    x += 15;
    if (BCI_ID in allLinks) {
        //var numInteractors = allLinks[BCI_ID].length;

        var svg = d3.select("svg");
        var interactors = [];
        interactors = allLinks[BCI_ID];

        // Add tooltips
        svg.call(tip);

        var offset = jQuery('#chartWindow').position();

        for (var i = 0; i < interactors.length; i++) {
            var ix = parseInt(jQuery('#mouseTarget' + interactors[i]).attr("x")) + (parseInt(jQuery('#mouseTarget' + interactors[i]).attr("width")) / 2);
            var iy = parseInt(jQuery('#mouseTarget' + interactors[i]).attr("y"));

            /// curved interaction lines
            // curved interaction lines from: http://bl.ocks.org/mbostock/4063550
            var midX = ((3 * x) + ix) / 4;
            var midY = (y + (3 * iy)) / 4;

            //The data for our line
            //var lineData = [ { "x": x, "y": y},  { "x": midX,  "y": midY}, { "x": ix,  "y": iy} ];
            var lineData = [{
                "x": x,
                "y": y
            }, {
                "x": midX,
                "y": midY
            }, {
                "x": ix,
                "y": iy
            }];

            var line = d3.svg.line()
                .interpolate("basis")
                .x(function(d) {
                    return d.x;
                })
                .y(function(d) {
                    return d.y;
                });

            svg.append("path")
                .attr("d", line(lineData))
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("class", "interactionLine animated fadeIn")
                .attr("fill", "none")
                .attr("stroke-width", 1)
                .attr("stroke", "#000000")
                .attr('opacity', 0.9)
                .attr("pointer-events", "none");

            // draw interaction partner dot as a <div>
            var interactionMarker = "<div id='interactionMarker" + interactors[i] + "' ";
            interactionMarker += "class='animated zoomIn interactionMarker " + allPubs[interactors[i]].CitationType + "' ";
            interactionMarker += "style='top:" + (iy + offset.top + margin.top - 10) + "px; left:" + (ix + offset.left + margin.left - 12) + "px; ";
            interactionMarker += "background: " + allPubs[interactors[i]].Color + ";' ";
            interactionMarker += "onmouseover=\"tip.show( allPubs['" + interactors[i] + "'], mouseTarget" + interactors[i] + ")\" ";
            interactionMarker += "onmouseout=\"tip.hide( allPubs['" + interactors[i] + "'], mouseTarget" + interactors[i] + ")\" ";
            interactionMarker += "onclick=\"closeInfoBox();mouseClickPub('" + interactors[i] + "')\">";
            interactionMarker += "</div>";

            //console.log("Citing Pub: "+interactionMarker);
            jQuery('#chartWindow').append(interactionMarker);


        }
    }
}

//--------------------------------------------//
function drawCitedPubs(BCI_ID, x, y) {

    if (BCI_ID in allBackLinks) {
        //var numInteractors = allBackLinks[BCI_ID].length;

        var svg = d3.select("svg");
        var interactors = [];
        interactors = allBackLinks[BCI_ID];

        // Add tooltips
        svg.call(tip);

        var offset = jQuery('#chartWindow').position();

        for (var i = 0; i < interactors.length; i++) {
            var ix = parseInt(jQuery('#mouseTarget' + interactors[i]).attr("x")) + (parseInt(jQuery('#mouseTarget' + interactors[i]).attr("width")) / 2);
            var iy = parseInt(jQuery('#mouseTarget' + interactors[i]).attr("y"));

            /// curved interaction lines
            // curved interaction lines from: http://bl.ocks.org/mbostock/4063550
            var midX = ((3 * x) + ix) / 4;
            var midY = (y + (3 * iy)) / 4;

            //The data for our line
            var lineData = [{
                "x": x,
                "y": y
            }, {
                "x": midX,
                "y": midY
            }, {
                "x": ix,
                "y": iy
            }];

            var line = d3.svg.line()
                .interpolate("basis")
                .x(function(d) {
                    return d.x;
                })
                .y(function(d) {
                    return d.y;
                });

            svg.append("path")
                .attr("d", line(lineData))
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("class", "referenceLine animated fadeIn")
                .attr("fill", "none")
                .attr("stroke-width", 1)
                .attr("stroke", "#000000")
                .attr("stroke-dasharray", "3,2")
                .attr('opacity', .7)
                .attr("pointer-events", "none");

            // draw interaction partner dot as a <div>
            var interactionMarker = "<div class='animated zoomIn referenceMarker " + allPubs[interactors[i]].CitationType + "' ";
            interactionMarker += "style='top:" + (iy + offset.top + margin.top - 10) + "px; left:" + (ix + offset.left + margin.left - 12) + "px; ";
            interactionMarker += "background: " + allPubs[interactors[i]].Color + ";' ";
            interactionMarker += "onmouseover=\"tip.show( allPubs['" + interactors[i] + "'], pub" + interactors[i] + ")\" ";
            interactionMarker += "onmouseout=\"tip.hide( allPubs['" + interactors[i] + "'], pub" + interactors[i] + ")\" ";
            interactionMarker += "onclick=\"closeInfoBox();mouseClickPub('" + interactors[i] + "')\">";
            interactionMarker += "</div>";

            //console.log(interactionMarker);
            //console.log("Cited Pub: "+interactionMarker);

            jQuery('#chartWindow').append(interactionMarker);

        }
    }
}

//--------------------------------------------//
function drawCategory46Legend() {
    // use the multicolored column symbols
    var legendColumnSymbols = '<p style="display:inline-block;"><img src="http://bar.utoronto.ca/webservices/araport/50Years/sampleColumn.png" style="float:left; margin-right:10px;">Columns indicate all the Arabidopsis papers published in a year. </p><p style="display:inline-block;"><img src="http://bar.utoronto.ca/webservices/araport/50Years/sampleColumnHighlighted.png" style="float:left; margin-right:10px;">Each horizontal bar represents a different paper. The width of the bar indicates the log2 of the number of times it has been cited. </p>';
    jQuery('#legendColumnSymbols').html(legendColumnSymbols);

    // add all the dots
    //jQuery("#legendMainContents").html("").addClass("fourColumns");

    var legendRow = ""; //"<div class='legendRow' onclick='onlyShowCategory(\"ShowAll\")'><div id='legendShowAll' class='legendSymbol legendSymbolSelected' style='background:#DDDDDD'></div><div class='legendName' style='font-weight: bold;'>SHOW ALL CATEGORIES</div></div><br>";

    for (i in allConceptCodes) {
        legendRow += "<div class='legendRow' onclick='onlyShowCategory(\"" + allConceptCodes[i].ConceptCode + "\")'><div id='legend" + allConceptCodes[i].ConceptCode + "' class='legendSymbol' style='background:" + allConceptCodes[i].Color + "'></div><div class='legendNameSmall'>" + allConceptCodes[i].Category + "</div></div><br><br>";
    }

    jQuery('#legendMainContents').append(legendRow);

    console.log("legend added");
}



//--------------------------------------------//
function drawCitationTypeLegend() {
    // use the blue, green, grey column symbols


    var legendColumnSymbols = '<p style="display:inline-block;"><img src="http://bar.utoronto.ca/webservices/araport/50Years/sampleColumnCitationType.png" style="float:left; margin-right:10px;">Columns indicate all the Arabidopsis papers published in a year. </p><p style="display:inline-block;"><img src="http://bar.utoronto.ca/webservices/araport/50Years/sampleColumnCitationTypeHighlighted.png" style="float:left; margin-right:10px;">Each horizontal bar represents a different paper. The width of the bar indicates the log2 of the number of times it has been cited. </p>';
    jQuery('#legendColumnSymbols').html(legendColumnSymbols);


    jQuery("#legendMainContents").html("").removeClass("fourColumns");

    //var legend = "<div class='legendRow' onclick='onlyShowCategory(\"ShowAll\")'><div id='legendShowAll' class='legendSymbol legendSymbolSelected' style='background:#DDDDDD'></div><div class='legendName' style='font-weight: bold;'>SHOW ALL CATEGORIES</div></div><br>";
    var legend = "<div class='legendRow' onclick='onlyShowCategory('NotAth')'><div id='legendAth' class='legendSymbol NotAth' style='background: #99CC00'></div><div class='legendName'>Cited by non-Arabidopsis papers</div></div><br>";
    legend += "<div class='legendRow' onclick='onlyShowCategory('Ath')'><div id='legendAth' class='legendSymbol' style='background: #1973FF'></div><div class='legendName'>Arabidopsis citations only</div></div><br>";
    legend += "<div class='legendRow' onclick='onlyShowCategory('None')'><div id='legendAth' class='legendSymbol' style='background: #BBBBBB; border:none;'></div><div class='legendName'>Papers with no citations</div></div><br>";

    jQuery('#legendMainContents').append(legend);

}


(function(window, $, d3, undefined) {
    /* Generate Agave API docs */
	
	
	// Load jQuery-UI
	function loadFiles() {
		var allScripts, i, uiCore, uiWidget, uiAccordion, uiCss, re, el, d3, d3tip;

		// Load the dependances: The new way. Thanks for AIP staff for this
		allScripts = document.querySelectorAll( 'script' );
		re = /^(.*)(\/jquery_ui_1[^\/]*)\/(.*)jquery-ui\.js??(.*)?$/;
		for ( i = 0; i < allScripts.length && ! uiCore; i++ ) {
			if ( re.test( allScripts[i].src ) ) {
				var match = re.exec( allScripts[i].src );
				uiCore = match[1] + match[2] + '/ui/core.js';
				uiWidget = match[1] + match[2] + '/ui/widget.js';
				uiAccordion = match[1] + match[2] + '/ui/accordion.js';
				uiCss = match[1] + match[2] + '/themes/smoothness/jquery-ui.min.css';
			}
		}
		
		// Add core.js
		if ( uiCore ) {
			el = document.createElement( 'script' );
			el.src = uiCore;
			el.type = 'text/javascript';
			document.body.appendChild( el );
		}

		// Add widget.js
		if ( uiWidget ) {
			el = document.createElement( 'script' );
			el.src = uiWidget;
			el.type = 'text/javascript';
			document.body.appendChild( el );
		}

		// Add Accordion.js
		if ( uiAccordion ) {
			el = document.createElement( 'script' );
			el.src = uiAccordion;
			el.type = 'text/javascript';
			document.body.appendChild( el );
		}

		// Add CSS
		if ( uiCss ) {
			el = document.createElement( 'link' );
			el.href = uiCss;
			el.rel = 'stylesheet';
			document.body.appendChild( el );
		}

		// Add d3 
		re = /^(.*)(\/d3_3[^\/]*)\/(.*)d3\.js??(.*)?$/;
		for ( i = 0; i < allScripts.length && ! uiCore; i++ ) {
			if ( re.test( allScripts[i].src ) ) {
				var match = re.exec( allScripts[i].src );
				d3 = match[1] + match[2] + 'd3.js';
			}
		}
		
		// Add d3.js
		if ( d3 ) {
			el = document.createElement( 'script' );
			el.src = d3;
			el.type = 'text/javascript';
			document.body.appendChild( el );
		}

		
		// Add d3-tip
		re = /^(.*)(\/d3-tip[^\/]*)\/(.*)index\.js??(.*)?$/;
		for ( i = 0; i < allScripts.length && ! uiCore; i++ ) {
			if ( re.test( allScripts[i].src ) ) {
				var match = re.exec( allScripts[i].src );
				d3tip = match[1] + match[2] + '/index.js';
			}
		}
		
		// Add d3-tip.js
		if ( d3tip) {
			el = document.createElement( 'script' );
			el.src = d3tip;
			el.type = 'text/javascript';
			document.body.appendChild( el );
		}


	}
	loadFiles();


    window.addEventListener('Agave::ready', function() {

        // initialize the draggability legend popup and results box
        $("#legendPopup").draggable();



        // close autocomplete when user presses enter
        document.getElementById('searchBox').onkeypress = function(e) {
            var event = e || window.event;
            var charCode = event.which || event.keyCode;

            if (charCode == '13') {
                // Enter pressed
                searchForMatches();
                $(".ui-menu-item").hide();

                return false;
            }
        }


        //--------------------------------------------//
        // Program Flow
        $(function() {
            loadConceptCodes();
            loadInteractions();
            makeChart(displayMode);
        });



        //--------------------------------------------//
        /// Bootstrap dropdown update upon selection
        // from: https://github.com/twbs/bootstrap/issues/2847
        $(document).on('click', '.dropdown ul a', function() {
            var text = $(this).text();
            $(this).closest('.dropdown').children('a.dropdown-toggle').text(text);
        });




        //////////////////////////////////////////////////////////////

        //--------------------------------------------//
        // Autocomplete function using jquery
        // http://stackoverflow.com/questions/15267912/filter-jquery-autocomplete-by-multiple-values-of-an-array-of-objects
        // and http://stackoverflow.com/questions/7292462/how-to-format-jqueryui-autocomplete-response

        $('#searchBox').autocomplete({
            source: function(request, response) {
                var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");

                var matching = $.grep(autocompleteArray, function(value) {
                    //var name = value.value;
                    var title = value.Title;
                    var authors = value.Authors;
                    return matcher.test(title) || matcher.test(authors);

                    //                return matcher.test(name) || matcher.test(title) || matcher.test(authors) ;
                });
                //response(matching);
                response(matching.slice(0, 500));
                //console.log("Autocomplete: "+matching);
            },
            //     source: autocompleteArray,
            delay: 300,
            minLength: 3,
            //maxItemsToShow: 30,

            select: function(event, ui) {
                event.preventDefault();
                $("#searchBox").val(ui.item.label);
                var searchItem = ui.item.value;
                mouseClickPub(searchItem);

                //console.log("You selected: "+ui.item.value);
            },
            focus: function(event, ui) {
                event.preventDefault();
                //$("#searchBox").val(ui.item.label);
            }

        }).data("ui-autocomplete")._renderItem = function(ul, item) {
            return $("<li>")
                .data("ui-autocomplete-item", item)
                .append("<a><div class='ui-autocomplete-citations'>" + item.Citations + "<span class='tinyText'>&nbsp;citations</span></div><span class='ui-autocomplete-title'>" + item.Title + "&nbsp;(" + item.Year + ")</span><br><span class='ui-autocomplete-authors'>" + item.Authors + "</span></a>")
                .appendTo(ul);
        };

        // sort array by key values from: http://stackoverflow.com/questions/16648076/sort-array-on-key-value
        /*/ sort on key values
        function keysrt(key,desc) {
          return function(a,b){
           return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
          }
        }
        */


        //--------------------------------------------//
        // Clear text box button
        // from: http://stackoverflow.com/questions/20062218/how-do-i-clear-a-search-box-with-an-x-in-bootstrap-3
        // from: http://www.bootply.com/130682
        //http://www.bootply.com/121508
        $(document).ready(function() {
            $("#searchBox").keyup(function() {
                $("#searchclear").toggle(Boolean($(this).val()));
            });
            $("#searchclear").toggle(Boolean($("#searchinput").val()));
            $("#searchclear").click(function() {
                $("#searchBox").val('').focus();
                $(this).hide();
            });
        });

        //--------------------------------------------//
        // prevent search button from refreshing the page
        document.getElementById("searchButton").addEventListener("click", function(event) {
            event.preventDefault()
        });


        //--------------------------------------------//
        // search function
        function searchForMatches() {
            // clean slate
            $('#resultsBox').remove();

            // get value from searchbox
            var searchTerm = $('#searchBox').val().toLowerCase();
            var results = [];

            console.log("Searching for " + searchTerm);


            // search through allPubs and push matches into an array called results
            for (var i = 0; i < autocompleteArray.length; i++) {
                if (autocompleteArray[i].Title.toLowerCase().indexOf(searchTerm) > -1 || autocompleteArray[i].Authors.toLowerCase().indexOf(searchTerm) > -1) {
                    results.push("" + autocompleteArray[i].BCI_ID);
                }
            }
            searchMode = true;


            if (results.length > 500) {
                alert(results.length + " matches found. This tool can only display 500 search items at once. Try narrowing your search a bit more.")
            } else {

                // now display all matches

                // remove previous whiteMask and infoBox if there are any
                $('#whiteMask').remove();
                $('#infoBox').remove();

                // remove the old interaction lines and redraw them over the white mask
                $('.interactionParent').remove();
                $('.interactionLine').remove();
                $('.interactionMarker').remove();
                $('.referenceLine').remove();
                $('.referenceMarker').remove();

                $('.highlightedPubMarker').remove();

                // add selected article name to searchBox
                //$("#searchBox").val(allPubs[BCI_ID].Title).focus();
                //$("#searchclear").show();	


                var svg = d3.select("svg");

                // fade out the background by appending a white rect over it
                svg.append("rect")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                    .attr("id", "whiteMask")
                    .attr("width", width + 20)
                    .attr("height", height)
                    .attr("x", 0)
                    .attr("y", 0)
                    .style("fill", "#FFFFFF")
                    //  .attr('opacity', 0)
                    // .transition()
                    // .duration(500)
                    .attr('opacity', .75);
                // .attr("pointer-events", "none"); // set by CSS

                for (var i = 0; i < results.length; i++) {

                    // add a marker over the current pub
                    // first get x, y, width parameters from current rect
                    //	var xx = parseInt($('#pub'+BCI_ID).attr("x"))+5; 

                    var xx = parseInt($('#pub' + results[i]).attr("x")) + 5;
                    //var yy = y(allPubs[BCI_ID].Year);
                    var yy = parseInt($('#pub' + results[i]).attr("y"));

                    // <div> dot over highlighted pub
                    var offset = $('#chartWindow').position();

                    // draw interaction partner dot as a <div>
                    var interactionMarker = "<div id='interactionMarker" + results[i] + "' ";
                    interactionMarker += "class='interactionMarker " + allPubs[results[i]].CitationType + "' ";
                    interactionMarker += "style='top:" + (yy + offset.top + margin.top - 10) + "px; left:" + (xx + offset.left + margin.left - 3) + "px; ";
                    interactionMarker += "background: " + allPubs[results[i]].Color + ";' ";
                    interactionMarker += "onmouseover=\"tip.show( allPubs['" + results[i] + "'], mouseTarget" + results[i] + ")\" ";
                    //			interactionMarker += "onmouseover=\"tip.show( allPubs['"+results[i]+"'], mouseTarget"+results[i]+"); drawCitingPubs("+results[i]+", "+(x-15)+", "+y+");\" ";
                    interactionMarker += "onmouseout=\"tip.hide( allPubs['" + results[i] + "'], mouseTarget" + results[i] + ")\" ";
                    interactionMarker += "onclick=\"closeInfoBox(); mouseClickPub('" + results[i] + "')\">";
                    interactionMarker += "</div>";

                    // console.log(interactionMarker);
                    $('#chartWindow').append(interactionMarker);

                }

                infoBoxOpen = true;

                // count how many citations there are in total
                var totalCitations = 0;
                var nonAthCitations = 0;
                for (var i = 0; i < results.length; i++) {
                    totalCitations += parseInt(allPubs[results[i]].Citations);
                    if (allPubs[results[i]].NumNotAthCitations != "") {
                        nonAthCitations += parseInt(allPubs[results[i]].NumNotAthCitations);
                    }
                };


                var resultsBox = "<div id='resultsBox' class='resultsBox  animated fadeIn ui-widget-content'>";
                resultsBox += "<div class='infoBox-title' style='margin-bottom:10px;'>Seaching for: \"" + searchTerm + "\"</div>";
                resultsBox += "<div class='infoBox-body' style='margin-bottom: 10px;'>" + results.length + " publications found.</div>";
                resultsBox += "<div class='infoBox-body'>Total Non-Ath citations: " + nonAthCitations + "</div>";
                resultsBox += "<div class='infoBox-body'>Total citations: " + totalCitations + " " + citationIndicator(totalCitations) + "</div>";
                resultsBox += "<div class='infoBox-body' style='margin-top: 10px;'>Click on a publication to see its citation network.</div>";
                resultsBox += "<button class='btn btn-primary pull-right' type='button' onclick='closeResultsBox()'>Close</button>";

                resultsBox += "</div>";

                $('#chartWindow').append(resultsBox);
                $('#resultsBox').draggable();
                $('#resultsBox').css("opacity:0");


                setTimeout(function() {
                    $('#resultsBox').css("opacity:.95");
                }, 5);

            }



        }
        //--------------------------------------------//
        function onlyShowCategory(category) {
            console.log("Only show category " + category);
            /*	
            	// adjust radio buttons
            	$('.legendSymbolSelected').removeClass("legendSymbolSelected");
            	$('#legend'+category).addClass("legendSymbolSelected");

            	// show or hide pubs
            	$('.pub').attr("display","none");
            	$('.category'+category).attr("display","initial");

            	if (category == "ShowAll") {
            		$('.pub').attr("display","initial");
            	}
            */

        }


    });
})(window, jQuery, d3);
