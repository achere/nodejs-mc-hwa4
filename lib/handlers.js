const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const util = require('util');
const debug = util.debuglog('handlers');
const handlers = {};

//User-facing handlers:
handlers.index = (data, callback) => {
  const templateData = {
    'head.title' : 'Pizza Lodge',
    'head.description' : 'A little pizza delivery service',
    'body.class' : 'shopMenu'
  };
  handlers.htmlGetHandler('shopMenu', templateData, data, callback);
};

handlers.accountCreate = (data, callback) => {
  const templateData = {
    'head.title' : 'Create Account',
    'head.description' : 'Create your account in our little pizza delivery service',
    'body.class' : 'accountCreate'
  };
  handlers.htmlGetHandler('accountCreate', templateData, data, callback);
};

handlers.accountEdit = (data, callback) => {
  const templateData = {
    'head.title' : 'Edit your account',
    'body.class' : 'accountEdit'
  };
  handlers.htmlGetHandler('accountEdit', templateData, data, callback);
};



handlers.sessionCreate = (data, callback) => {
  const templateData = {
    'head.title' : 'Log into your Account',
    'head.description' : 'Sign in to your Pizzacount',
    'body.class' : 'sessionCreate'
  };
  handlers.htmlGetHandler('sessionCreate', templateData, data, callback);
};

handlers.shopMenu = (data, callback) => {
  const templateData = {
    'head.title' : 'Choose your Pizza',
    'head.description' : 'Add pizza to your cart',
    'body.class' : 'shopMenu'
  };
  handlers.htmlGetHandler('shopMenu', templateData, data, callback);
};

handlers.shopCart = (data, callback) => {
  const templateData = {
    'head.title' : 'Review your Cart',
    'head.description' : 'See the pizza you have added to your cart',
    'body.class' : 'shopCart'
  };
  handlers.htmlGetHandler('shopCart', templateData, data, callback);
};

handlers.shopPay = (data, callback) => {
  const templateData = {
    'head.title' : 'Checkout',
    'head.description' : 'Pay for your pizza',
    'body.class' : 'shopPay'
  };
  handlers.htmlGetHandler('shopPay', templateData, data, callback);
};

handlers.shopPaid = (data, callback) => {
  const templateData = {
    'head.title' : 'Order has been paid',
    'body.class' : 'shopPaid'
  };
  handlers.htmlGetHandler('shopPaid', templateData, data, callback);
};

handlers.sessionDeleted = (data, callback) => {
  const templateData = {
    'head.title' : 'Logged out',
    'head.description' : 'You have been logged out',
    'body.class' : 'sessionDeleted'
  };
  handlers.htmlGetHandler('sessionDeleted', templateData, data, callback);
};

