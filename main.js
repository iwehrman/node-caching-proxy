/*jslint vars: true, plusplus: true, node: true, nomen: true, indent: 4, maxerr: 50 */

var http    = require("http"),
    fs      = require("fs"),
    util    = require("util");

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
            
            fs.readFile(headername, { encoding: "utf8" }, function (err, headerObj) {
                if (err) {
                    util.log("Error reading headers: " + err);
                } else {
                    var headers = JSON.parse(headerObj);
                    setServerResponseHeaders(headers);
                    dataFile.pipe(serverRes);
                }
            });
        } else {
            util.log("Requesting: " + host + serverReq.url);
            http.get({host: host, path: serverReq.url}, function (clientRes) {
                var datafile = fs.createWriteStream(dataname, {flags: "w"}),
                    headers = {
                        "Content-Type": clientRes.headers["content-type"],
                        "Access-Control-Allow-Origin": clientRes.headers["access-control-allow-origin"]
                    };
                
                setServerResponseHeaders(headers);
                clientRes.pipe(datafile);
                clientRes.pipe(serverRes);
                clientRes.on("end", function () {
                    util.log("Wrote data: " + dataname);
                });
                
                fs.writeFile(headername, JSON.stringify(headers), function (err) {
                    if (err) {
                        util.log("Error writing headers: " + err);
                    } else {
                        util.log("Wrote headers: " + headername);
                    }
                });
            }).on("error", function (err) {
                util.log("HTTP error: " + err);
                if (!serverRes.headersSent) {
                    serverRes.writeHead("500");
                }
                serverRes.end();
            });
        }
    });
}

http.createServer(requestListener).listen(9999);