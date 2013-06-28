/*jslint vars: true, plusplus: true, node: true, nomen: true, indent: 4, maxerr: 50 */

var http = require("http"),
    fs = require("fs"),
    util = require("util");

function requestListener(serverReq, serverRes) {
    "use strict";

    function setServerResponseHeaders(headers) {
        var header;
        for (header in headers) {
            if (headers.hasOwnProperty(header)) {
                serverRes.setHeader(header, headers[header]);
            }
        }
    }
    
    var origHost = serverReq.headers.host,
        index = origHost.indexOf(".localhost");
    
    if (index === -1) {
        util.log("Ignorning request for host: " + origHost);
        return;
    }
    
    var host = origHost.substring(0, index),
        filename = encodeURIComponent(host + serverReq.url),
        dataname = filename + ".data",
        headername = filename + ".headers";
    
    fs.exists(headername, function (exists) {
        if (exists) {
            var dataFile = fs.createReadStream(dataname);
            
            util.log("Reading header file: " + headername);
            fs.readFile(headername, { encoding: "utf8" }, function (err, headerObj) {
                if (err) {
                    util.log("Error reading headers: " + err);
                }
                
                var headers = JSON.parse(headerObj);
                setServerResponseHeaders(headers);
                    
                util.log("Reading data file: " + dataname);
                dataFile.pipe(serverRes);
                dataFile.on("end", function () {
                    util.log("Finished writing response: " + host + serverReq.url);
                });
            });
        } else {
            http.get({host: host, path: serverReq.url}, function (clientRes) {
                var datafile = fs.createWriteStream(dataname, {flags: "w"}),
                    headers = {
                        "Content-Type": clientRes.headers["content-type"],
                        "Access-Control-Allow-Origin": clientRes.headers["access-control-allow-origin"]
                    };
                
                setServerResponseHeaders(headers);
                
                util.log("Requesting: " + host + serverReq.url);
                util.log("Writing: " + dataname);
                clientRes.pipe(datafile);
                clientRes.pipe(serverRes);
                clientRes.on("end", function () {
                    util.log("Finished writing file and response: " + filename);
                });
                
                fs.writeFile(headername, JSON.stringify(headers), function (err) {
                    if (err) {
                        util.log("Error writing headers: " + err);
                    }
                });
            });
        }
    });
}

http.createServer(requestListener).listen(9999);