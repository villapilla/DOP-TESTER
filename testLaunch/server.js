//Lets require/import the HTTP module
var http = require('http'),
    fs = require('fs'),
    nodegit = require('nodegit'),
    path = require('path'),
    phantomJsCloud = require("phantomjscloud"),
    browser = new phantomJsCloud.BrowserApi(),
    url = "https://github.com/villapilla/prime.git",
    userName = "villapilla",
    repoName = "/prime",
    local = "./repositories/",
    urlTestTRepo = "https://dop-tester-villapilla-1.c9users.io/testing/" + userName + repoName + "/test/" ,
    cloneOpts = {};


exports.cloneRepository = function(url, folder, userName, callback) {
    nodegit.Clone(url, folder, {}).then(function (repo) {
        console.log("Cloned " + path.basename(url) + " to " + repo.workdir());
        callback();
        //testEmulation(url, "plainText", folder);
    }).catch(function (err) {
        console.log(err);
    });
}


function testEmulation(url, renderType, path) {
    var testStatus,
        statusCode;
    browser.requestSingle({ url: url , renderType: renderType }, (err, userResponse) => {
    	if (err != null) {
    		throw err;
    	}
    	
    	testStatus = JSON.stringify(userResponse.content);
    	statusCode = userResponse.content.statusCode;
    	console.log(statusCode);
    	if(statusCode === 200) {
    	    //Here save the result
    	    console.log("test saved succesfully");
    	} else {
    	    //Some error in the test
    	    
    	}
        //Delete the repository generates, low disk space :(
        deleteFolderRecursive(path);
    	return userResponse;
    });
}

//Function to delete not empty folders
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
  console.log("folder: " + path + " deleted successfully");
};