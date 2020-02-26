const fs = require('fs');
const axios = require('axios');
const path = require('path');

let downloader = async (url, id, type) => new Promise((resolve,reject) => {
  
  if (!fs.existsSync(path.resolve(__dirname, '..', 'pdfs'))) {
    fs.mkdirSync(path.resolve(__dirname, '..', 'pdfs'));
  }

  if (!fs.existsSync(path.resolve(__dirname, '..', 'pdfs', id))) {
    fs.mkdirSync(path.resolve(__dirname, '..', 'pdfs', id));
  }

  if (!fs.existsSync(path.resolve(__dirname, '..', 'pdfs', id, type))) {
    fs.mkdirSync(path.resolve(__dirname, '..', 'pdfs', id, type));
  }

  let urlObject = new URL(url);
  let pieces = urlObject.pathname.split('/');
  let lastPieceIndex = pieces.length - 1;
  let fileName = pieces[lastPieceIndex];
  let filePath = path.resolve(`pdfs/${id}/${type}/`, fileName);
  let writeStream = fs.createWriteStream(filePath);

  writeStream.on('finish', () => {
    console.log(`Finished writing: ${filePath}`);
    resolve();
  });

  writeStream.on('error', err => {
    console.log(`Error writing: ${fileName} `, err);
    reject();
  });

  axios({
    method: 'get',
    url,
    responseType: 'stream',
  }).then(res => {
    res.data.pipe(writeStream);
  });

});

module.exports = downloader
