var port = 8080;
var buildURL = "https://cdn.glitch.me/1e79ce18-2755-4421-b3a3-ec98907df76f/credits.zip?v=1715460185735";

var fs = require("fs");
var path = require("path");
var http = require("http");
var https = require("https");
var URL = require("url");
var jszip = require("jszip");

var headers = {
	"User-Agent":"Gvbvdxx Mod 2 - Small Static Server - Node.js"
};

function getRequest(url) {
	var parsedURL = URL.parse(url);
	var requestModule = null;
	if (parsedURL.protocol == "http:") {
		requestModule = http;
	}
	if (parsedURL.protocol == "https:") {
		requestModule = https;
	}
	if (!requestModule) {
		throw new Error("Unrecognized protocol for GET request "+parsedURL.protocol);
	}
	return new Promise((resolve, reject) => {
		
		var request = requestModule.request({
			method:"GET",
			headers: headers,
			...parsedURL
		},(res) => {
			var data = [];
			res.on("data", (chunk) => {
				data.push(chunk);
			});
			res.on("end", async () => {
				if (res.statusCode == 302) {
					resolve(await getRequest(res.headers.location));
				} else {
					if (res.statusCode !== 200) {
						reject("Response not OK. "+http.STATUS_CODES[res.statusCode.toString()]);
					} else {
						resolve(Buffer.concat(data));
					}
				}
			});
		});
		request.end();
	});
}

function a() {
  return new Promise((accept,reject) => {
    setTimeout(accept,10);
  });
}  

var fileTypes = {
  svg:"image/svg+xml",
  png:"image/png",
  wav:"image/wav",
  html:"text/html"  
};
var cache = {};

(async function () {
  var zip = null;
  var server = http.createServer(async function (req,res) {
    console.log(`[${req.headers['x-forwarded-for'] || req.connection.remoteAddress}]: ${req.method} ${req.url} ${req.headers["user-agent"]}`);
    
    if (!zip) {
      while (!zip) {
        await a();
      }
    }
    
    var url = URL.parse(req.url);
    var pathname = url.pathname;

    var file = pathname;
    if (pathname == "/") {
      file = "index.html";
    }
    if (file.split(".").length < 2) {
      file += ".html";
    }
    if (file.startsWith("/")) {
      file = file.slice(1,file.length);
    }
    
    try{
      if(!zip.files[file]) {
        res.statusCode = 404;
        res.end("404 NOT FOUND");
        return;
      }
      var data = null
      if (cache[file]) {
        data = cache[file];
      } else {
        cache[file] = await zip.files[file].async("nodebuffer");
        data = cache[file];
      }
      var type = fileTypes[file.split(".").pop().toLowerCase()];
      if (!type) {
        type = "text/plain";
      }
      res.writeHead(200,{"content-type":type});
      res.end(data);
    }catch(e){
      res.statusCode = 404;
      res.end("");
      console.log(e);
    }
  });
  server.listen(port);
  console.log("Listenening on port "+port);
  
  console.log("Initializing build download into memory...");
  var data = await getRequest(buildURL);
  console.log("Successfully downloaded into memory, unzipping into memory...");
  zip = await jszip.loadAsync(data);
  data = undefined;
  console.log("Done unzipping into memory, allowing server file reading...");
  
})();
