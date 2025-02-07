/**
 * Namespace: D3_Hydrology
 *
 * D3_Hydrology is a JavaScript library to provide a set of functions to build
 *  groundwater measurement hydrology in svg format from different sources: USGS,
 *  OWRD, CDWR.
 *
 * version 1.09
 * February 6, 2025
*/

/*
###############################################################################
# Copyright (c) Oregon Water Science Center
# 
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.
###############################################################################
*/

// Set globals
//
var svg;
var jsonData;

//var svg_width   = '60rem';
//var svg_height  = '50rem';

var svg_width   = '900';
var svg_height  = '400';
var viewBox     = `0 0 ${svg_width} ${svg_height}`;

var y_min, y_max, y_interval, y_range;
var y_box_min   = 50;
var y_box_max   = svg_height - 100;
var y_axis      = y_box_max - y_box_min;

var x_min, x_max, x_interval, x_range;
var x_box_min   = 100;
var x_box_max   = svg_width - 200;
var x_axis      = x_box_max - x_box_min;

var x_legend    = x_box_max + 100
var y_legend    = y_box_min
var legend_box  = 20
var y_top       = y_box_min


// Plot hydrograph column
//
function plotHydrograph(
    mySiteRecords,
    myGwRecords) {
    
    myLogger.info("plotHydrograph");
    myLogger.info('mySiteRecords');
    myLogger.info(mySiteRecords);
    myLogger.info('myGwRecords');
    myLogger.info(myGwRecords);

    // Arrange site information
    //
    let siteData = mySiteRecords[0]

    // Fade modal dialog
    //
    fadeModal(1000);

    // Add tooltip
    //
    var tooltip = addToolTip();

    // Prepare site title
    //
    let siteTitle = [];
    if(siteData.site_no) { siteTitle.push(`USGS ${siteData.site_no}`); }
    if(siteData.coop_site_no) { siteTitle.push(`OWRD ${siteData.coop_site_no}`); }
    if(siteData.coop_site_no) { siteTitle.push(`CDWR ${siteData.cdwr_id}`); }
    if(siteData.station_nm) { siteTitle.push(`${siteData.station_nm}`); }

    // SVG canvas
    //
    var svg = d3.select("#svgCanvas")
        .attr("title", `Hydrograph for ${siteTitle.join(' -- ')}`)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr('width', svg_width)
        .attr('height', svg_height)
        .attr('viewBox', viewBox)
        .attr('fill', 'white')

    // Draw graph
    //
    axisBox(
        svg,
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        "none"
    );

    // Add site information
    //
    var myRect = svg.append("g")
        .append("text")
        .attr('x', 0.0)
        .attr('y', y_box_min * 0.5)
        .style("text-anchor", "start")
        .style("font-family", "sans-serif")
        .style("font-weight", "700")
        .style("fill", 'black')
        .text(`Site ${siteTitle.join(' -- ')}`)

    // Max and min waterlevel values
    //
    let maxValue = d3.max(myGwRecords, d => +d.lev_va); 
    let minValue = d3.min(myGwRecords, d => +d.lev_va); 
    myLogger.info(`Y-axis information max ${maxValue} min ${minValue}`);
    [y_min, y_max, y_interval] = get_max_min(minValue, maxValue);
    if(y_min < 0.0) { y_min = 0.0; }
    myLogger.info(`Y-axis information max ${y_max} min ${y_min} y_interval ${y_interval}`);

    // Left y axis
    //
    yAxis(
        svg,
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        y_min,
        y_max,
        'left',
        "Depth Below Land Surface, in feet"
    );

    // Right y axis (elevation)
    //
    let land_surface  = siteData.alt_va;
    let verticalDatum = siteData.alt_datum_cd;
    myLogger.info(`Site information land surface ${land_surface} vertical datum ${verticalDatum}`);

    let elevation_max = land_surface;
    let elevation_min = elevation_max - y_max;

    yAxis(
      svg,
      x_box_min,
      x_box_max,
      y_box_min,
      y_box_max,
      elevation_max,
      elevation_min,
      'right',
      'Elevation, in feet ' + verticalDatum
    );

    // Bottom x axis (time)
    //
    let firstGw   = myGwRecords[0]
    myLogger.info(firstGw.date);
    myLogger.info(firstGw.date.getFullYear());
    myLogger.info(firstGw.lev_dtm);
    let firstDate = new Date(Date.UTC(firstGw.date.getFullYear() - 1, 0, 1, 0, 0))
    let lastGw    = myGwRecords[myGwRecords.length - 1]
    myLogger.info(lastGw.date);
    myLogger.info(lastGw.date.getFullYear());
    myLogger.info(lastGw.lev_dtm);
    let lastDate = new Date(Date.UTC(lastGw.date.getFullYear() + 1, 0, 1, 0, 0))

    myLogger.info(`X-axis information lastDate ${lastDate} firstDate ${firstDate}`);
    
    timeAxis(
      svg,
      x_box_min,
      x_box_max,
      y_box_min,
      y_box_max,
      firstDate,
      lastDate,
      'bottom',
      'Calendar'
    );

    // Hydrology
    //
    if(myGwRecords) {
        addWaterlevels(
            svg,
            y_min,
            y_max,
            firstDate,
            lastDate,
            x_box_min,
            x_box_max,
            y_box_min,
            y_box_max,
            myGwRecords,
            tooltip
        )
    }
    
    // Print svg to file
    //
    jQuery("div#gwHydrograph").show();
    jQuery("button#printSVG").show();
    
    // Print svg to file
    //
    jQuery(".printSvg").click(function() {
        myLogger.info("printSvg method");
        //const svg = d3.select("#svgCanvas").node();
        //const svg = document.querySelector('svg');
        //const svgClone = svg.cloneNode(true);
        //svgClone.id = 'svgClone';
        //myLogger.info(svgClone);

        const svgClone = d3.select('svg')
              .clone(true)
              .attr('id', 'svgClone')

        // Modify the clone as needed for printing
        // ...
        myLogger.info('svgClone');
        myLogger.info(svgClone);
        var myUsgs = USGS_logo(svgClone, 'US Geological Survey', svg_width, svg_height, 45)
        const svgElement = document.querySelector('#svgClone');
        
        const svgString = new XMLSerializer().serializeToString(svgElement);
        svgElement.remove()

        const printWindow = window.open('', '_blank', '');
        printWindow.document.write(`<html><head><title>${siteTitle}</title></head><body>`);
        printWindow.document.write(svgString);
        printWindow.document.write("</body></html>");
        printWindow.document.close();

        printWindow.print();        //writeDownloadLink(svg, 'test.svg');
    });
}

