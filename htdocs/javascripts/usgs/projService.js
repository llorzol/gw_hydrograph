/**
* Namespace: projService
*
* projService is a JavaScript library to parse the JSON output from project output.
*
* version 1.02
* February 20, 2025
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
function projRequest(siteIdentifier, columnIdentifier, sourceIdentifier) {
    myLogger.info("owrdRequest");

    // Build ajax requests
    //
    let webRequests  = [];

    // Request for site information
    //
    let request_type = "GET";
    let script_http  = `http://127.0.0.1/cgi-bin/discrete_gw/requestGwRecords.py?column=${columnIdentifier}&site=${siteIdentifier}&project=${sourceIdentifier}`
    let data_http    = '';
    let dataType     = "json";
    myLogger.info(`Project Site service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed Project Site information";
            openModal(message);
            fadeModal(2000);
            [mySiteRecords, myGwRecords] = parseSitePROJ(myData);
        },
        error: function (error) {
            message = `Failed to load Project Site information ${error.statusText}`;
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
        myLogger.info('Project output')
        myLogger.info(mySiteRecords)
        myLogger.info(myGwRecords)

        buildTablesPanel(mySiteRecords, myGwRecords);

        buildHydrographPanel(mySiteRecords, myGwRecords);
    });

}
                          
function parseSitePROJ (myJson) {
    myLogger.info('parseSitePROJ');
    myLogger.info(myJson);

    let message = 'Retrieving Project site information';
    openModal(message);

    let mySiteRecords = [];
    let myGwRecords   = [];

    // Parse for site information
    //
    if(myJson.siteinfo.length > 0) {
        let myRecords = myJson.siteinfo;
        let myKeys    = null;
        for(let i=0; i < myRecords.length; i++) {

            let myRecord = myRecords[i];
            if(!myKeys) { myKeys = Object.keys(myRecord); }

            mySiteRecords.push(myRecord)
        }

        // Set column names
        //
        mySiteRecords.columns = myKeys
    }

    // Parse for waterlevel information
    //
    if(myJson.waterlevels.length > 0) {

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

        // Parse for gw measurement information
        //
        let myRecords = myJson.waterlevels;
        let lev_acy_cds = myJson.codes.lev_acy_cd;
        let lev_status_cds = myJson.codes.lev_status_cds;
        let lev_dt_acy_cds = myJson.codes.lev_dt_acy_cds;
        let lev_meth_cds = myJson.codes.lev_meth_cds;
        let lev_src_cds = myJson.codes.lev_src_cds;
        myKeys      = null;
        for(let i=0; i < myRecords.length; i++) {

            let myRecord = myRecords[i];

            if(myRecord.lev_dt_acy_cd) {
                myRecord.lev_dt_acy_cd = lev_dt_acy_cds[myRecord.lev_dt_acy_cd]
            }
            if(myRecord.lev_status_cd) {
                myRecord.lev_status_cd = lev_status_cds[myRecord.lev_status_cd]
            }
            if(myRecord.lev_meth_cd) {
                myRecord.lev_meth_cd = lev_meth_cds[myRecord.lev_meth_cd]
            }
            if(myRecord.lev_src_cd) {
                myRecord.lev_src_cd = lev_src_cds[myRecord.lev_src_cd]
            }

            let lev_dt      = myRecord.lev_dt;
            let lev_tm      = myRecord.lev_tm;
            let lev_dt_acy  = myRecord.lev_dt_acy_cd;
            let lev_tz      = myRecord.lev_tz_cd;

            // Parse date and build full UTC date
            //
            let [myYear, myMonth, myDay] = lev_dt.split(/-/);
            let myHour, myMinute;
            if(lev_tm) { [myHour, myMinute] = lev_tm.split(/:/); }
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
                datePST         = new Intl.DateTimeFormat("en-US", yOptions).format(myDate);
            }
            else {
                datePST         = new Intl.DateTimeFormat("en-US", yOptions).format(myDate);
            }
            let lev_dtm = new Intl.DateTimeFormat("en-US",dateOptions).format(myDate);

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

            if(!myKeys) { myKeys = Object.keys(myRecord); }
            myGwRecords.push(myRecord)            
        }

        // Set column names
        //
        myGwRecords.columns = myKeys
        
    }
    
    // Return information
    //
    return [mySiteRecords, myGwRecords];
  }

function parseGwOWRD(myJson) {
    myLogger.info('parseGwOWRD');
    myLogger.info(myJson);

    let myData;

    // Parse for site information
    //
    let feature_count = myJson.feature_count;
    if(feature_count > 0) {
        myData = [];
        let myGwRecords = myJson.feature_list.reverse();
        let myKeys      = null
        for(let i = 0; i < myGwRecords.length; i++) {

            let myRecord = myGwRecords[i];
            if(!myKeys) { myKeys = Object.keys(myRecord); }
            
            myRecord.lev_va = myRecord.waterlevel_ft_below_land_surface;
            myRecord.lev_status_cd = myRecord.measurement_status_desc;
            
            
            // Parse date and build full UTC date
            //
            let myDate     = new Date(myRecord.measured_datetime)
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
            myLogger.info(`Date ${myRecord.measured_datetime} ${lev_dt_acy}   ${lev_va}   ${lev_status}`);

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
    
    return myData;
  }
