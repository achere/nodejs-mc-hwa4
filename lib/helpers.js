const helpers = {};
const crypto = require('crypto');
const config = require('./config');
const path = require('path');
const queryString = require('querystring');
const https = require('https');
const fs = require('fs');

helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch {
    return {};
  }
}

helpers.createRandomString = strLength => {
  strLength = typeof strLength === 'number' && strLength > 0 ?
    strLength : false;
  if (strLength) {
    const possibleChars = 'abcdefghiklmnopqrstuvwxyz0123456789';
    let str = '';
    let i;
    for (i = 0; i < strLength; i++) {
      const randomChar = possibleChars.charAt(
        Math.floor(Math.random() * possibleChars.length)
      );
      str += randomChar;
    }
    return str;
  } else {
    return false;
  }
};

helpers.cardQueryString = ccinfo => {
  // Get the key/val entries of the ccinfo.
  const entries = Object.entries(ccinfo)

  // Generate a list of key/val pair strings ('card[key]=val').
  const keyVals = entries.reduce((list, pair) => {
    const [key, value] = pair
    return list.push(`card[${key}]=${value}`) && list
  }, [])

  // Join the list with the necessary delimiter.
  return keyVals.join('&')
};


helpers.tokenOptions = payload => {
  const options = {
    protocol: 'https:',
    hostname: 'api.stripe.com',
    method: 'POST',
    path: `/v1/tokens`,
    auth: `${config.stripeSecret}:`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
    }
  }

  return options
}

helpers.getStripeToken = (ccinfo, callback) => {
  const payload = helpers.cardQueryString(ccinfo);
  const options = helpers.tokenOptions(payload);
  helpers.httpsRequest(options, payload).then(response => {
    const responseObj = JSON.parse(response.body);
    if (response.code >= 400) {
      callback(responseObj.error);
    } else {
      callback(null, responseObj);
    }
  }).catch(err => {
    console.error(err);
    callback(err);
  })
  ;
};

helpers.payWithStripe = (amount, currency, description, source, callback) => {
  const payload = {
    'amount' : amount,
    'currency' : currency,
    'description' : description,
    'source' : source
  };
  const stringPayload = queryString.stringify(payload);
  const requestDetails = {
    'protocol' : 'https:',
    'hostname' : 'api.stripe.com',
    'method' : 'POST',
    'auth' : config.stripeSecret,
    'path' : '/v1/charges',
    'headers' : {
      'Content-Type' : 'application/x-www-form-urlencoded',
      'Content-Length' : Buffer.byteLength(stringPayload)
    }
  };
  const req = https.request(requestDetails, res => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      callback(false);
    } else {
      callback(`Stripe returned ${res}`);
    }
  });
  req.on('error', e => callback(e));
  req.write(stringPayload);
  req.end();
};

helpers.sendMailgunEmail = (to, subject, body, callback) => {
  const payload = {
    'from' : `Pizza Lodge ${config.mailgun.sender}`,
    'to' : to,
    'subject' : subject,
    'text' : body
  };
  const stringPayload = queryString.stringify(payload);
  const requestDetails = {
    'protocol' : 'https:',
    'hostname' : 'api.mailgun.net',
    'method' : 'POST',
    'auth' : config.mailgun.apiKey,
    'path' : `/v3/${config.mailgun.domainName}/messages`,
    'headers' : {
      'Content-Type' : 'application/x-www-form-urlencoded',
      'Content-Length' : Buffer.byteLength(stringPayload)
    }
  }
  const req = https.request(requestDetails, res => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      callback(false);
    } else {
      callback(`Mailgun returned ${res}`);
    }
  });
  req.on('error', e => callback(e));
  req.write(stringPayload);
  req.end();
};

helpers.getTemplate = (name, data, callback) => {
  name = typeof name === 'string' && name.length > 0 ? name : false;
  data = typeof data === 'object' && data !== null ? data : {};
  if (name) {
    const templateDir = path.join(__dirname, '/../templates/');
    fs.readFile(templateDir+name+'.html', 'utf8', (err, str) => {
      if (!err && str && str.length > 0) {
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof str === 'string' && str.length > 0 ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};
  helpers.getTemplate('_header', data, (err, _headerString) => {
    if (!err && _headerString) {
      helpers.getTemplate('_footer', data, (err, _footerString) => {
        if (!err && _footerString) {
          const fullString = _headerString + str + _footerString;
          callback(false, fullString);
        } else {
          callback('Could not find the _footer template');
        }
      })
    } else {
      callback('Could not find the _header template');
    }
  });
}

helpers.interpolate = (str, data) => {
  str = typeof str === 'string' && str.length > 0 ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }
  for (let key in data) {
    if (data.hasOwnProperty && typeof data[key] === 'string') {
      const replace = data[key];
      const find = `{${key}}`;
      str = str.replace(find, replace);
    }
  }
  return str;
};

helpers.getStaticAsset = (fileName, callback) => {
  fileName = typeof fileName === 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, (err, data) => {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

helpers.httpsRequest = (options, payload) => {
  return new Promise((resolve, reject) => {

    // Initiate the request.
    const request = https.request(options, async (res) => {
      const body = await getResponseBody(res)
      const headers = res.headers
      const code = res.statusCode
      resolve({ code, body, headers})
    })

    // Handle errors.
    request.on('error', (error) => reject(error))

    // Write request payload.
    request.write(payload)

    // End the request.
    request.end()
  })
  function getResponseBody(res) {
    return new Promise((resolve, reject) => {
      const buffer = []
  
      // Build up the buffer when data comes in.
      res.on('data', (data) => {
        buffer.push(data.toString())
      })
  
      // When finished, resolve the promise.
      res.on('end', () => {
        resolve(buffer.join(''))
      })
  
      // An error occurred. Reject the promise.
      res.on('error', (error) => {
        reject(error)
      })
    })
  }
};

module.exports = helpers;