/**
* Namespace: usgsService
*
* usgsService is a JavaScript library to parse the RDB output from NwisWeb output.
*
* version 1.16
* February 16, 2025
*
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
 
// Retrieve information
//
function usgsRequest(nwis_text, nwis_column, data_input) {
    myLogger.info("usgsRequest");

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
            [mySiteRecords, mySiteLegend] = parseSiteUSGS(myData);
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
            [myGwRecords, myGwLegend] = parseGwUSGS(myData);
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
                          
function parseSiteUSGS (dataRDB) {
    myLogger.info('parseSiteUSGS');
    //myLogger.info(dataRDB);

   var message = 'Retrieving site information';
   openModal(message);
                           
    // Parse in lines
    //
    var fileLines = dataRDB.split(/\r?\n/);
    myLogger.info('fileLines');
    myLogger.info(fileLines);

    // Filter out comment header lines
    //
    let commentLines = fileLines.filter(line => line.startsWith("#") && line.length > 3);
    myLogger.info('commentLines');
    myLogger.info(commentLines.join('\n'));

    // Parse from header explanations
    //
    let myDataDict      = {};

    let myDataInfo    = /^# The following selected fields are included in this output:/;
    let myDataInfoEnd = /^#$/;
    let qualifier     = false;
     
    // Skip header lines
    //
    while(commentLines.length > 0) {
        
        let fileLine  = commentLines.shift().trim();
          
        // Header portion for data dictionary information
        //
        if(myDataInfo.test(fileLine)) { qualifier = true; continue; }

        // Data dictionary portion
        //
        if(qualifier) {
            let Fields        = fileLine.split(/\s+/);
            //console.log(Fields);
            var blank         = Fields.shift();
            var field_name    = Fields.shift();
            //console.log(field_name);
            var blank         = Fields.shift();
            var description   = Fields.join(" ");
            //console.log(description);

            myDataDict[field_name] = description;
        }
    }
    myLogger.info('SITE myDataDict');
    myLogger.info(myDataDict);

    // Filter out comment lines (assuming they start with '#')
    //
    let dataLines = fileLines.filter(line => !line.startsWith("#"));
    myLogger.info('dataLines');
    myLogger.info(dataLines);
 
    // Remove format header line
    //
    let formatLine = dataLines.splice(1, 1);
    myLogger.info('dataLines');
    myLogger.info(dataLines);
      
    // Data lines
    //
    myLogger.info(dataLines);
    myData = d3.tsvParse(dataLines.join('\n'))
    myLogger.info('SITE');
    myLogger.info(myData);
    Fields = myData.columns;
    myLogger.info(Fields);
    
    return [ myData, myDataDict ];
}

function parseGwUSGS(dataRDB) {
    myLogger.info('parseGwUSGS');
    //myLogger.info(dataRDB);

    let myData;

    // Split the data into lines
    //
    let fileLines = dataRDB.split(/\r?\n/);
    myLogger.info('fileLines');
    myLogger.info(fileLines);

    // Filter out comment header lines
    //
    let commentLines = fileLines.filter(line => line.startsWith("#") && line.length > 3);
    myLogger.info('commentLines');
    myLogger.info(commentLines);

    // Parse from header explanations
    //
    let myDataDict      = {};

    let myReferenced    = /^# Referenced /;
    let myAgencyInfo    = /^# Referenced agency codes/;
    let mySiteInfo      = /^# Referenced site type codes/;
    let myReferenceInfo = /^# Referenced vertical datum codes/;
    let myStatusInfo    = /^# Referenced water-level site status codes/;
    let myDateAcyInfo   = /^# Referenced water-level date-time accuracy codes/;
    let myLevAcyInfo    = /^# Referenced water-level accuracy codes/;
    let myLevSrcInfo    = /^# Referenced source of measurement codes/;
    let myMethodInfo    = /^# Referenced method of measurement codes/;
    let myAgingInfo     = /^# Referenced water-level approval-status codes/;
    let myParameterInfo = /^# The following parameters are included/;
    
    let myRe            = /\(\w+\)/;
    
    let qualifier       = null;

    // Parse qualifiers from header lines
    //
    while(commentLines.length > 0) {
        
        let fileLine  = commentLines.shift().trim();

        // Header portion for site status information
        //
        if(myReferenced.test(fileLine) || myParameterInfo.test(fileLine)) {

            // Header portion for measuring agency codes information
            //
            if(myAgencyInfo.test(fileLine)) { qualifier = 'lev_agency_cd'; }

            // Header portion for site type codes information
            //
            if(myAgencyInfo.test(fileLine)) { qualifier = 'site_tp_cd'; }

            // Header portion for referenced vertical datum codes
            //
            if(myReferenceInfo.test(fileLine)) { qualifier = 'sl_datum_cd'; }

            // Header portion for lev_status_cds information
            //
            if(myStatusInfo.test(fileLine)) { qualifier = 'lev_status_cd'; }

            // Header portion for  water-level date-time accuracy
            //
            if(myDateAcyInfo.test(fileLine)) { qualifier = 'lev_dt_acy_cd'; }

            // Header portion for water-level accuracy
            //
            if(myLevAcyInfo.test(fileLine)) { qualifier = 'lev_acy_cd'; }

            // Header portion for source of measurement
            //
            if(myLevSrcInfo.test(fileLine)) { qualifier = 'lev_src_cd'; }

            // Header portion for method codes
            //
            if(myMethodInfo.test(fileLine)) { qualifier = 'lev_meth_cd'; }

            // Header portion for water-level approval-status
            //
            if(myAgingInfo.test(fileLine)) { qualifier = 'lev_age_cd'; }

            // Header portion for parameter codes information
            //
            if(myParameterInfo.test(fileLine)) { qualifier = 'parameter_cd'; }

            // Data dictionary
            //
            myDataDict[qualifier] = {};

            continue;
        }

        // Parse description
        //
        if(qualifier) {
            let Fields = fileLine.split(/\s+/);
            let myCode = Fields[1];
            let myText = Fields.slice(2).join(" ").replace(/^-\s+/,'');
            myDataDict[qualifier][myCode] = myText;
        }
    }
    myLogger.info('GW myDataDict');
    myLogger.info(myDataDict);

    // Filter out comment lines (assuming they start with '#')
    //
    let tempLines = fileLines.filter(line => !line.startsWith("#"));
    myLogger.info('tempLines');
    myLogger.info(tempLines);

    // Set column header line
    //
    let columnLine = tempLines[0];
    myLogger.info('columnLine');
    myLogger.info(columnLine);

    let dataLines = tempLines.filter(line => line.endsWith("72019"));
    myLogger.info('dataLines');
    myLogger.info(dataLines);

    // Add column header line
    //
    dataLines.unshift(columnLine)
    myLogger.info('dataLines');
    myLogger.info(dataLines);
      
    // Data lines
    //
    myLogger.info(dataLines);
    myData = d3.tsvParse(dataLines.join('\n'))
    myLogger.info('GW');
    myLogger.info(myData);
    Fields = myData.columns;
    myLogger.info(Fields);

    // Post-process the measurement dates from UTC to PST
    //
    let ymdhmOptions = { timeZone: 'America/Vancouver',
                         timeZoneName: "short",
                         year: "numeric",
                         month: "short",
                         day: "numeric",
                         hour: '2-digit',
                         minute: '2-digit'
                       };

    let ymdhOptions = { timeZone: 'America/Vancouver',
                        timeZoneName: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: '2-digit'
                      };

    let ymdOptions = { timeZone: 'America/Vancouver',
                       year: "numeric",
                       month: "short",
                       day: "numeric"
                     };

    let ymOptions = { timeZone: 'America/Vancouver',
                      year: "numeric",
                      month: "short"
                    };

    let yOptions = { timeZone: 'America/Vancouver',
                     year: "numeric"
                   };

    let dateOptions = { timeZone: 'UTC',
                        timeZoneName: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: '2-digit',
                        minute: '2-digit'
                      };

    for(let i = 0; i < myData.length; i++) {
        let myRecord = myData[i];
        for (let key in myDataDict) {
            if(myRecord[key] && myDataDict[key][myRecord[key]]) {
                //myLogger.info(`Key ${key} ${myRecord[key]} ${myDataDict[key][myRecord[key]]}`);
                myRecord[key] = myDataDict[key][myRecord[key]]
            }
        }

        let lev_dt      = myRecord.lev_dt;
        let lev_tm      = myRecord.lev_tm;
        let lev_dt_acy  = myRecord.lev_dt_acy_cd;
        let lev_tz      = myRecord.lev_tz_cd;

        // Parse date and build full UTC date
        //
        let [myYear, myMonth, myDay] = lev_dt.split(/-/);
        let [myHour, myMinute] = lev_tm.split(/:/);
        if(!myMonth) { myMonth = 8; }
        if(!myDay) { myDay = 15; }
        if(!myHour) { myHour = 12; }
        if(!myMinute) { myMinute = 0; }
        let myDate = new Date(Date.UTC(myYear, myMonth - 1, myDay, myHour, myMinute));

        if(lev_dt_acy === 'Date is accurate to the Minute') {
            datePST         = new Intl.DateTimeFormat("en-US", ymdhmOptions).format(myDate);
        }
        else if(lev_dt_acy === 'Date is accurate to the Hour') {
            datePST         = new Intl.DateTimeFormat("en-US", ymdhOptions).format(myDate);
        }
        else if(lev_dt_acy === 'Date is accurate to the Day') {
            datePST         = new Intl.DateTimeFormat("en-US", ymdOptions).format(myDate);
        }
        else if(lev_dt_acy === 'Date is accurate to the Month') {
            datePST         = new Intl.DateTimeFormat("en-US", ymOptions).format(myDate);
        }
        else if(lev_dt_acy === 'Date is accurate to the Year') {
            datePST         = yFormat(myRecord.date);
        }
        else {
            datePST         = yFormat(myRecord.date);
        }
        let lev_dtm = new Intl.DateTimeFormat("en-US",dateOptions).format(myDate);
        //myLogger.info(`Date ${lev_dt} ${lev_tm} ${lev_dt_acy}   ${lev_dtm} ===> ${datePST} `);

        // Tooltip
        //
        let lev_va      = myRecord.lev_va;
        let lev_status  = myRecord.lev_status_cd;
        if(!lev_status || lev_status.length < 1) { lev_status = 'Static'; myRecord.lev_status_cd = 'Static'; }
        let toolTip     = `Waterlevel: ${lev_va} (${lev_status}) on ${datePST}`
        myLogger.info(`Date ${lev_dt} ${lev_tm} ${lev_dt_acy}   ${lev_va}   ${lev_status}`);

        // Set
        //
        myRecord.id      = i;
        myRecord.date    = myDate;
        myRecord.lev_dtm = lev_dtm;
        myRecord.tooltip = toolTip;
    }

    let Obstructed = myData.filter(line => line.lev_status_cd == 'Obstructed');
    myLogger.info('myData');
    myLogger.info(myData);
    myLogger.info(Obstructed);
    
    return [ myData, myDataDict ];
  }