handlers.htmlGetHandler = (templateName, templateData, data, callback) => {
  if (data.method === 'get') {
    helpers.getTemplate(templateName, templateData, (err, str) => {
      if (!err && str) {
        helpers.addUniversalTemplates(str, templateData, (err, str) => {
          if (!err && str) {
            callback(200, str, 'html');
          } else {
            console.error(err);
            callback(500, undefined, 'html');
          }
        });
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

handlers.favicon = (data, callback) => {
  if (data.method === 'get') {
    helpers.getStaticAsset('favicon.ico', (err, data) => {
      if (!err && data) {
        callback(200, data, 'favicon');
      } else {
        console.error(err);
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

handlers.public = (data, callback) => {
  if (data.method === 'get') {
    const trimmedAssetName = data.trimmedPath.replace('public/', '');
    if (trimmedAssetName.length > 0) {
      helpers.getStaticAsset(trimmedAssetName, (err, data) => {
        if (!err && data) {
          let contentType = 'plain';
          if (trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          } else if (trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          } else if (trimmedAssetName.indexOf('.jpg') > -1) {
            contentType = 'jpg';
          } else if (trimmedAssetName.indexOf('.ico') > -1) {
            contentType = 'favicon';
          }
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
};

//JSON API handlers:
handlers.notFound = (data, callback) => {
  callback(404);
};

handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._users = {};

//Register new user.
//Required fields: full name, street address, email and password
handlers._users.post = (data, callback) => {
  const email = typeof data.payload.email === 'string'
    && data.payload.email.trim().length > 0 ?
    data.payload.email.trim() : false;
  const password = typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0 ?
    data.payload.password.trim() : false;
  const name = typeof data.payload.name === 'string'
    && data.payload.name.trim().length > 0 ?
    data.payload.name.trim() : false;
  const address = typeof data.payload.address === 'string'
    && data.payload.address.trim().length > 0 ?
    data.payload.address.trim() : false;
  if (name && address && email && password) {
    _data.read('users', email, err => {
      if (err) {
        const hashedPassword = helpers.hash(password);
        const userObject = {
          'name' : name,
          'address' : address,
          'email' : email,
          'hashedPassword' : hashedPassword,
          'created' : Date.now()
        };
        _data.create('users', email, userObject, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {'Error' : 'Could not create the new user'});
          }
        });
      } else {
        callback(400, {'Error' : 'User with that email already exists'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  }
};

//Get info about the user.
//Required fields: email + token in header
handlers._users.get = (data, callback) => {
  const email = typeof data.queryStringObject.email === 'string'
    && data.queryStringObject.email.trim().length > 0 ?
    data.queryStringObject.email.trim() : false;
  if (email) {
    const token = typeof data.headers.token === 'string' ?
      data.headers.token : false;
    handlers._tokens.verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        _data.read('users', email, (err, data) => {
          if (!err && data) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, {'Error' : 'User not found'});
          }
        });
      } else {
        callback(403, {
          'Error' : 'Missing required token in header or token is invalid'
        });
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
};

//Update the user.
//Required data: email + token in header.
//Optional data: name, address, password.
handlers._users.put = (data, callback) => {
  const email = typeof data.payload.email === 'string'
    && data.payload.email.trim().length > 0 ?
    data.payload.email.trim() : false;
    if (email) {
    const password = typeof data.payload.password === 'string'
      && data.payload.password.trim().length > 0 ?
      data.payload.password.trim() : false;
    const name = typeof data.payload.name === 'string'
      && data.payload.name.trim().length > 0 ?
      data.payload.name.trim() : false;
    const address = typeof data.payload.address === 'string'
      && data.payload.address.trim().length > 0 ?
      data.payload.address.trim() : false;
    if (password || name || address) {
      const token = typeof data.headers.token === 'string' ?
        data.headers.token : false;
      handlers._tokens.verifyToken(token, email, tokenIsValid => {
        if (tokenIsValid) {
          _data.read('users', email, (err, userData) => {
            if (!err && data) {
              if (name) userData.name = name;
              if (address) userData.address = address;
              if (password) userData.hashedPassword = helpers.hash(password);
              _data.update('users', email, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.error(err);
                  callback(500, {'Error': 'Could not update the user'});
                }
              });
            } else {
              callback(400, {'Error' : 'The specified user does not exist'});
            }
          });
        } else {
          callback(403, {
            'Error' : 'Missing required token in header or token is invalid'
          });
        }
      });
    } else {
      callback(400, {'Error' : 'Missing fields to update'});
    }
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
};

//Delete the user
//Required fields: email + token in header
handlers._users.delete = (data, callback) => {
  const email = typeof data.queryStringObject.email === 'string'
    && data.queryStringObject.email.trim().length > 0 ?
    data.queryStringObject.email.trim() : false;
  if (email) {
    const token = typeof data.headers.token === 'string' ?
        data.headers.token : false;
    handlers._tokens.verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        _data.read('users', email, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', email, err => {
              if (!err) {
                callback(200);
              } else {
                console.error(err);
                callback(500, {'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400, {'Error' : 'The specified user does not exist'});
          }
        });
      } else {
        callback(403, {
          'Error' : 'Missing required token in header or token is invalid'
        });
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
};

handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

handlers._tokens.post = (data, callback) => {
  const email = typeof data.payload.email === 'string'
    && data.payload.email.trim().length > 0 ?
    data.payload.email.trim() : false;
  const password = typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0 ?
    data.payload.password.trim() : false;
  if (email && password) {
    _data.read('users', email, (err, userData) => {
      if (!err && userData) {
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'email' : email,
            'id' : tokenId,
            'expires' : expires
          };
          _data.create('tokens', tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              console.error(err);
              callback(500, {'Error' : 'Could not create new token'});
            }
          });
        } else {
          callback(400, {'Error' : 'Password did not match the stored password'});
        }
      } else {
        callback(400, {'Error' : 'Could not find the specified user'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  }
};

handlers._tokens.delete = (data, callback) => {
  const id = typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20 ?
    data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, err => {
          if (!err) {
            callback(200);
          } else {
            console.error(err);
            callback(500, {'Error' : 'Could not delete the specified token'});
          }
        });
      } else {
        callback(400, {'Error' : 'The specified token does not exist'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
}

handlers._tokens.verifyToken = (id, email, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.email === email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

handlers.orders = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._orders[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._orders = {};

//Create new order
//Required fields: email, items (as array of objects with keys name and qty)
//+ token in header
handlers._orders.post = (data, callback) => {
  const email = typeof data.payload.email === 'string'
    && data.payload.email.trim().length > 0 ?
    data.payload.email.trim() : false;
  const items = typeof data.payload.items === 'object'
    && data.payload.items instanceof Array
    && data.payload.items.length > 0 ?
    data.payload.items : false;
  if (email && items) {
    const token = typeof data.headers.token === 'string' ?
        data.headers.token : false;
    handlers._tokens.verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        _data.read('', 'menu', (err, menu) => {
          if (!err && data) {
            const menuList = menu.map(obj => obj.name);
            if (items.every(i => menuList.indexOf(i.name) > -1)) {
              const total = items.reduce((sum, i) => {
                const price = i.qty * parseInt(
                  menu.find(p => p.name === i.name)['price']
                );
                return sum + price;
              }, 0);
              const orderId = helpers.createRandomString(20);
              const orderObject = {
                'id' : orderId,
                'email' : email,
                'items' : items,
                'total' : total,
                'paid' : false,
                'created' : Date.now()
              };
              _data.create('orders', orderId, orderObject, err => {
                if (!err) {
                  callback(200, orderObject);
                } else {
                  console.error(err);
                  callback(500, {'Error' : 'Could not create the new orer'});
                }
              });
            } else {
              callback(405, {'Error' : 'Some cart items are not from the menu'});
            }
          } else {
            console.error(err);
            callback(500, {'Error' : 'Could not read the menu'});
          }
        });
      } else {
        callback(403, {'Error' : 'Token in header is missing or invalid'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  }
}

//Check the status of an order
//Required fields: order id + token in header
handlers._orders.get = (data, callback) => {
  const id = typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20 ?
    data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('orders', id, (err, orderData) => {
      if (!err && orderData) {
        const token = typeof data.headers.token === 'string' ?
          data.headers.token : false;
        handlers._tokens.verifyToken(token, orderData.email, tokenIsValid => {
          if (tokenIsValid) {
            callback(200, orderData);
          } else {
            callback(403, {
              'Error' : 'Missing required token in header or token is invalid'
            });
          }
        });
      } else {
        callback(404, {'Error' : 'The specified order is not found'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
};

//Change order
//Required fields: order id + token in header
//Optional fields: items (as array of objects with keys name and qty)
handlers._orders.put = (data, callback) => {
  const id = typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20 ?
    data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('orders', id, (err, orderData) => {
      if (!err && orderData) {
        const token = typeof data.headers.token === 'string' ?
          data.headers.token : false;
        handlers._tokens.verifyToken(token, orderData.email, tokenIsValid => {
          if (tokenIsValid) {
            const items = typeof data.payload.items === 'object'
              && data.payload.items instanceof Array
              && data.payload.items.length > 0 ?
              data.payload.items : false;
            if (items) {
              _data.read('', 'menu', (err, data) => {
                if (!err && data) {
                  const menu = JSON.parse(data);
                  const menuList = menu.map(obj => obj.name);
                  if (items.every(i => menuList.indexOf(i.name) > -1)) {
                    const total = items.reduce((sum, i) => {
                      const price = i.qty * menu.filter(p => p.name === i.name)['price'];
                      return sum + price;
                    }, 0);
                    orderData.items = items;
                    _data.update('orders', id, orderData, err => {
                      if (!err) {
                        callback(200, orderData);
                      } else {
                        callback(500, {'Error' : 'Could not update the order'});
                      }
                    });
                  } else {
                    callback(405, {'Error' : 'Some cart items are not from the menu'});
                  }
                } else {
                  console.error(err);
                  callback(500, {'Error' : 'Could not read the menu'});
                }
              });
            } else {
              callback(405, {'Error' : 'Specified items are missing or invalid'});
            }
          } else {
            callback(403, {
              'Error' : 'Missing required token in header or token is invalid'
            });
          }
        });
      } else {
        callback(400, {'Error' : 'The specified order does not exist'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
};

//Delete existing order
//Required fields: order id + token in header
handlers._orders.delete = (data, callback) => {
  const id = typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20 ?
    data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('orders', id, (err, orderData) => {
      if (!err && orderData) {
        const token = typeof data.headers.token === 'string' ?
          data.headers.token : false;
        handlers._tokens.verifyToken(token, orderData.email, tokenIsValid => {
          if (tokenIsValid) {
            _data.delete('orders', id, err => {
              if (!err) {
                callback(200);
              } else {
                console.error(err);
                callback(500, {'Error' : 'Could not delete the order'});
              }
            });
          } else {
            callback(403, {
              'Error' : 'Missing required token in header or token is invalid'
            });
          }
        });
      } else {
        callback(400, {'Error' : 'The specified order does not exist'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field'});
  }
}

//Pay for the order
//Required fields: order id, stripe token + token in header
handlers.pay = (data, callback) => {
  debug(data);
  if (data.method === 'post') {
    const id = typeof data.payload.id === 'string'
      && data.payload.id.trim().length === 20 ?
      data.payload.id.trim() : false;
    const number = typeof data.payload.number === 'string'
      && data.payload.number.match(/^\d{16}\$/) ?
      data.payload.number : false;
    const exp_month = typeof data.payload.exp_month === 'string'
      && data.payload.exp_month.match(/^\d{2}\$/) 
      && data.payload.exp_month >= 1
      && data.payload.exp_month <= 12 ?
      data.payload.exp_month : false;
    const exp_year = typeof data.payload.exp_year === 'string'
      && data.payload.exp_year.match(/^\d{4}\$/)
      && data.payload.exp_year >= 2018 ?
      data.payload.exp_year : false;
    const cvc = typeof data.payload.cvc === 'string'
      && data.payload.cvc.match(/^\d{3}\$/) ?
      data.payload.cvc : false;
    helpers.getStripeToken({number, exp_month, exp_year, cvc}, (err, stripeToken) => {
      if (!err && stripeToken) {
         if (id) {
          _data.read('orders', id, (err, orderData) => {
            if (!err && orderData) {
              if (!orderData.paid) {
                const token = typeof data.headers.token === 'string' ?
                  data.headers.token : false;
                handlers._tokens.verifyToken(token, orderData.email, tokenIsValid => {
                  if (tokenIsValid) {
                    helpers.payWithStripe(orderData.total, config.currency, '', stripeToken, err => {
                      if (!err) {
                        orderData.paid = true;
                        const emailBody = `Payment for your order ${id} 
                          in the amount ${orderData.total} has been accepted`;
                        helpers.sendMailgunEmail(email, 'Pizza payment accepted', emailBody, err => {
                          if (!err) {
                            callback(200);
                          } else {
                            callback(200, {
                              'Warning' : 'Payment was processed, but we couldn\'t email the receipt'
                            });
                          }
                        });
                      } else {
                        console.error(err);
                        callback(500, {'Error': err});
                      }
                    });
                  } else {
                    callback(403, {
                      'Error' : 'Missing required token in header or token is invalid'
                    });
                  }
                });
              } else {
                callback(403, {'Error' : 'The order is already paid for'});
              }
            } else {
              callback(400, {'Error' : 'The specified order does not exist'});
            }
          });
        } else {
          callback(400, {'Error' : 'Missing required field'});
        }
      } else {
        callback(500, {'Error' : err});
      }
    });
  } else {
    callback(405);
  }
};

handlers.menu = (data, callback) => {
  if (data.method === 'get') {
    _data.read('', 'menu', (err, data) => {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(500, {'Error' : 'Could not get the menu'});
      }
    });
  } else {
    callback(405);
  }
}

module.exports = handlers;
