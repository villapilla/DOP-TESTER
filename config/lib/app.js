'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
  mongoose = require('./mongoose'),
  express = require('./express'),
  chalk = require('chalk'),
  seed = require('./seed'),
  request = require('restling'),
  nodegit = require('nodegit'),
  path = require('path'),
  glob = require('glob'),
  //Mail dependencies
  nodeMailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  mailOptions = {
    service: 'gmail',
    auth: {
      user: 'laravel.escaparate@gmail.com',
      pass: 'pepe1234'
    }
  },
  transporter = nodeMailer.createTransport(smtpTransport(mailOptions)),
  //Test dependencies
  phantomJsCloud = require('phantomjscloud'),
  browserPhantom = new phantomJsCloud.BrowserApi(),
  fs = require('fs');

function seedDB() {
  if (config.seedDB && config.seedDB.seed) {
    console.log(chalk.bold.red('Warning:  Database seeding is turned on'));
    seed.start();
  }
}

// Initialize Models
mongoose.loadModels(seedDB);

module.exports.loadModels = function loadModels() {
  mongoose.loadModels();
};

module.exports.init = function init(callback) {
  mongoose.connect(function (db) {
    // Initialize express
    var app = express.init(db);
    if (callback) callback(app, db, config);

  });
};

module.exports.start = function start(callback) {
  var _this = this;

  _this.init(function (app, db, config) {

    // Start the app by listening on <port>
    app.listen(config.port, function () {

      // Logging initialization
      console.log('--');
      console.log(chalk.green(config.app.title));
      console.log(chalk.green('Environment:\t\t\t' + process.env.NODE_ENV));
      console.log(chalk.green('Port:\t\t\t\t' + config.port));
      console.log(chalk.green('Database:\t\t\t\t' + config.db.uri));
      if (process.env.NODE_ENV === 'secure') {
        console.log(chalk.green('HTTPs:\t\t\t\ton'));
      }
      console.log(chalk.green('App version:\t\t\t' + config.meanjs.version));
      if (config.meanjs['meanjs-version'])
        console.log(chalk.green('MEAN.JS version:\t\t\t' + config.meanjs['meanjs-version']));
      console.log('--');
     
      //Test service
      setInterval(function () {
        db.connections[0].model('Article').find({ 'active' : true }).exec(function (err, art) {
          if(err) {
            console.log('Se ha producido un error en el lanzamiento de test...');
          }
          console.log('Try test launch');
          art.forEach(function (element) {
            db.connections[0].model('User').findOne(element.user).exec(function (err, user) {
              if(err) {
                throw err;
              }
              launchTest(element, user, db);
            });
          });
        });
      },2000000);
  
      if (callback) {
        callback(app, db, config);
      }
    });
  });
};

function generateIndex(js, renderType, folder, db, repository, user) {
  var scripts,
    textFile,
    content,
    searchInit = '<h1>DOP-Tester</h1>',
    searchEnd = '<h1>end of test</h1>',
    file = './testLaunch/repositories/layout_html_no_test/index.html',
    dirPath = 'https://dop-tester-villapilla-1.c9users.io/testing/layout_html_no_test/';
  fs.readFile(file, function(err, index) {
    if(err) {
      console.log('Error in read ' + file);
    } else {
      textFile = index.toString();
      scripts = js.reduce(function (x, y) {
        return x + '<script src=\"https://cdn.rawgit.com/' + user.username + '/' + repository.name + '/master' + y + '\" type=\"text/javascript\"></script>\n';
      },'\n');
      content = textFile.substr(0, textFile.indexOf(searchInit) + searchInit.length) + scripts +
        textFile.substring(textFile.indexOf(searchEnd), textFile.length);
      fs.writeFile(file, content, 'utf-8', function(err, file) {
        if(err) {
          console.log('Error writing index');
        } else {
          testEmulation(dirPath, renderType, folder, db, repository._id, user);
        }
      });
    }
  });
}

