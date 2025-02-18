/**
* Namespace: cdwrService
*
* cdwrService is a JavaScript library to parse the RDB output from OWRD output.
*
* version 1.02
* February 17, 2025
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
function cdwrRequest(siteIdentifier, columnIdentifier, sourceIdentifier) {
    myLogger.info("cdwrRequest");

    // Build ajax requests
    //
    let webRequests  = [];

    // Request for site information
    //
    let request_type = "GET";
    let script_http  = `https://data.cnra.ca.gov/api/3/action/datastore_search?resource_id=af157380-fb42-4abf-b72a-6f9f98868077&q={"site_code":"${siteIdentifier}"}`
    let data_http    = '';
    let dataType     = "json";
    myLogger.info(`CDWR Site service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed CDWR Site information";
            openModal(message);
            fadeModal(2000);
            mySiteRecords = parseSiteCDWR(myData);
        },
        error: function (error) {
            message = `Failed to load CDWR Site information ${error.statusText}`;
            myLogger.error(message);
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

    // Request for groundwater information
    //
    // https://data.cnra.ca.gov/api/3/action/datastore_search_sql?sql=SELECT * from "bfa9f262-24a1-45bd-8dc8-138bc8107266" WHERE "site_code" IN (%s) ORDER BY "site_code", "msmt_date"' % nList
    // https://data.cnra.ca.gov/api/3/action/datastore_search?resource_id=bfa9f262-24a1-45bd-8dc8-138bc8107266&q={"site_code":"420171N1214111W001"}&sort="msmt_date"&limit=5000
    //
    request_type = "GET";
    script_http  = `https://data.cnra.ca.gov/api/3/action/datastore_search?resource_id=bfa9f262-24a1-45bd-8dc8-138bc8107266&q={"site_code":"${siteIdentifier}"}&sort="msmt_date"&limit=5000`
    data_http    = '';
    dataType     = "json";
    myLogger.info(`CDWR Groundwater service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed CDWR Groundwater Measurement information";
            openModal(message);
            fadeModal(2000);
            myGwRecords = parseGwCDWR(myData);
        },
        error: function (error) {
            message = `Failed to load CDWR Groundwater Measurement information ${error.statusText}`;
            myLogger.error(message);
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

   // Run ajax requests
   //
    $.when.apply($, webRequests).then(function() {

        fadeModal(2000);
        myLogger.info('CDWR output')
        myLogger.info(mySiteRecords)
        myLogger.info(myGwRecords)

        buildTablesPanel(mySiteRecords, myGwRecords);

        buildHydrographPanel(mySiteRecords, myGwRecords);
    });

}
                          
function parseSiteCDWR (myJson) {
    myLogger.info('parseSiteCDWR');
    myLogger.info(myJson);

    var message = 'Retrieving CDWR site information';
    openModal(message);

    let myData = null;

    // Parse for site information
    //
    let feature_count = myJson.result.total;
    if(feature_count > 0) {
        myData = [];
        let myRecord = myJson.result.records[0];
        myRecord.station_nm = myRecord.swn
        myRecord.hole_depth_va = myRecord.well_depth;
        
        myData.push(myRecord)
        
        let myKeys     = Object.keys(myRecord);
        myData.columns = myKeys
    }
    
    // Return information
    //
    return myData;
  }

function parseGwCDWR(myJson) {
    myLogger.info('parseGwCDWR');
    myLogger.info(myJson);

    var message = 'Retrieving CDWR site information';
    openModal(message);

    let myData = null;

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

    // Parse for site information
    //
    let feature_count = myJson.result.total;
    if(feature_count > 0) {
        myData = [];
        let myGwRecords = myJson.result.records;
        let myKeys      = null
        for(let i = 0; i < myGwRecords.length; i++) {

            let myRecord = myGwRecords[i];
            if(!myKeys) { myKeys = Object.keys(myRecord); }
            
            myRecord.lev_va = myRecord.gse_gwe;
            myRecord.lev_status_cd = myRecord.wlm_qa_desc;
            
            // Parse date and build full UTC date
            //
            let myDate     = new Date(myRecord.msmt_date)
            let lev_tz     = 'PST';
            let lev_dt_acy = 'Date is accurate to the Year'
           
            let myYear     = myDate.getFullYear();
            let myMonth    = myDate.getMonth();
            let myDay      = myDate.getDate();
            let myHour     = myDate.getHours();
            let myMinute   = myDate.getMinutes();
            if(!myMonth) { myMonth = 8; }
            else { lev_dt_acy = 'Date is accurate to the Month'; }
            if(!myDay) { myDay = 15; }
            else { lev_dt_acy = 'Date is accurate to the Day'; }
            if(!myHour) { myHour = 12; }
            else if(myHour === 0) { myHour = 12; }
            else if(myHour === 12) { myHour = 12; }
            else { lev_dt_acy = 'Date is accurate to the Hour'; }
            if(!myMinute) { myMinute = 0; }
            else { lev_dt_acy = 'Date is accurate to the Minute'; }
            
            myLogger.info(`Date ${myRecord.measured_datetime} ${lev_dt_acy}   ${myRecord.lev_va} ===> ${myRecord.lev_status_cd} `);

            //let myDate = new Date(Date.UTC(myYear, myMonth - 1, myDay, myHour, myMinute));

            let dataPST = '';
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
                datePST         = new Intl.DateTimeFormat("en-US", yOptions).format(myDate);
            }
            else {
                datePST         = new Intl.DateTimeFormat("en-US", yOptions).format(myDate);
            }
            let lev_dtm = new Intl.DateTimeFormat("en-US",dateOptions).format(myDate);
            //myLogger.info(`Date ${lev_dt} ${lev_tm} ${lev_dt_acy}   ${lev_dtm} ===> ${datePST} `);

            // Tooltip
            //
            let lev_va      = myRecord.lev_va;
            let lev_status  = myRecord.lev_status_cd;
            if(!lev_status || lev_status.length < 1) { lev_status = 'Static'; myRecord.lev_status_cd = 'Static'; }
            let toolTip     = `Waterlevel: ${lev_va} (${lev_status}) on ${datePST}`
            myLogger.info(`Date ${myRecord.msmt_date} ${lev_dt_acy}   ${lev_va}   ${lev_status}`);

            // Set
            //
            myRecord.id      = i;
            myRecord.date    = myDate;
            myRecord.lev_dtm = lev_dtm;
            myRecord.tooltip = toolTip;

            myData.push(myRecord)
        }
        
        myData.columns = myKeys;
    }
    
    // Return information
    //
    return myData;
}
