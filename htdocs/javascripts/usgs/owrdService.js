/**
* Namespace: owrdService
*
* owrdService is a JavaScript library to parse the RDB output from OWRD output.
*
* version 1.03
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
function owrdRequest(siteIdentifier, columnIdentifier, sourceIdentifier) {
    myLogger.info("owrdRequest");

    // Build ajax requests
    //
    let webRequests  = [];

    // Request for site information
    //
    let request_type = "GET";
    let script_http  = `https://apps.wrd.state.or.us/apps/gw/gw_data_rws/api/${siteIdentifier}/gw_site_summary/?public_viewable=`
    let data_http    = '';
    let dataType     = "json";
    myLogger.info(`OWRD Site service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed OWRD Site information";
            openModal(message);
            fadeModal(2000);
            mySiteRecords = parseSiteOWRD(myData);
        },
        error: function (error) {
            message = `Failed to load OWRD Site information ${error.statusText}`;
            myLogger.error(message);
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

    // Request for groundwater information
    //
    // https://apps.wrd.state.or.us/apps/gw/gw_data_rws/api/KLAM0000588/gw_measured_water_level/?start_date=1/1/1905&end_date=1/1/2025&public_viewable=
    //
    request_type = "GET";
    script_http  = `https://apps.wrd.state.or.us/apps/gw/gw_data_rws/api/${siteIdentifier}/gw_measured_water_level/?start_date=1/1/1900&end_date=1/1/2030&public_viewable`
    data_http    = '';
    dataType     = "json";
    myLogger.info(`Groundwater service ${script_http}`);

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed OWRD Groundwater Measurement information";
            openModal(message);
            fadeModal(2000);
            myGwRecords = parseGwOWRD(myData);
        },
        error: function (error) {
            message = `Failed to load OWRD Groundwater Measurement information ${error.statusText}`;
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
        myLogger.info('OWRD output')
        myLogger.info(mySiteRecords)
        myLogger.info(myGwRecords)

        buildTablesPanel(mySiteRecords, myGwRecords);

        buildHydrographPanel(mySiteRecords, myGwRecords);
    });

}
                          
function parseSiteOWRD (myJson) {
    myLogger.info('parseSiteOWRD');
    myLogger.info(myJson);

    let message = 'Retrieving OWRD site information';
    openModal(message);

    let myData = null;

    // Parse for site information
    //
    let feature_count = myJson.feature_count;
    if(feature_count == 1) {
        myData = [];
        let myRecord = myJson.feature_list[0];
        myRecord.coop_site_no = myRecord.gw_logid;
        myRecord.station_nm = myRecord.usgs_pls_notation_display
        myRecord.hole_depth_va = myRecord.max_depth;
        
        myData.push(myRecord)
        
        let myKeys     = Object.keys(myRecord);
        myData.columns = myKeys
    }
    
    // Return information
    //
    return myData;
  }

function parseGwOWRD(myJson) {
    myLogger.info('parseGwOWRD');
    myLogger.info(myJson);

    let myData;

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
