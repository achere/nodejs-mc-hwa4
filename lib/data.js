const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.basedir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
  fs.open(`${lib.basedir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.writeFile(fileDescriptor, stringData, err =>{
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.basedir}${dir}/${file}.json`, 'utf8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

lib.update = (dir, file, data, callback) => {
  fs.open(`${lib.basedir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.ftruncate(fileDescriptor, err => {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, err => {
            if(!err) {
              fs.close(fileDescriptor, err => {
                if(!err) {
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          })
        }
      })
    } else {
      callback('Could not open the file for updating, it may not exist yet');
    }
  });
};

lib.delete = (dir, file, callback) => {
  fs.unlink(`${lib.basedir}${dir}/${file}.json`, err => {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting the file');
    }
  })
};

lib.list = (dir, callback) => {
  fs.readdir(`${lib.basedir}${dir}/`, (err, data) => {
    if (!err && data && data.length > 0) {
      // const trimmedFileNames = [];
      // data.forEach(fileName => {
      //   trimmedFileNames.push(fileName.replace('.json', ''));
      // });
      const trimmedFileNames = data.map(fileName =>
        fileName.replace('.json', ''));
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
}

module.exports = lib;