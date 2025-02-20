/**
 * Namespace: Main
 *
 * Main is a JavaScript library to provide a set of functions to manage
 *  the web requests.
 *
 * version 1.11
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

let myData           = null;   
let siteIdentifier   = null;
let columnIdentifier = null;
let sourceIdentifier = null;

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
    $("#siteIdentifier").val('');
    $("#columnIdentifier").val('choose');
    $("#sourceIdentifier").val('choose');
        
    jQuery("div#dataQuery").show();
    jQuery("div#gwHydrograph").hide();
    jQuery("div#dataResults").hide();

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
    myLogger.info(`Current Params ${url.searchParams.has("siteIdentifier")}`);
    myLogger.info(`Current Params ${url.searchParams.has("columnIdentifier")}`);
    myLogger.info(`Current Params ${url.searchParams.has("sourceIdentifier")}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(url.searchParams.has("siteIdentifier") &&
       url.searchParams.has("columnIdentifier") &&
       url.searchParams.has("sourceIdentifier")) {

        // Set selected option
        //-------------------------------------------------
        $("#siteIdentifier").val(url.searchParams.get("siteIdentifier"));
        siteIdentifier = $('#siteIdentifier').val().trim();
        $("#columnIdentifier").val(url.searchParams.get("columnIdentifier"));
        columnIdentifier = $('#columnIdentifier').val();
        $("#sourceIdentifier").val(url.searchParams.get("sourceIdentifier"));
        sourceIdentifier = $('#sourceIdentifier').val();            

        // Loading message
        //
        message = `Submitting request for site ${siteIdentifier}`;
        openModal(message);
        fadeModal(2000);

        myLogger.info(`Submitting url ${url}`);
        myLogger.info(`Setting siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);

        // Submit request
        //
        submitRequest();
        //if(checkRequest(url.toString())) {
        //    usgsRequest(siteIdentifier, columnIdentifier, sourceIdentifier)
        //}
    }
    
    // Url contains siteIdentifier and columnIdentifier
    //-------------------------------------------------
    else if(url.searchParams.has("siteIdentifier") ||
       url.searchParams.has("columnIdentifier") ||
       url.searchParams.has("sourceIdentifier")) {

        // Loading message
        //
        message = `Loading form from URL for a request`;
        openModal(message);
        fadeModal(2000);

        myLogger.info(`Submitting url ${url}`);

        // Set selected option
        //-------------------------------------------------
        if(url.searchParams.has("siteIdentifier")) {
            $("#siteIdentifier").val(url.searchParams.get("siteIdentifier"));
            siteIdentifier = $('#siteIdentifier').val().trim();            
        }
        if(url.searchParams.has("columnIdentifier")) {
            $("#columnIdentifier").val(url.searchParams.get("columnIdentifier"));
            columnIdentifier = $('#columnIdentifier').val();            
        }
        if(url.searchParams.has("sourceIdentifier")) {
            $("#sourceIdentifier").val(url.searchParams.get("sourceIdentifier"));
            sourceIdentifier = $('#sourceIdentifier').val();            
        }
        myLogger.info(`Setting siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);
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
    if(jQuery("div#dataResults").length) {
        jQuery("div#dataResults").hide();
        $("div#dataResults").html('');
    }
    if(jQuery("div#gwHydrograph").length) {
        jQuery("div#gwHydrograph").hide();
        $("div#gwHydrograph").html('');
    }

    // Pull results from form
    //
    siteIdentifier   = $('#siteIdentifier').val().trim();
    columnIdentifier = $('#columnIdentifier').val();
    sourceIdentifier = $('#sourceIdentifier').val();
    myLogger.info(`Processing Site siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);

    // Refresh URL with form results
    //
    let url = new URL(window.location.href);
    url.searchParams.set("siteIdentifier", siteIdentifier);
    url.searchParams.set("columnIdentifier", columnIdentifier);
    url.searchParams.set("sourceIdentifier", sourceIdentifier);
    myLogger.info(`Submitting url ${url} -> siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);

    window.history.pushState(null, '', url.toString());
    myLogger.info("Modified Url " + window.location.href);

    // Submit request if parameters are valid
    //
    if(checkRequest(url.toString())) {
        if(sourceIdentifier === 'usgs') {
            usgsRequest(siteIdentifier, columnIdentifier, sourceIdentifier)
        }
        else if(sourceIdentifier === 'owrd') {
            owrdRequest(siteIdentifier, columnIdentifier, sourceIdentifier)
        }
        else if(sourceIdentifier === 'cdwr') {
            cdwrRequest(siteIdentifier, columnIdentifier, sourceIdentifier)
        }
        else if(sourceIdentifier === 'klamath_wells') {
            projRequest(siteIdentifier, columnIdentifier, sourceIdentifier)
        }
    }
    myLogger.info(`Submitted url ${url} -> siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);
}

// Reset Url and form
//
function clearResults() {

    jQuery("div#dataQuery").show();
    jQuery("div#dataResults").hide();
    $("div#dataResults").html('');
    jQuery("div#gwHydrograph").hide();
    $("div#gwHydrograph").html('');
    jQuery("button#printSVG").hide();
}

// Reset Url and form
//
function clearForm() {
    $("#siteIdentifier").val('');
    $("#columnIdentifier").val('choose');
    $("#sourceIdentifier").val('choose');

    jQuery("div#dataQuery").show();
    jQuery("div#dataResults").hide();
    $("div#dataResults").html('');
    jQuery("div#gwHydrograph").hide();
    $("div#gwHydrograph").html('');
    jQuery("button#printSVG").hide();

    let url = new URL(window.location.href);
    myLogger.info("Current Url " + url);
    url.searchParams.delete('siteIdentifier');
    myLogger.info("Current Url " + url);
    url.searchParams.delete('columnIdentifier');
    myLogger.info("Current Url " + url);
    url.searchParams.delete('sourceIdentifier');
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
        
    // Parse source input first
    //-------------------------------------------------
    if(url.searchParams.has("sourceIdentifier")) {
        sourceIdentifier = url.searchParams.get("sourceIdentifier").toLowerCase();
        myLogger.info(`Parse sourceIdentifier ${sourceIdentifier}`);

        const inputL = ["usgs", "owrd", "cdwr", "klamath_wells"];

        if(!inputL.includes(sourceIdentifier)) {
            message = `Choose one: Input source options: ${inputL.join(', ')} `;
            openModal(message);
            fadeModal(6000);

            return false;
        }
    }

    let searchCols = ["site_no", "coop_site_no", "site_code", "site_id"];
    if(sourceIdentifier === 'usgs') { searchCols = ["site_no"]; }
    else if(sourceIdentifier === 'owrd') { searchCols = ["coop_site_no"]; }
    else if(sourceIdentifier === 'cdwr') { searchCols = ["site_code"]; }
    else if(sourceIdentifier === 'klamath_wells') { searchCols = ["site_id"]; }
    else {
        message = 'Choose site number for USGS source, cooperator site number for OWRD, site_code for CDWR, site_id for Klamath';
        openModal(message);
        fadeModal(10000);

        return false;
    }
        
    // Determine if search Column matches source
    //-------------------------------------------------
    if(url.searchParams.has("columnIdentifier")) {
        columnIdentifier = url.searchParams.get("columnIdentifier").toLowerCase();
        myLogger.info(`Parse columnIdentifier ${columnIdentifier}`);
        
        if(!searchCols.includes(columnIdentifier)) {
            message = 'Choose one: site number for USGS source, cooperator site number for OWRD, site_code for CDWR, site_id for Klamath';
            openModal(message);
            fadeModal(6000);

            return false;
        }
    }

    // Parse source input first
    //-------------------------------------------------
    if(url.searchParams.has("siteIdentifier")) {
        siteIdentifier = url.searchParams.get("siteIdentifier");
        myLogger.info(`Parse siteIdentifier ${siteIdentifier}`);

        siteIdentifier = checkSiteId(siteIdentifier);
        myLogger.info(`Check siteIdentifier ${siteIdentifier}`);

        if(!siteIdentifier) {
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

    myLogger.info(`Processing Site siteIdentifier ${siteIdentifier} columnIdentifier ${columnIdentifier} sourceIdentifier ${sourceIdentifier}`);

    // Check arguments need columnIdentifier and sourceIdentifier
    //
    if(siteIdentifier && (!columnIdentifier || !sourceIdentifier)) {

        message = "Enter search column and source database";
        openModal(message);
        fadeModal(2000);

        return false;         
     }

    // Check arguments need siteIdentifier and sourceIdentifier
    //
    if(columnIdentifier && (!siteIdentifier || !sourceIdentifier)) {

        message = "Enter site Identifier and source database";
        openModal(message);
        fadeModal(2000);

        return false;         
     }

    // Check arguments need siteIdentifier and columnIdentifier
    //
    if(sourceIdentifier && (!siteIdentifier || !columnIdentifier)) {

        message = "Enter site Identifier and search column";
        openModal(message);
        fadeModal(2000);

        return false;         
    }

    return true;
}

function buildTablesPanel (mySiteRecords, myGwRecords) {

    myFiles = {
        'Site' : mySiteRecords,
        'Groundwater' : myGwRecords
    }
    myLogger.info(myFiles)

    if(myFiles) {
        jQuery("div.dataResults").show();

        let filesL = Object.keys(myFiles);
        myLogger.info(filesL);

        for(let i = 0; i < filesL.length; i++) {
            let myTable = filesL[i];
            myLogger.info(`Table ${myTable}`)
            let myRecords = myFiles[filesL[i]];
            myLogger.info('myRecords')
            myLogger.info(myRecords)

            jQuery("div#dataResults").append(`<div id="${myTable}Caption" class="fs-4 fw-bold text-center border-bottom border-2 border-black mt-3 ps-1 py-1">Database Table: ${myTable} -- ${myRecords.length} records</div>`);

            // Build table with records
            //
            if(myRecords.length > 0) {

                jQuery("div#dataResults").append(`<div id="${myTable}Table" class="table-responsive fs-6 fw-bold text-center ps-1 py-1"></div>`);
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
                                           messageTop: `U.S. Geological Survey Information for DataBase Table: ${myTable}`,
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
                                           messageTop: `U.S. Geological Survey Information for DataBase Table: ${myTable}`,
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
                    url.searchParams.set("siteIdentifier", site_no);
                    url.searchParams.set("columnIdentifier", 'site_no');
                    url.searchParams.set("sourceIdentifier", 'all');

                    window.open(url, '_blank')
                });
                myLogger.info(`Site rows ${jQuery('.sitefile').length}`);
            }

            // No records message
            //
            else {
                jQuery("div#dataResults").append(`<div id="${myTable}Table" class="fs-5 fw-bold text-danger text-center ps-1 py-1">No Records</div>`);
            }
        }

        jQuery("div#dataResults").show();

    }
}

function buildHydrographPanel (mySiteRecords, myGwRecords) {
    
    myLogger.info("buildHydrographPanel");
    myLogger.info('mySiteRecords');
    myLogger.info(mySiteRecords);
    myLogger.info('myGwRecords');
    myLogger.info(myGwRecords);

    jQuery("div#gwHydrograph").show();
    jQuery("div#gwHydrograph").html('');

    plotHydrograph(mySiteRecords, myGwRecords)
}
