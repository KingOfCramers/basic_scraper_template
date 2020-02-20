const mongoose = require('mongoose');

const dat = {
  type: {
    type: String,
    require: true
  },
  link: {
    type: String,
    require: true,
  },
  title: {
    type: String,
    require: true,
  },
  date: {
    type: String,
    require: true,
  },
  time: {
    type: String,
    require: true,
  },
  location: {
    type: String,
    required: false,
  },
  witnesses: {
    type: Array,
    require: false,
  },
  isSubcommittee: {
    type: Boolean,
    require: true,
  },
  subcommittee: {
    type: String,
    require: false
  },
};

module.exports = {
  SASCSchema: mongoose.model('SASC', dat),
  SFRCSchema: mongoose.model('SFRC', dat)
};
