'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * Article Schema
 */
var ArticleSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  url : {
    type: String,
  },
  active : {
    type: Boolean,
    default: false
  },
  test : {
    type: Array,
    default: []
  },
  lastUpdate : {
    type: Date
  },
  lastCommit : {
    type: String
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});
ArticleSchema.statics.repositoryByUser = function (userName, cb) {
  return this.model('Article').find({ user: userName }, cb);
};

mongoose.model('Article', ArticleSchema);
