/**
 * Namespace: D3_Hydrograph
 *
 * D3_Hydrograph is a JavaScript library to provide a set of functions to build
 *  groundwater measurement hydrology in svg format from different sources: USGS,
 *  OWRD, CDWR.
 *
 * version 1.25
 * February 20, 2025
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
var svg_height  = '600';
var viewBox     = `0 0 ${svg_width} ${svg_height}`;

var y_min, y_max, y_interval, y_range;
var y_box_min   = 50;
var y_box_max   = svg_height - 300;
var y_axis      = y_box_max - y_box_min;

var x_min, x_max, x_interval, x_range;
var x_box_min   = 70;
var x_box_max   = svg_width - 300;
var x_axis      = x_box_max - x_box_min;

var x_legend    = x_box_max + 100
var y_legend    = y_box_min
var legend_box  = 20
var y_top       = y_box_min

var y_zoom_min   = y_box_max + 50;
var y_zoom_max   = y_zoom_min + 75;
    
// Water-level status codes [current set]
//
var statusCodes = {
    '1': 'Static',
    '4': 'Groundwater level affected by tide',
    '5': 'Groundwater level affected by surface water',
    '7': 'Groundwater level affected by brackish or saline water',
    '8': 'Foreign substance was present on the surface of the water',
    'C': 'Frozen',
    'F': 'Flowing',
    'D': 'Dry',
    'O': 'Obstructed',
    'P': 'Pumping',
    '2': 'True value is below reported value due to local conditions',
    '3': 'True value is above reported value due to local conditions',
    '6': 'Measurement unable to be obtained due to local conditions',
    '9': 'Value was revised after publication as an approved value'
}
let statusCodeL = Object.values(statusCodes);

let gapDays = 365;

// Set color and symbol for water-level status codes
//
const colorScale = d3.scaleOrdinal()
      .domain(statusCodeL)
      .range(d3.schemeCategory10);
const symbolScale = d3.scaleOrdinal()
      .domain(statusCodeL)
      .range(d3.symbols.map(s => d3.symbol().type(s)()));

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
    if(siteData.site_code) { siteTitle.push(`CDWR ${siteData.site_code}`); }
    if(siteData.station_nm) { siteTitle.push(`${siteData.station_nm}`); }

    // SVG canvas
    //
    jQuery("#gwHydrograph").append('<svg id="svgCanvas"></svg>')
    
    var svg = d3.select("#svgCanvas")
        .attr("title", `Hydrograph for ${siteTitle.join(' -- ')}`)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr('width', svg_width)
        .attr('height', svg_height)
        .attr('viewBox', viewBox)
        .attr('fill', 'white')

    // Draw zoom plot box 
    //
    axisBox(
        svg,
        'zoomPlot',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        "none"
    );

    // Draw brush plot box
    //
    axisBox(
        svg,
        'overviewPlot',
        x_box_min,
        x_box_max,
        y_zoom_min,
        y_zoom_max,
        "none"
    );

    let wellDepth = null;
    if(siteData.well_depth_va) { wellDepth = siteData.well_depth_va; }
    if(siteData.hole_depth_va) { wellDepth = siteData.hole_depth_va; }
    if(wellDepth) { siteTitle.push(`Well depth ${wellDepth}`); }

    // Add site information
    //
    var myRect = svg.append("g")
        .append("text")
        .attr('id', 'SiteCaption')
        .attr('x', 0.0)
        .attr('y', y_box_min * 0.5)
        .style("text-anchor", "start")
        .style("font-family", "sans-serif")
        .style("font-weight", "700")
        .style("fill", 'black')
        .text(`Site ${siteTitle.join(' -- ')}`)

    // Identify Gap in record (over 1 yr) and Dry conditions
    //
    let dryRecords = myGwRecords.filter(line => line.lev_status_cd == 'Dry');
    myLogger.info('dryRecords');
    myLogger.info(dryRecords);
    let firstTime = null;

    gapDate  = null;
    gapDates = [];

    for(let i = 0; i < myGwRecords.length; i++) {
        let myRecord = myGwRecords[i];

        // Dry conditions
        //
        if(myRecord.lev_status_cd == 'Dry') { myRecord.lev_va = wellDepth; }

        // Check for gaps in record over 1 yr
        //
        let myDate = new Date(myRecord.date);
        if(gapDate) {
            // Calculate the time difference in milliseconds
            //
            const timeDifferenceMS   = myDate - gapDate;
            const timeDifferenceDays = Math.floor(timeDifferenceMS / 86400000);
            if(timeDifferenceDays > gapDays) {
                myLogger.info(`Gap needed before ${myRecord.lev_dt} ${myRecord.lev_tm} ${timeDifferenceDays}`);
                gapRecord = JSON.parse(JSON.stringify(myRecord));
                gapRecord.date = new Date(myDate - timeDifferenceMS * 0.5);
                gapRecord.lev_va = null;
                gapRecord.lev_src_cd = 'Gap Record';
                gapRecord.toolTip     = `Waterlevel: Gap on ${gapRecord.date}`;
                gapDates.push(gapRecord);
                //let myDate = new Date(Date.UTC(myYear, myMonth - 1, myDay, myHour, myMinute));
            }
        }
        gapDate = myDate;
    }
    myLogger.info('gapDates');
    myLogger.info(gapDates);

    // Insert point to produce gap
    //
    for (let i = gapDates.length - 1; i >= 0; i--) {
        let myRecord = gapDates[i];
        let indexNum = myRecord.id;
        myGwRecords.splice(indexNum, 0, myRecord);
    }    

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
        'zoomPlot',
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
    if(siteData.lsd_elevation) { land_surface = siteData.lsd_elevation; }
    if(siteData.elevation_datum) { verticalDatum = siteData.elevation_datum; }
    myLogger.info(`Site information land surface ${land_surface} vertical datum ${verticalDatum}`);

    let elevation_max = land_surface;
    let elevation_min = elevation_max - y_max;

    yAxis(
        svg,
        'zoomPlot',
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
      'zoomPlot',
      x_box_min,
      x_box_max,
      y_box_min,
      y_box_max,
      firstDate,
      lastDate,
      'bottom',
      null
    );
    
    timeAxis(
      svg,
      'overviewPlot',
      x_box_min,
      x_box_max,
      y_zoom_min,
      y_zoom_max,
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

        const svgClone = d3.select('svg')
              .clone(true)
              .attr('id', 'svgClone')

        // Modify the clone as needed for printing
        // ...
        myLogger.info('svgClone');
        myLogger.info(svgClone);
        var myUsgs = USGS_logo(svgClone, 'US Geological Survey', svg_width, svg_height, 30)
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
    let myStatusCodes = [...new Set(data.map(item => item.lev_status_cd))];
    
    hydrographLegend(svgContainer,
                     myStatusCodes,
                     'Explanation'
                    )
   
    // Create the x scale
    //
    let width  = Math.abs(x_box_max - x_box_min);
    let xScale = d3.scaleTime().domain([x_min, x_max]).nice().range([0, width])

    // Create the y scale
    //
    let height = Math.abs(y_box_max - y_box_min);
    let yScale = d3.scaleLinear().domain([y_min, y_max]).rangeRound([0, height]);
    
    // Add hydrograph
    //
    let hydrograph = d3.select(`#zoomPlot`)
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
        .attr("clip-path", "url(#clip)")
 
    // Gaps for waterlevel is null [Dry, Obstructed]
    //
    let line = d3.line()
        .defined((d) => d.lev_va !== null) // Skip null data points
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.lev_va))

    // Draw the line
    //
    hydrograph.append("path")
        .datum(data)
        .attr("class", 'zoomLine')
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("d", line);

    // Draw the points only valid waterlevel measurement
    //
    let dataPoints = data.filter(d => d.lev_va !== null)

    hydrograph.selectAll(".zoomPts")
        .data(dataPoints)
        .enter()
        .append("path")
        .attr("class", 'zoomPts')
        .attr("id", function(d) { return `myCircles${d.lev_status_cd.replace(/[\s.]/g, '')}` })
        .attr("transform", d => `translate(${xScale(d.date)}, ${yScale(d.lev_va)})`)
        .attr("d", d => symbolScale(d.lev_status_cd))
        .attr("fill", d => colorScale(d.lev_status_cd))
        .on("mousemove", function(event, d) {
            tooltip
                .style("left", event.pageX + "px")
                .style("top", event.pageY + "px")
                .style("display", "inline-block")
                .html(d.tooltip);
        })
        .on("mouseout", function(d){ tooltip.style("display", "none");});
    
    // Add overview hydrograph
    //
    let overgraph = d3.select("#overviewPlot")
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_zoom_min})`)
    
    // Create the y scale
    //
    let overHeight    = Math.abs(y_zoom_max - y_zoom_min);
    let overviewScale = d3.scaleLinear().domain([y_min, y_max]).rangeRound([0, overHeight]);

    // Gaps for waterlevel is null [Dry, Obstructed]
    //
    let overline = d3.line()
        .defined((d) => d.lev_va !== null) // Skip null data points
        .x((d) => xScale(d.date))
        .y((d) => overviewScale(d.lev_va))

    // Draw the line
    //
    overgraph.append("path")
        .datum(data)
        .attr("class", 'overLine')
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("d", overline);

    // Draw the points
    //
    overgraph.selectAll(".overPts")
        .data(dataPoints)
        .enter()
        .append("path")
        .attr("class", 'overPts')
        .attr("id", function(d) { return `myCircles${d.lev_status_cd.replace(/[\s.]/g, '')}` })
        .attr("transform", d => `translate(${xScale(d.date)}, ${overviewScale(d.lev_va)})`)
        .attr("d", d => symbolScale(d.lev_status_cd))
        .attr("fill", d => colorScale(d.lev_status_cd))
    
    // Add brushing
    //
    overgraph.call(d3.brushX()
                   .extent( [ [0,0], [width,overHeight] ] )
                   .on("end", ({selection}) => {
                       myLogger.info(`Brushed `);
                       //myLogger.info(selection);
                       let selectedSet = [];

                       // Color selected set
                       //
                       if (selection) {
                           hydrograph.selectAll(".pts")
                               .attr("d", d => symbolScale(d.lev_status_cd))
                               .attr("fill", d => colorScale(d.lev_status_cd))

                           let [x0, x1] = selection;
                           let deltaX   = Math.abs(x0 - x1);
                           myLogger.info(`Selection ${x0}  ${x1} delta ${deltaX}`);
                           selectedSet = d3.selectAll(".zoomPts")
                               .filter(d => xScale(d.date) >= x0 && xScale(d.date) <= x1)
                               .attr("fill", "red")
                               .data();
                           myLogger.info(`selectedSet`);
                           myLogger.info(selectedSet);

                           xScale.domain([ xScale.invert(x0), xScale.invert(x1) ])
                           d3.select("#zoomPlot").selectAll(".bottomAxis").transition().duration(1000).call(d3.axisBottom(xScale).tickSizeOuter(0))

                           // Draw the line
                           //
                           hydrograph.selectAll(".zoomLine")
                               .transition()
                               .duration(1000)
                               .attr("d", line);

                           hydrograph.selectAll(".zoomPts")
                               .transition()
                               .duration(1000)
                               .attr("transform", d => `translate(${xScale(d.date)}, ${yScale(d.lev_va)})`)
                               .attr("d", d => symbolScale(d.lev_status_cd))
                               .attr("fill", d => colorScale(d.lev_status_cd))
                       }

                       // Null set
                       //
                       else {

                           xScale.domain([x_min, x_max]).nice().range([0, width])
                           d3.select("#zoomPlot").selectAll(".bottomAxis").transition().duration(1000).call(d3.axisBottom(xScale).tickSizeOuter(0))
                           
                           hydrograph.selectAll(".zoomPts")
                               .attr("d", d => symbolScale(d.lev_status_cd))
                               .attr("fill", d => colorScale(d.lev_status_cd))
                       }
                   })
                  );

    // Add a clipPath: everything out of this area won't be drawn.
    //
    var clip = svgContainer.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width )
        .attr("height", height )
        .attr("x", 0)
        .attr("y", 0);
    
    // Null brushing
    //
    overgraph.on("dblclick", function() {
        myLogger.info('overgraph dblclick');
        Reset()
    });

    // Reset hydrograph
    //
    function Reset() {

        let selDomain = xScale.domain();

        // Zoom if domain has changed
        //
        if(selDomain.toString() !== [x_min, x_max].toString()) {

            myLogger.info('Reset hydrograph');
            xScale.domain([x_min, x_max]).nice().range([0, width])
            d3.select("#zoomPlot").selectAll(".bottomAxis").transition().duration(1000).call(d3.axisBottom(xScale).tickSizeOuter(0))

            // Draw the line
            //
            hydrograph.selectAll(".zoomLine")
                .transition()
                .duration(1000)
                .attr("d", line);

            hydrograph.selectAll(".zoomPts")
                .transition()
                .duration(1000)
                .attr("transform", d => `translate(${xScale(d.date)}, ${yScale(d.lev_va)})`)
                .attr("d", d => symbolScale(d.lev_status_cd))
                .attr("fill", d => colorScale(d.lev_status_cd))
        }
    }
}

function hydrographLegend(svgContainer,
                          myLegend,
                          myTitle) {

    myLogger.info("hydrographLegend");
    myLogger.info(myLegend);

    // Highlight the specific status code that is hovered
    //
    const highlight = function(id) {

        d3.selectAll(".zoomPts")
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

        d3.selectAll(".zoomPts")
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
        let id          = `myCircles${description.replace(/[\s.]/g, '')}`

        myLogger.info(  `Legend ${description}`);

        let myCircle = descriptions.append("path")
            .attr('id', 'legendEntries')
            .attr('class', id)
            .attr("transform", d => `translate(${x_legend}, ${y_top + legend_box * 0.5})`)
            .attr('fill', colorScale(description))
            //.attr("d", d3.symbol().size(100).type(d => symbolScale(description)))
            .attr("d", symbolScale(description))
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

function addWaterlevelsSave(
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
    let myStatusCodes = [...new Set(data.map(item => item.lev_status_cd))];
    
    hydrographLegend(svgContainer,
                     myStatusCodes,
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

    // Gaps for waterlevel is null [Dry, Obstructed]
    //
    let line = d3.line()
        .defined((d) => d.lev_va !== null) // Skip null data points
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.lev_va))

    let dataPoints = data.filter(d => d.lev_va !== null)

    // Draw the line
    //
    hydrograph.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("d", line);

    // Draw the points
    //
    hydrograph.selectAll(".points")
        .data(dataPoints)
        .enter()
        .append("path")
        .attr("class", 'points')
        .attr("id", function(d) { return `myCircles${d.lev_status_cd}` })
        .attr("d", d => symbolScale(d.lev_status_cd))
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
