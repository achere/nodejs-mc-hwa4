const app = {};
app.config = {
  'sessionToken' : false
};
app.cart = [];

app.request = (headers,path,method,queryStringObject,payload,callback) => {
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE']
  .indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;
  let requestUrl = path+'?';
  let firstKey = true;
  for (const queryKey in queryStringObject) {
    if (!firstKey) {
      requestUrl += '&';
    }
    requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    firstKey = false;
  }
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  for (const headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch(e) {
          callback(statusCode, false);
        }
      }
    }
  }
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

app.iterableToObj = (strMap) => {
  let obj = Object.create(null);
  for (let [k,v] of strMap) {
    if (k !== '__proto__') obj[k] = v;
  }
  return obj;
};

app.setSessionToken = function(token) {
  if(typeof(token) == 'object'){
    app.setLoggedInClass(true);
    app.config.sessionToken = token;
    const tokenString = JSON.stringify(token);
    localStorage.setItem('token', tokenString);
  } else {
    app.setLoggedInClass(false);
    localStorage.removeItem('token');
  }
};

app.getSessionToken = function() {
  const tokenString = localStorage.getItem('token');
  if (typeof(tokenString) == 'string'){
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof(token) == 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch(e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

app.readCart = () => {
  const cartString = localStorage.getItem('cart');
  if (typeof cartString === 'string') {
    try {
      const cart = JSON.parse(cartString);
      app.cart = cart;
      if (cart.length) document.getElementById('cartItems').innerText = `(${cart.length})`;
    } catch(e) {
      console.error(e);
    }
  }
};

app.addToCart = (item) => {
  const existingItemIndex = app.cart.findIndex(cartItem =>
    cartItem.name === item.name
  );
  if (existingItemIndex > -1) {
    app.cart[existingItemIndex].qty = parseInt(app.cart[existingItemIndex].qty) + parseInt(item.qty);
  } else {
    app.cart.push(item);
    document.getElementById('cartItems').innerText = `(${app.cart.length})`;
  }
  const cartString = JSON.stringify(app.cart);
  localStorage.setItem('cart', cartString);
};

app.removeFromCart = (itemName) => {
  const index = app.cart.findIndex(cartItem =>
    cartItem.name === itemName
  );
  if (index > -1) {
    app.cart.splice(index, 1);
    document.getElementById('cartItems').innerText = app.cart.length ? `(${app.cart.length})` : '';
    const cartString = JSON.stringify(app.cart);
    localStorage.setItem('cart', cartString);
  }
}

app.setLoggedInClass = function(add){
  var target = document.querySelector("body");
  if(add){
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

app.displayError = function(text) {
  this.querySelector('.error').innerText = text;
  this.querySelector('.error').style.display = 'block';
};

app.displayMsg = (text) => {
  document.getElementById('message').innerText = text;
  document.getElementById('message').style.display = 'block';
};

app.makeElt = (tag, text, classes, id) => {
  const el = document.createElement(tag);
  classes.forEach(style => el.classList.add(style));
  if (id) el.setAttribute('id', id);
  el.innerHTML = text;
  return el;
};

app.logUserOut = (doNotRedirect) => {
  const tokenId = typeof(app.config.sessionToken.id) === 'string' ?
    app.config.sessionToken.id : false;
  app.request(null, 'api/tokens', 'DELETE', {
    'id': tokenId
  }, null, (statusCode, responsePayload) => {
    if (statusCode === 200) {
      app.setSessionToken(false);
      if (!doNotRedirect) {
        window.location = 'session/deleted';
      }
    } else {
      app.displayMsg(`Could not log you out due to error: ${responsePayload['Error']}`);
    }
  });
};

app.displayCart = () => {
  const tbody = document.getElementById('cart');
  const total =  document.getElementById('total');
  if (tbody) {
    tbody.innerHTML = "";
    if (app.cart.length) {
      document.getElementById('empty').classList.remove('pure-button-disabled');
      document.getElementById('pay').classList.remove('pure-button-disabled');
      app.cart.forEach(item => {
        const text = `<td>${item.name}</td><td>${item.price}</td>
        <td>${item.qty}</td><td>${item.qty * item.price}
        <button class="float-right pure-button button-error" id="${item.name}">
        Delete Pizza</button></td>`;
        tbody
        .appendChild(app.makeElt('tr', text, []))
        .lastElementChild.addEventListener('click', e => {
          app.removeFromCart(e.target.id);
          app.displayCart();
        });
      });
     total.innerText = app.cart.reduce((sum, item) => sum+=item.price*item.qty, 0);
    } else {
      document.getElementById('empty').classList.add('pure-button-disabled');
      document.getElementById('pay').classList.add('pure-button-disabled');
      const text = `<td colspan=4>There are no items in your cart.
      Please go to the Menu to add one</td>`;
      document.getElementById('cart').appendChild(app.makeElt('tr', text, []));
      total.innerText = 0;
    }
  }
};

app.emptyCart = function() {
  app.cart = [];
  localStorage.removeItem('cart');
  document.getElementById('cartItems').innerText = '';
  app.displayCart();
};

app.setOrder = (order) => {
  app.order = order;
  const orderString = JSON.stringify(order);
  localStorage.setItem('order', orderString);
};

app.getOrder = () => {
  app.order = JSON.parse(localStorage.getItem('order'));
  return app.order;
};

window.onload = () => {
  app.getSessionToken();
  app.readCart();
  app.getOrder();
  document.getElementById('logoutButton').addEventListener('click', e => {
    e.preventDefault();
    app.logUserOut();
  });
  const forms = document.querySelectorAll('form');
  if (forms) forms.forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    if (document.body.classList.contains('shopPay')) {
      const cardNumber = document.querySelector('input[name=number]').value;
      const hey = /^\d{16}$/g.test(cardNumber);
      if (!hey) {
        app.displayError.call(form, 'Invalid card number');
        return;
      }
    }
    let method = form.method;
    const formData = app.iterableToObj(new FormData(form));
    if (document.body.classList.contains('accountEdit')) {
      method = 'PUT';
      formData.email = app.config.sessionToken.email;
    }
    app.request({}, form.action, method, null, formData, (statusCode, responsePayload) => {
      if (form.method === 'post' && form.action === `${window.location.origin}/api/users`) {
        if (statusCode === 200) {
          app.request({}, 'api/tokens', 'POST', null, {
            'email' : formData.email,
            'password' : formData.password
          }, (sessionStatusCode, sessionResponsePayload) => {
            if (sessionStatusCode === 200) {
              app.setSessionToken(sessionResponsePayload);
              window.location = 'shop/menu';
            } else if (sessionStatusCode === 403) {
              app.logUserOut();
            } else {
              app.displayError.call(form, sessionResponsePayload['Error']);
            }
          });
        } else {
          app.displayError.call(form, responsePayload['Error']);
        }
      } else if (form.method === 'post' && form.action === `${window.location.origin}/api/tokens`) {
        if (statusCode === 200) {
          app.setSessionToken(responsePayload);
          window.location = 'shop/menu';
        } else if (statusCode === 403) {
          app.logUserOut();
        } else {
          app.displayError.call(form, responsePayload['Error']);
        }
      } else if (form.method === 'post' && form.action === `${window.location.origin}/api/pay`) {
        if (statusCode === 200) {
          app.order.paid = true;
          localStorage.setItem('order', JSON.stringify(app.order));
          app.emptyCart();
          window.location = 'order/paid';
        } else if (statusCode === 403) {
          app.logUserOut();
        } else {
          app.displayError.call(form, responsePayload['Error']);
        }
      } else if (method.toLowerCase() === 'put' && form.action === `${window.location.origin}/api/users`) {
        if (statusCode === 200) {
          app.displayMsg('Changed your settings successfully');
        } else if (statusCode === 403) {
          app.logUserOut();
        } else {
          app.displayError.call(form, responsePayload['Error']);
        }
      }
    });
  }));
  if (document.body.classList.contains('shopMenu')) {
    app.request({}, 'api/menu', 'get', null, null, (statusCode, responsePayload) => {
      if (statusCode === 200) {
        const parent = document.querySelector('.pure-g');
        for (const key in responsePayload) {
          const pizza = responsePayload[key];
          const text = `<img src="public/logo.png" alt="Logo" class="pure-img"/><br>
            <h2>${pizza.name}</h2>
            <p>Price: ${pizza.price}</p><form class="pure-form">
            <input type="number" data-name="${pizza.name}" data-price="${pizza.price}"
            min="1" class="pure-input-1 qty" value="1">
            <button type="button" class="pure-button pure-button-primary">Add to Cart</button></form>`;
          parent.appendChild(
            app.makeElt('div', text, ['pure-u-1', 'pure-u-md-1-2', 'pure-u-lg-1-4'])
          ).querySelector('button').addEventListener('click', e => {
            const itemNode = e.target.previousElementSibling;
            app.addToCart({
              'name' : itemNode.dataset.name,
              'qty' : itemNode.value,
              'price' : itemNode.dataset.price
            });
            app.displayMsg(`${itemNode.value} of "${itemNode.dataset.name}" pizza is added to cart`);
          });
        }
      }
    });
  } else if (document.body.classList.contains('shopCart')) {
    document.getElementById('empty').addEventListener('click', app.emptyCart);
    document.getElementById('pay').addEventListener('click', () => {
      if (app.config.sessionToken) {
        const order = {
          'email' : app.config.sessionToken.email,
          'items' : app.cart
        };
        app.request(null, 'api/orders', 'POST', null, order, (statusCode, responsePayload) => {
          if (statusCode === 200) {
            app.setOrder(responsePayload);
            window.location = 'shop/pay';
          } else if (statusCode === 403) {
            app.logUserOut();
          }
        });
      } else {
        window.location = 'session/create';
      }
    });
    app.displayCart();
  } else if (document.body.classList.contains('shopPay')) {
    if (app.order) {
      app.order.items.forEach(item => document.getElementById('pizzas')
      .appendChild(app.makeElt(
        'p', `${item.qty} of "${item.name}" pizza for ${item.price} each`, []
      )));
      document.getElementById('total').innerText = app.order.total;
    } else {
      document.getElementById('payContent')
      .innerText = "You must have ended up on this page by mistake...";
    }
  } else if (document.body.classList.contains('accountEdit')) {
    app.request()
    app.request({}, 'api/users', 'GET', {'email' : app.config.sessionToken.email}, null, (statusCode, responsePayload) => {
      if (statusCode === 200) {
        for (const key in responsePayload) {
          if (responsePayload.hasOwnProperty(key)) {
            document.querySelector(`input[name="${key}"]`).value = responsePayload[key];
          }
        }
      } else if (statusCode === 403) {
        app.logUserOut();
      }
    });
  }
};