function addWaterlevels(
    svgContainer,
    y_min,
    y_max,
    x_min,
    x_max,
    x_box_min,
    x_box_max,
    y_box_min,
    y_box_max,
    data,
    tooltip) {

    myLogger.info('addWaterlevels');
    myLogger.info('myGwRecords');
    myLogger.info(data);
    myLogger.info(`X-axis information max ${x_max} min ${x_min}`);
    
    // Legend
    //
    //
    let statusCodes = [...new Set(data.map(item => item.lev_status_cd))];
    myLogger.info('statusCodes')
    myLogger.info(statusCodes)
    
    hydrographLegend(svgContainer,
                     statusCodes,
                     'Explanation'
                    )
    
    // Add symbols
    //
    let hydrograph = svgContainer.append("g")
        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
    
    // Create the x scale
    //
    let width  = Math.abs(x_box_max - x_box_min);
    let xScale = d3.scaleTime()
	.domain([x_min, x_max]).nice()
	.range([0, width])

    // Create the y scale
    //
    let height = Math.abs(y_box_max - y_box_min);
    let yScale = d3.scaleLinear().domain([y_min, y_max]).rangeRound([0, height]);

    // Create the line generator
    //
    let line = d3.line()
          .x(d => xScale(d.date))
          .y(d => yScale(d.lev_va));

    // Draw the line
    //
    hydrograph.append("path")
        .datum(data)
        //.attr("transform", `translate(${x_box_min}, ${y_box_min})`)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("d", line);

    // Create the categorical scales
    //
    //const color = d3.scaleOrdinal(data.map(d => d.lev_status), d3.schemeCategory10);
    //const color = d3.scaleOrdinal().domain(statusCodes).range(d3.schemeCategory10);
    const colorScale = d3.scaleOrdinal()
          .domain(statusCodes)
          .range(d3.schemeCategory10);
    const symbolScale = d3.scaleOrdinal()
          .domain(statusCodes)
          .range([d3.symbolCircle, d3.symbolTriangle])
          //.range(d3.symbols.map(s => d3.symbol().type(s)()));

    //const shape = d3.scaleOrdinal(data.map(d => d.lev_status), d3.symbols.map(s => d3.symbol().type(s)()));

    hydrograph.selectAll(".points")
        .data(data)
        .enter()
        .append("path")
        .attr("class", 'points')
        .attr("id", function(d) { return `myCircles${d.lev_status_cd}` })
        .attr("d", d3.symbol().size(50).type(d => symbolScale(d.lev_status_cd)))
        .attr("transform", d => `translate(${xScale(d.date)}, ${yScale(d.lev_va)})`)
        .style("fill", d => colorScale(d.lev_status_cd))
        .on("mousemove", function(event, d) {
            tooltip
                .style("left", event.pageX + "px")
                .style("top", event.pageY + "px")
                .style("display", "inline-block")
                .html(d.tooltip);
        })
        .on("mouseout", function(d){ tooltip.style("display", "none");});

}

