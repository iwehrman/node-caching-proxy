/*jslint vars: true, plusplus: true, node: true, nomen: true, indent: 4, maxerr: 50 */

var http = require("http"),
    fs = require("fs"),
    util = require("util");

function requestListener(serverReq, serverRes) {
    "use strict";

    var origHost = serverReq.headers.host,
        index = origHost.indexOf(".localhost");
    
    if (index === -1) {
        util.log("Ignorning request for host: " + origHost);
        return;
    }
    
    var host = origHost.substring(0, index),
        filename = encodeURIComponent(host + serverReq.url);
    
    fs.exists(filename, function (exists) {
        if (exists) {
            util.log("reading: " + filename);
            fs.createReadStream(filename).pipe(serverRes);
        } else {
            http.get({host: host, path: serverReq.url}, function (clientRes) {
                var file = fs.createWriteStream(filename, {flags: "w"});
                
                util.log("request: " + host + serverReq.url);
                util.log("file: " + filename);
                
                clientRes.pipe(file);
                clientRes.pipe(serverRes);
                
                file.on("end", function () {
                    util.log("finished writing file: " + filename);
                });
            });
        }
        serverRes.on("end", function () {
            util.log("finished writing response: " + host + serverReq.url);
        });
    });
}

http.createServer(requestListener).listen(9999);