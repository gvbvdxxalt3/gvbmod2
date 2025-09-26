var buildURL =
  "https://github.com/gvbvdxxalt3/gvbmod2/releases/download/1.0/GM2Latest.zip";
var buildFolder = "dist";

var fs = require("fs");
var path = require("path");
var http = require("http");
var https = require("https");
var URL = require("url");
var jszip = require("jszip");

var headers = {
  "User-Agent": "Node js",
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
    throw new Error(
      "Unrecognized protocol for GET request " + parsedURL.protocol
    );
  }
  return new Promise((resolve, reject) => {
    var request = requestModule.request(
      {
        method: "GET",
        headers: headers,
        ...parsedURL,
      },
      (res) => {
        var data = [];
        res.on("data", (chunk) => {
          data.push(chunk);
        });
        res.on("end", async () => {
          if (res.statusCode == 302) {
            resolve(await getRequest(res.headers.location));
          } else {
            if (res.statusCode !== 200) {
              reject(
                "Response not OK. " +
                  http.STATUS_CODES[res.statusCode.toString()]
              );
            } else {
              resolve(Buffer.concat(data));
            }
          }
        });
      }
    );
    request.end();
  });
}

(async function () {
  console.log("Downloading build...");
  var data = await getRequest(buildURL);
  console.log("Loading zip file...");
  zip = await jszip.loadAsync(data);
  data = null;
  console.log("Resetting build folder...");
  
  if (fs.existsSync(buildFolder)) {
    fs.rmSync(buildFolder, { recursive: true, dir: true });
  }
  fs.mkdirSync(buildFolder);

  console.log("Extracting zip...");

  var folders = Object.keys(zip.files).filter((file) => {
    return zip.files[file].dir;
  });
  var files = Object.keys(zip.files).filter((file) => {
    return !zip.files[file].dir;
  });

  for (var folder of folders) {
    var filePath = path.join(buildFolder, folder);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
    }
    console.log(`Create folder ${filePath}`);
  }

  for (var file of files) {
    var filePath = path.join(buildFolder, file);
    fs.writeFileSync(filePath, await zip.files[file].async("uint8array"));
    console.log(`Write file ${filePath}`);
  }

  console.log("Done");

  process.exit();
})();