function hydrographLegend(svgContainer,
                          myLegend,
                          myTitle) {

    myLogger.info("hydrographLegend");
    myLogger.info(myLegend);
    
    const colorScale = d3.scaleOrdinal()
          .domain(myLegend)
          .range(d3.schemeCategory10);
    const symbolScale = d3.scaleOrdinal()
          .domain(myLegend)
          .range([d3.symbolCircle, d3.symbolTriangle])
          //.range(d3.symbols.map(s => d3.symbol().type(s)()));

    // Highlight the specific status code that is hovered
    //
    const highlight = function(id) {

        d3.selectAll(".points")
            .transition()
            .duration(200)
            .attr("opacity", 0.1)

        d3.selectAll("#" + id)
            .transition()
            .duration(100)
            .attr("opacity", 1.0)
    }

    // Unhighlight all after hover
    //
    const unhighlight = function() {

        d3.selectAll(".points")
            .transition()
            .duration(100)
            .attr("opacity", 1.0)
    }

    // Set legend
    //
    let descriptions = svgContainer.append("g")
        .attr("id", "hydrograph_descriptions")
        .attr("class", "legend_descriptions")

    // Set legend title
    //
    descriptions.append("circle")
        .attr('id', 'legendEntries')
        .attr('x', x_legend)
        .attr('y', y_top)
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 0);
    descriptions.append("text")
        .attr('x', x_legend)
        .attr('y', y_top + legend_box * 0.75)
        .style("text-anchor", "start")
        .style("alignment-baseline", "center")
        .style("font-family", "sans-serif")
        .style("font-weight", "700")
        .style("fill", 'black')
        .text(myTitle);

    // Loop through legend
    //
    for(let i = 0; i < myLegend.length; i++) {

        y_top += legend_box * 1.5
        
        let description = myLegend[i]
        let id          = `myCircles${description}`

        myLogger.info(  `Legend ${description}`);

        let myCircle = descriptions.append("path")
            .attr('id', 'legendEntries')
            .attr('class', id)
            .attr("transform", d => `translate(${x_legend}, ${y_top + legend_box * 0.5})`)
            .attr('fill', colorScale(description))
            .attr("d", d3.symbol().size(100).type(d => symbolScale(description)))
            .on('mouseover', function(d, i) {
                let id = d3.select(this).attr('class');
                highlight(id);
            })
            .on('mouseout', function(d, i) {
                unhighlight();
            })

        let myText = descriptions.append("text")
            .style("text-anchor", "start")
            .style("alignment-baseline", "center")
            .style("font-family", "sans-serif")
            .style("font-weight", "300")
            .style("fill", 'black')
            .text(description)
            .attr('class', id)
            .attr('x', x_legend + legend_box * 1.25)
            .attr('y', y_top + legend_box * 0.75)
            .on('mouseover', function(d, i) {
                let id = d3.select(this).attr('class');
                highlight(id);
            })
            .on('mouseout', function(d, i) {
                unhighlight();
            })
    }
  }










// Not Needed


