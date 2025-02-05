/**
 * Namespace: Main
 *
 * Main is a JavaScript library to provide a set of functions to manage
 *  the web requests.
 *
 * version 1.05
 * February 2, 2025
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

// Prevent jumping to top of page when clicking a href
//
jQuery('.noJump a').click(function(event){
   event.preventDefault();
});

// Global objects
//
let mySiteRecords;
let mySiteLegend;
let myGwRecords;
let myGwLegend;

let myData      = null;   
let nwis_text   = null;
let nwis_column = null;
let data_input = null;

// loglevel
//
let myLogger = log.getLogger('myLogger');
//myLogger.setLevel('debug');
myLogger.setLevel('info');

// Prepare when the DOM is ready 
//
$(document).ready(function() {

    // Reset selected option
    //-------------------------------------------------
    $("#nwis_text").val('');
    $("#nwis_column").val('choose');
    $("#data_input").val('choose');
        
    jQuery("div#nwisQuery").show();
    jQuery("div#nwisResults").hide();

    // Submit request
    //
    jQuery('button#submitRequest').click(function(event) {
        myLogger.info('Clicked submit')
        
        submitRequest();
    });

    // Clear results
    //
    jQuery('button#clearResults').click(function(event) {
        myLogger.info('Clicked clearResults')
        
        clearResults();
    });

    // Clear form
    //
    jQuery('button#clearForm').click(function(event) {
        myLogger.info('Clicked clearForm')
        
        clearForm();
    });

    // Current url
    //-------------------------------------------------
    let url = new URL(window.location.href);
    myLogger.info(`Current Url ${window.location.href}`);
    myLogger.info(`Current Params ${url.searchParams}`);
    myLogger.info(`Current Params ${url.searchParams.has("nwis_text")}`);
    myLogger.info(`Current Params ${url.searchParams.has("nwis_column")}`);
    myLogger.info(`Current Params ${url.searchParams.has("data_input")}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(url.searchParams.has("nwis_text") &&
       url.searchParams.has("nwis_column") &&
       url.searchParams.has("data_input")) {

        // Set selected option
        //-------------------------------------------------
        $("#nwis_text").val(url.searchParams.get("nwis_text"));
        nwis_text = $('#nwis_text').val().trim();
        $("#nwis_column").val(url.searchParams.get("nwis_column"));
        nwis_column = $('#nwis_column').val();
        $("#data_input").val(url.searchParams.get("data_input"));
        data_input = $('#data_input').val();            

        // Loading message
        //
        message = `Submitting request for site ${nwis_text}`;
        openModal(message);
        fadeModal(2000);

        myLogger.info(`Submitting url ${url}`);
        myLogger.info(`Setting nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);

        // Submit request
        //
        submitRequest();
        //if(checkRequest(url.toString())) {
        //    nwisRequest(nwis_text, nwis_column, data_input)
        //}
    }
    
    // Url contains nwis_text and nwis_column
    //-------------------------------------------------
    else if(url.searchParams.has("nwis_text") ||
       url.searchParams.has("nwis_column") ||
       url.searchParams.has("data_input")) {

        // Loading message
        //
        message = `Loading form from URL for a request`;
        openModal(message);
        fadeModal(2000);

        myLogger.info(`Submitting url ${url}`);

        // Set selected option
        //-------------------------------------------------
        if(url.searchParams.has("nwis_text")) {
            $("#nwis_text").val(url.searchParams.get("nwis_text"));
            nwis_text = $('#nwis_text').val().trim();            
        }
        if(url.searchParams.has("nwis_column")) {
            $("#nwis_column").val(url.searchParams.get("nwis_column"));
            nwis_column = $('#nwis_column').val();            
        }
        if(url.searchParams.has("data_input")) {
            $("#data_input").val(url.searchParams.get("data_input"));
            data_input = $('#data_input').val();            
        }
        myLogger.info(`Setting nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);
    }

    // Show form
    //
    else {
        // Loading message
        //
        message = "Preparing form for a request";
        openModal(message);
        fadeModal(2000);
    }
});

// ==================================================
// Functions
// ==================================================

// Submit request
//
function submitRequest() {
    myLogger.info("submitRequest");

    // Clear results for request
    //
    if(jQuery("div#nwisResults").length) {
        jQuery("div#nwisResults").hide();
        $("div#nwisResults").html('');
    }

    // Pull results from form
    //
    nwis_text   = $('#nwis_text').val().trim();
    nwis_column = $('#nwis_column').val();
    data_input = $('#data_input').val();
    myLogger.info(`Processing NWIS nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);

    // Refresh URL with form results
    //
    let url = new URL(window.location.href);
    url.searchParams.set("nwis_text", nwis_text);
    url.searchParams.set("nwis_column", nwis_column);
    url.searchParams.set("data_input", data_input);
    myLogger.info(`Submitting url ${url} -> nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);

    window.history.pushState(null, '', url.toString());
    myLogger.info("Modified Url " + window.location.href);

    // Submit request if parameters are valid
    //
    if(checkRequest(url.toString())) {
        nwisRequest(nwis_text, nwis_column, data_input)
    }
    myLogger.info(`Submitted url ${url} -> nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);
}

// Reset Url and form
//
function clearResults() {

    jQuery("div#nwisQuery").show();
    jQuery("div#nwisResults").hide();
    $("div#nwisResults").html('');
    jQuery("div#gwHydrograph").hide();
    $("div#nwisgwHydrograph").html('');
    jQuery("button#printSVG").hide();
}

// Reset Url and form
//
function clearForm() {
    $("#nwis_text").val('');
    $("#nwis_column").val('choose');
    $("#data_input").val('choose');

    jQuery("div#nwisQuery").show();
    jQuery("div#nwisResults").hide();
    $("div#nwisResults").html('');
    jQuery("div#gwHydrograph").hide();
    $("div#nwisgwHydrograph").html('');
    jQuery("button#printSVG").hide();

    let url = new URL(window.location.href);
    myLogger.info("Current Url " + url);
    url.searchParams.delete('nwis_text');
    myLogger.info("Current Url " + url);
    url.searchParams.delete('nwis_column');
    myLogger.info("Current Url " + url);
    url.searchParams.delete('data_input');
    myLogger.info("Current Url " + url);
    window.history.pushState(null, '', url.toString());
}

// Check arguments
//
function checkRequest() {
    myLogger.info(`checkRequest`);
    //closeModal();

    let url = new URL(window.location.href);
    myLogger.info(`Current Url ${url}`);

    // Parse
    //-------------------------------------------------
    if(url.searchParams.has("nwis_text")) {
        nwis_text = url.searchParams.get("nwis_text");
        myLogger.info(`Parse nwis_text ${nwis_text}`);

        nwis_text = checkSiteId(nwis_text);
        myLogger.info(`Check nwis_text ${nwis_text}`);

        if(!nwis_text) {
            myLogger.error(`Error ${messageSiteId}`);
            closeModal();
            openModal(messageSiteId);
            fadeModal(6000);

            return false;
        }
    }
    else {
        myLogger.error(`Error ${messageSiteId}`);
        openModal(messageSiteId);
        fadeModal(6000);

        return false;
    }
       
    if(url.searchParams.has("nwis_column")) {
        nwis_column = url.searchParams.get("nwis_column");
        myLogger.info(`Parse nwis_column ${nwis_column}`);

        const nwisCols = ["site_no", "coop_site_no", "station_nm", "otid"];
        
        if(!nwisCols.includes(nwis_column.toLowerCase())) {
            message = 'Choose one: site number, cooperator site number, station name, or other id';
            openModal(message);
            fadeModal(6000);

            return false;
        }
    }
        
    if(url.searchParams.has("data_input")) {
        data_input = url.searchParams.get("data_input");
        myLogger.info(`Parse data_input ${data_input}`);

        const nwisOuts = ["usgs", "owrd", "cdwr"];

        if(!nwisOuts.includes(data_input.toLowerCase())) {
            message = 'Choose one: NWIS file options ';
            openModal(message);
            fadeModal(6000);

            return false;
        }
    }

    myLogger.info(`Processing NWIS nwis_text ${nwis_text} nwis_column ${nwis_column} data_input ${data_input}`);

    // Check arguments need nwis_column and data_input
    //
    if(nwis_text && (!nwis_column || !data_input)) {

        message = "Enter search field and NWIS files(s)";
        openModal(message);
        fadeModal(2000);

        return false;         
     }

    // Check arguments need nwis_text and data_input
    //
    if(nwis_column && (!nwis_text || !data_input)) {

        message = "Enter NWIS Identifier and NWIS files(s)";
        openModal(message);
        fadeModal(2000);

        return false;         
     }

    // Check arguments need nwis_text and nwis_column
    //
    if(data_input && (!nwis_text || !nwis_column)) {

        message = "Enter NWIS Identifier and search field";
        openModal(message);
        fadeModal(2000);

        return false;         
    }

    return true;
}

// Retrieve information
//
function nwisRequest(nwis_text, nwis_column, data_input) {
    myLogger.info("nwisRequest");

    // Build ajax requests
    //
    let webRequests  = [];

    // Request for site information
    //
    let request_type = "GET";
    let script_http  = `https://waterservices.usgs.gov/nwis/site/?format=rdb&sites=${nwis_text}&siteOutput=expanded&siteStatus=all`
    let data_http    = '';
    let dataType     = "text";
    myLogger.info(`Site service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed USGS Site information";
            openModal(message);
            fadeModal(2000);
            [mySiteRecords, mySiteLegend] = parseSiteRDB(myData);
        },
        error: function (error) {
            message = `Failed to load USGS Site information ${error}`;
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

    // Request for groundwater information
    //
    //https://nwis.waterdata.usgs.gov/nwis/gwlevels?search_site_no=423623121174001&search_parameter_cd=72019&format=rdb&date_format=YYYY-MM-DD&list_of_search_criteria=search_site_no,search_parameter_cd
    //
    request_type = "GET";
    script_http  = `https://nwis.waterdata.usgs.gov/nwis/gwlevels?search_site_no=${nwis_text}&search_site_no_match_type=exact&group_key=NONE&sitefile_output_format=html_table&column_name=agency_cd&column_name=site_no&column_name=station_nm&format=rdb&date_format=YYYY-MM-DD&rdb_compression=value&list_of_search_criteria=search_site_no`
    data_http    = '';
    dataType     = "text";
    myLogger.info(`Groundwater service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed USGS Groundwater Measurement information";
            openModal(message);
            fadeModal(2000);
            [myGwRecords, myGwLegend] = parseGwRDB(myData);
        },
        error: function (error) {
            message = `Failed to load USGS Groundwater Measurement information ${error}`;
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

   // Run ajax requests
   //
    $.when.apply($, webRequests).then(function() {

        fadeModal(2000);
        myLogger.info('NWIS output')
        myLogger.info(mySiteRecords)
        myLogger.info(mySiteLegend)
        myLogger.info(myGwRecords)
        myLogger.info(myGwLegend)

        buildTablesPanel(mySiteRecords, myGwRecords);

        buildHydrographPanel(mySiteRecords, myGwRecords);
    });

}

function buildTablesPanel (mySiteRecords, myGwRecords) {

    myFiles = {
        'Site' : mySiteRecords,
        'Groundwater' : myGwRecords
    }
    myLogger.info(myFiles)

    if(myFiles) {
        //jQuery("div#nwisQuery").hide();
        jQuery("div.nwisResults").show();

        let filesL = Object.keys(myFiles);
        myLogger.info(filesL);

        for(let i = 0; i < filesL.length; i++) {
            let myTable = filesL[i];
            myLogger.info(`Table ${myTable}`)
            let myRecords = myFiles[filesL[i]];
            myLogger.info('myRecords')
            myLogger.info(myRecords)

            jQuery("div#nwisResults").append(`<div id="${myTable}Caption" class="fs-4 fw-bold text-center border-bottom border-2 border-black mt-3 ps-1 py-1">NWIS Table: ${myTable} -- ${myRecords.length} records</div>`);

            // Build table with records
            //
            if(myRecords.length > 0) {

                jQuery("div#nwisResults").append(`<div id="${myTable}Table" class="table-responsive fs-6 fw-bold text-center ps-1 py-1"></div>`);
                jQuery(`div#${myTable}Table`).html(`<table id="${myTable}" class="table table-sm table-bordered table-hover table-striped-columns align-middle overflow-scroll"></table>`);

                let columnL = myRecords.columns;
                let columns = []
                for(let i = 0; i < columnL.length; i++) {
                    columns.push( {data: columnL[i], title: columnL[i] } );
                }
                myLogger.info('columns')
                myLogger.info(columns)
                let tblReport = new DataTable(`table#${myTable}`, {
                    order: [[1, 'asc']],
                    layout: {
                        topStart: {
                            buttons: [ 'csv',
                                       {
                                           extend: 'print',
                                           messageTop: `U.S. Geological Survey Information for NWIS Table: ${myTable}`,
                                           autoPrint: false,
                                           customize: function (doc) {
                                               $(doc.document.body).find('h1').css('font-size', '11pt');
                                               $(doc.document.body).find('h1').css('text-align', 'center');
                                               $(doc.document.body).find('h1').css('font-weight:', 'bold');
                                               $(doc.document.body).find('div').css('font-size', '10pt');
                                               $(doc.document.body).find('div').css('text-align', 'center');
                                               $(doc.document.body).find('div').css('font-weight:', 'bold');
                                               $(doc.document.body).find('thead').css('font-size', '9pt');
                                               $(doc.document.body).find('tbody').css('font-size', '8pt');
                                           }
                                       },
                                       {
                                           extend: 'excel',
                                           sheetName: `Table ${myTable}`,
                                           title: '',
                                           messageTop: `U.S. Geological Survey Information for NWIS Table: ${myTable}`,
                                           customize: function ( xlsx ) {
                                               let sheet = xlsx.xl.worksheets['sheet1.xml'];
                                               $('row:first c', sheet).attr( 's', '17' );
                                           }
                                       },
                                       'pdf']
                        }
                    },
                    data : myRecords,
                    columns : columns
                })
                //tblReport.caption(`NWIS Table: ${myTable}`, 'top');
                //caption: `<caption id="${myTable}Caption" class="caption-top fs-4 fw-bold text-center mt-3 ps-1 py-1">NWIS Table: ${myTable}</caption>`,

                jQuery(`table#${myTable}`).addClass('text-black border border-black border-2 rounded');
                jQuery(`table#${myTable} thead tr`).addClass('bg-success');
                jQuery(`.sitefile`).click(function(event) {
                    let site_no = this.id.replace('site_', '');
                    myLogger.info(`Clicked site ${site_no}`)
                    let url = new URL(window.location.href);
                    url.searchParams.set("nwis_text", site_no);
                    url.searchParams.set("nwis_column", 'site_no');
                    url.searchParams.set("data_input", 'all');

                    window.open(url, '_blank')
                });
                myLogger.info(`Site rows ${jQuery('.sitefile').length}`);
            }

            // No records message
            //
            else {
                jQuery("div#nwisResults").append(`<div id="${myTable}Table" class="fs-5 fw-bold text-danger text-center ps-1 py-1">No Records</div>`);
            }
        }

        jQuery("div#nwisResults").show();

    }
}

function buildHydrographPanel (mySiteRecords, myGwRecords) {
    
    myLogger.info("buildHydrographPanel");
    myLogger.info('mySiteRecords');
    myLogger.info(mySiteRecords);
    myLogger.info('myGwRecords');
    myLogger.info(myGwRecords);

    plotHydrograph(mySiteRecords, myGwRecords)
}
