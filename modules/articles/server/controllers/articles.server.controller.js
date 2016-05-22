'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Article = mongoose.model('Article'),
  Test = mongoose.model('Test'),
  request = require('sync-request'),
  fs = require('fs'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));
  

/**
 * Create a article
 */
exports.create = function (req, res) {
  var article = new Article(req.body);
  article.user = req.user;

  article.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(article);
    }
  });
};

/**
 * Show the current article
 */
exports.read = function (req, res) {
  var urlSplit = req.url.split('/'),
    user = req.user,
    resUpdate,
    id = urlSplit[urlSplit.length - 1];
    //Load repository
  Article.findById(id).populate('user', 'displayName').exec(function (err, article) {
    console.log(article);
    if(err) {
      return res.status(400).send({
        message: 'Article error'
      });
    } else {
      if(!article) {
        return res.status(400).send({
          message: 'No article with that identifier has been found'
        });
      } else {
        //Load tests
        Test.find({
          'repository':article
        }).exec(function (err, tests) {
          if(err) {
            errorHandler(err);
          }
          article.test = tests;
          console.log(article);
          res.json(article);
        });
      }
    }
  });
};

/**
 * Update a article
 */
exports.update = function (req, res) {
  var article = req.article;
  article.title = req.body.title;
  article.content = req.body.content;
  article.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(article);
    }
  });
};

/**
 * Delete an article
 */
exports.delete = function (req, res) {
  var article = req.article;
  article.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(article);
    }
  });
};

/**
 * List of Articles
 */
exports.list = function (req, res) {
  var userData = req.user;
  Article.find().where({
    user: userData
  }).sort('-created').populate('user', 'displayName').exec(function (err, articles) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(articles);
    }
  });
};

/**
 * Article middleware
 */
exports.articleByID = function (req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Article is invalid'
    });
  }
  Article.findById(id).exec(function (err, article) {
    if (err) {
      return next(err);
    } else if (!article) {
      return res.status(404).send({
        message: 'No article with that identifier has been found'
      });
    }
    console.log(article);
    req.article = article;
    next();
  });
};

exports.startRepository = function (req, res) {
  var urlSplit = req.url.split('/'),
    user = req.user,
    repositoriesJson,
    resUpdates,
    resUpdateJson,
    id = urlSplit[urlSplit.length - 1],
    resRepos;
  Article.findById(id).populate('user', 'displayName').exec(function (err, article) {
    if(err) {
      return res.status(403).send({
        message: 'Article error'
      });
    } else {
      if(!article) {
        return res.status(400).send({
          message: 'No article with that identifier has been found'
        });
      } 
    }
    if(article.active) {
      //unsuscribe from github Webhook
      article.active = false;
      deleteFromFile(article.url);
    } else {
      //Load last commit data
      resRepos = request('GET', 'https://api.github.com/repos/' + user.username + '/' + article.name, {
        'headers': {
          'user-agent': 'dop-tester'
        }
      });
        
      repositoriesJson = JSON.parse(resRepos.getBody('utf8'));
      //console.log(repositoriesJson);
      if(repositoriesJson.size !== 0) {
        resUpdates = request('GET', 'https://api.github.com/repos/' + user.username + '/' + article.name + '/commits', {
          'headers': {
            'user-agent': 'dop-tester'
          }
        });
        resUpdateJson = JSON.parse(resUpdates.getBody('utf8'));
        article.lastCommit = resUpdateJson[0].sha;
        article.lastUpdate = resUpdateJson[0].commit.committer.date;
      } else {
        article.lastUpdate = null;
        article.lastCommit = null;
      }
      article.active = true;
      //console.log(article);
      addToFile(article.url);
    }
    article.save();
    console.log(article.name + ' repository update');
  });
};


function addToFile(RepositoryUrl) {
  var url = '../dop/folder/repositories',
    test;
  fs.readFile(url, 'utf8' ,function (err, data) {
    if (err) {
      throw err;
    } else {
      test = data.split('|');
      test.push(RepositoryUrl);
      fs.writeFile(url, test.join('|'), function(err) {
        if(err) {
          return console.log(err);
        } else {
          console.log('The element was add!!');
        }
      });
    }
  });
}

function deleteFromFile(RepositoryUrl) {
  var url = '../dop/folder/repositories',
    test;
  fs.readFile(url, 'utf8' ,function (err, data) {
    if (err) {
      throw err;
    } else {
      test = data.split('|');
      test = test.filter(function(element, index) {
        return element !== RepositoryUrl && element !== '';
      });
      fs.writeFile(url, test.join('|'), function(err) {
        if(err) {
          return console.log(err);
        } else {
          console.log('The element was remove!!');
        }
      });
    }
  });
}