function addOwrdLithology(
    svgContainer,
    y_min,
    y_max,
    x_box_min,
    x_box_max,
    y_box_min,
    y_box_max,
    lithologyData,
    LithologyLegend,
    tooltip) {

    myLogger.info('addLithology');
    myLogger.info('lithologyData');
    myLogger.info(lithologyData);
    myLogger.info('LithologyLegend');
    myLogger.info(LithologyLegend);

    // Set
    //
    var y_range     = y_max - y_min;
    var y_axis      = y_box_max - y_box_min;

    // Set defs section of svg
    //
    buildDefs(svgContainer, LithologyLegend);
              
    // Loop through lithology
    //
    for(let i = 0; i < lithologyData.length; i++) {

        var lithRecord  = lithologyData[i];
        myLogger.debug(lithRecord);

        var id          = lithRecord.svg;
        var lithCode    = lithRecord.lithology.replace(/\s+&\s+/g, '');
        var color       = lithRecord.color;
        var description = lithRecord.lithology_description;

       var top_depth   = parseFloat(lithRecord.start_depth);
       if(!top_depth) { top_depth = 0.0; }
        var bot_depth   = parseFloat(lithRecord.end_depth);

        var width       = x_box_max - x_box_min

        var y_top       = y_box_min + y_axis * (top_depth - y_min) / y_range
        var y_bot       = y_box_min + y_axis * (bot_depth - y_min) / y_range
        var thickness   = y_bot - y_top

        // Add color
        //
        if(color && color.length > 0) {
            var lithology   = svgContainer.append("g")
                .attr("class", "lithology")
            var myRect      = lithology.append("rect")
                .attr('x', x_box_min)
                .attr('y', y_top)
                .attr('width', width)
                .attr('height', thickness)
                .attr('fill', color)
        }

        // Add lith pattern
        //
        //var id          = lithologyDefs[lithCode].pattern
        var url         = 'url(#' + id + ')'

        var toolTip     = [description, "from", top_depth, "to", bot_depth, "feet"].join(" ");
        var data        = [ {x:x_box_min, tooltip: toolTip}];

        var lithology   = svgContainer.append("g")
                                      .attr("class", "lithology")
                                      .data(data)

        var myRect      = lithology.append("rect")
                                   .attr('id', lithCode)
                                   .attr('class', 'lithology')
                                   .attr('x', x_box_min)
                                   .attr('y', y_top)
                                   .attr('width', width)
                                   .attr('height', thickness)
                                   .attr('fill', url)
                                   .attr('stroke', 'black')
                                   .attr('stroke-width', 1)
                                   .on("mousemove", function(event, d) {
                                         tooltip
                                           .style("left", event.pageX + "px")
                                           .style("top", event.pageY + "px")
                                           .style("display", "inline-block")
                                           .html(d.tooltip);
                                   })
                                   .on("mouseout", function(d){ tooltip.style("display", "none");});
        //myRect.append("title")
        //      .text(function(d) { return toolTip; });
    }

    // Set svg container
    //
    var defs = d3.select("#definitions")
    if(!defs[0]) {
        var defs = svgContainer.append("defs")
            .attr('id', 'definitions')
    }
    var gradient = defs.append('linearGradient')
        .attr('id', 'svgGradient')
        .attr('x1', '0%')
        .attr('x2', '0%')
        .attr('y1', '0%')
        .attr('y2', '100%')
        .attr('fill', url);

    gradient.append('stop')
        .attr('class', 'start')
        .attr('offset', '0%')
        .attr('stop-color', 'none')
        .attr('stop-opacity', 1)
        .attr('fill', url);

    gradient.append('stop')
        .attr('class', 'end')
        .attr('offset', '100%')
        .attr('stop-color', 'none')
        .attr('stop-opacity', 0)
        .attr('fill', url);
    
    // Add and fade last lithology
    //
    var lithology   = svgContainer.append("g")
        .attr("class", "lithology")
    //var url         = 'url(#svgGradient)'

    var toolTip     = [description, "from", bot_depth, "to unknown depth"].join(" ");
    var data        = [ {x:x_box_min, tooltip: toolTip}];
    var thickness   = y_box_max - y_bot

    var lithology   = svgContainer.append("g")
        .attr("class", "lithology")
        .data(data)

    var myRect      = lithology.append("rect")
        .attr('id', lithCode)
        .attr('class', 'lithology')
        .attr('x', x_box_min)
        .attr('y', y_bot)
        .attr('width', width)
        .attr('height', thickness)
        .attr('fill', url)
        .attr('fill-opacity', 0.25)
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .on("mousemove", function(event, d) {
            tooltip
                .style("left", event.pageX + "px")
                .style("top", event.pageY + "px")
                .style("display", "inline-block")
                .html(d.tooltip);
        })
        .on("mouseout", function(d){ tooltip.style("display", "none");});
    
    // Add unknown ?? text to bottom
    //
    var textInfo    = textSize('?-?-?-?-?-?');
    var text_height = textInfo.height;
    
    var lithology   = svgContainer.append("g")
        .attr("class", "lithology")
    
    var myText = lithology.append("text")
        .attr('x', x_box_min + 0.5 * (x_box_max - x_box_min))
        .attr('y', y_box_max - 0.5 * (y_box_max - y_bot) + 0.5 * text_height)
        .style("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("font-size", "1rem")
        .style("font-weight", "700")
        .style("opacity", 0.6)
        .style("fill", 'black')
        .text('?-?-?-?-?-?')

    // Add lithology legend
    //
    lithologyLegend(svgContainer, LithologyLegend)
  }


function buildLegend(lithologyData, lithologyDefs) {

    myLogger.info("buildLegend");
    myLogger.info(lithologyData);
    myLogger.info(lithologyDefs);

    let lithologyLegend = [];

    // Build lithology description
    //
    for(let i = 0; i < lithologyData.length; i++) {
        lithologyData[i]['svg'] = '000';
        myLithology             = lithologyData[i].lithology;
        myLogger.info(lithologyData[i]);
        myLogger.info(`Lithology ${myLithology}`);

        if(lithologyDefs[myLithology]) {
            lithologyData[i]['svg'] = lithologyDefs[myLithology];

            // Set lithology defintions
            //
            if(lithologyLegend.findIndex(x => x.lithology === myLithology) < 0) {
                lithologyLegend.push({ 'lithology': myLithology, 'symbol': lithologyDefs[myLithology] })
            }
        }
        else {
            message = `No lithology pattern for ${myLithology}`;
            myLogger.error(message);
            updateModal(message);
            fadeModal(2000);
        }
    }

    return lithologyLegend;
  }

function writeDownloadLink(svgContainer, myFile) {
    const xmlns = "http://www.w3.org/2000/xmlns/";
    const xlinkns = "http://www.w3.org/1999/xlink";
    const svgns = "http://www.w3.org/2000/svg";
    return function serialize(svgContainer) {
        svg = svg.cloneNode(true);
        const fragment = window.location.href + "#";
        const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
            for (const attr of walker.currentNode.attributes) {
                if (attr.value.includes(fragment)) {
                    attr.value = attr.value.replace(fragment, "#");
                }
            }
        }
        svg.setAttributeNS(xmlns, "xmlns", svgns);
        svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
        const serializer = new window.XMLSerializer;
        const string = serializer.serializeToString(svg);
        return new Blob([string], {type: "image/svg+xml"});
    };
}