function launchTest(repository, user, db) {
  var commitUrl = 'https://api.github.com/repos/' + user.username + '/' + repository.name + '/commits',
    testUrl = 'https://dop-tester-villapilla-1.c9users.io/testing/' + user.username + '/' + repository.name + '/test/',
    folder = './testLaunch/repositories/' + user.username + '/' + repository.name,
    commitSha;
  //Obtain last commit sha key
  request.get(commitUrl, {
    'headers': {
      'User-Agent': 'dop-tester'
    }
  }).then(function (result) {
    commitSha = result.data[0].sha;
    //Repository was update
    if(commitSha !== repository.lastCommit) {
      repository.lastCommit = commitSha;
      repository.lastUpdate = new Date();
      repository.save();
      cloneRepository(repository.url, testUrl, folder, repository, user, db);
      console.log('go Launch Test');
    } else {
      console.log('Repository ' + repository.name + ' has not changes');
    }
  }, function (err) {
    console.log('Bad request to ' + commitUrl);
    throw err;
  });
}


function cloneRepository(url, testUrl, folder, repository, user, db) {
  nodegit.Clone(url, folder, {}).then(function (repo) {
    console.log('Cloned ' + path.basename(url) + ' to ' + repo.workdir());
    fs.readdir(folder + '/test', function (err, file) {
      if(err) {
        console.log('no se puede leer el repositorio');
      } else {
        if(file.indexOf('index.html') !== -1) {
          //Launch mocha test with index.html
          testEmulation(testUrl, 'plainText', folder, db, repository._id, user);
        } else {
          //Other type of launch
          glob(folder + '/**/**/*.js', function(err, files) {
            if(err) {
              console.log('Se ha producido un error leyendo los ficheros');
            } else {
              files = files.map(function (element) {
                return element.substring(folder.length, element.length);
              });
              generateIndex(files, 'plainText', folder, db, repository, user);
            }
          });
        }
      }
    });
    
  }).catch(function (err) {
    console.log(err);
  });
}

//Function to delete not empty folders
var deleteFolderRecursive = function(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + '/' + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
  //console.log("folder: " + path + " deleted successfully");
};

//Launch the test in a instance of phantomJsCloud
function testEmulation(url, renderType, path, db, repositoryId, user) {
  var testStatus,
    Test = db.connections[0].model('Test'),
    testResult,
    statusCode;
  browserPhantom.requestSingle({ url: url, renderType: renderType }, function (err, userResponse) {
    if (err !== null) {
      throw err;
    }
    testStatus = JSON.stringify(userResponse.content.data);
    statusCode = userResponse.content.statusCode;
    if(statusCode === 200) {
      //Here save the result
      testResult = extractMochaTestData(testStatus);
      new Test({
        numberTests: testResult.numberTest,
        testsPass: testResult.testsPass,
        exit_input: testResult.exit_input.replace(/\"/g, ''),
        timestamp: testResult.timestamp,
        repository: repositoryId
      }).save(function(err) {
        if (err) {
          throw err;
        }
        sendEmail(testResult, user.email);
        console.log('test save');
      });
    } else {
      //Some error in the test
      console.log('Something wrong launch test in ' + url);
    }
    //Delete the repository generates, low disk space :(, better way git pull
    deleteFolderRecursive(path);
    return userResponse;
  });
}



function extractMochaTestData(data) {
  var test = {},
    testPasses = + data.substring(data.lastIndexOf('passes:') + 8, data.indexOf('failures:')),
    testFail = + data.substring(data.indexOf('failures:') + 10, data.indexOf('duration:'));
  test.numberTest = testPasses + testFail;
  test.testsPass = testPasses;
  test.exit_input = data;
  test.timestamp = new Date();
  
  return test;
}

function sendEmail(data, email) {
  mailOptions = {
    from: 'DOP-Tester', // sender address
    to: email, // list of receivers
    subject: 'DOP-Tester test', // Subject line
    html: '<a href=\"https://dop-tester-villapilla-1.c9users.io/\"><figure><img src=\"http://s32.postimg.org/e235ol769/logo_crycket_copia.png\"><figcaption>DOP-Test</figcaption></figure></a>' + 
      '<h1>Estos son los resultados de tus test:</h1>' +
      '<h2 style=\"color:green\">' + data.testsPass + ' test pasados</h2>' +
      '<h2 style=\"color:red\">' + (data.numberTest - data.testsPass) + ' test fallados</h2>'
  };
  transporter.sendMail(mailOptions, function (err) {
    if (err) { 
      console.log('Sending failed: ' + err);
      return;
    }
  });
}