function serialize (svg) {
  const xmlns = "http://www.w3.org/2000/xmlns/";
  const xlinkns = "http://www.w3.org/1999/xlink";
  const svgns = "http://www.w3.org/2000/svg";
  return function serialize(svg) {
    svg = svg.cloneNode(true);
    const fragment = window.location.href + "#";
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      for (const attr of walker.currentNode.attributes) {
        if (attr.value.includes(fragment)) {
          attr.value = attr.value.replace(fragment, "#");
        }
      }
    }
    svg.setAttributeNS(xmlns, "xmlns", svgns);
    svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    const serializer = new window.XMLSerializer;
    const string = serializer.serializeToString(svg);
    return new Blob([string], {type: "image/svg+xml"});
  };
}
function downloadSVGAsText() {
            myLogger.info('downloadSVGAsText');
  const svg = document.querySelector('svg');
  const base64doc = btoa(unescape(encodeURIComponent(svg.outerHTML)));
  const a = document.createElement('a');
  const e = new MouseEvent('click');
  a.download = 'download.svg';
  a.href = 'data:image/svg+xml;base64,' + base64doc;
  a.dispatchEvent(e);
}
function saveSvg() {
            myLogger.info('saveSvg');
  const svg = document.querySelector('svg');
  const base64doc = btoa(unescape(encodeURIComponent(svg.outerHTML)));
  const a = document.createElement('a');
  const e = new MouseEvent('click');
  a.download = 'download.svg';
  a.href = 'data:image/svg+xml;base64,' + base64doc;
  a.dispatchEvent(e);
}
