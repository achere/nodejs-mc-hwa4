# Node js Master Class Homework assignment #4
## PIZZA LODGE

**Web application for making Pizza orders with Admin CLI**

## Setup

### Prerequizites:
- Node.js LTS installed
- HTTPS certificates generated
- Stripe account
- Mailgun account

### Configuring the project
After cloning the repo create **config.js** file in the lib directory like so:

```Javascript

const environments = {};

environments.['/*environment name*/'] = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : '/*environment name*/',
  'hashingSecret' : 'topSecret',
  'stripeSecret' : '/*your secret*/',
  'currency' : '/*your currency*/',
  'mailgun' : {
    'sender' : '/*your mailgun address*/',
    'apiKey' : '/*your API key*/' ,
    'domain' : '/*your domain*/'
  },
  'templateGlobals' : {
    'appName' : 'Pizza Ordering App',
    'companyName' : 'Ink Inc.',
    'yearCreated' : '2018',
    'baseUrl' : 'http://localhost:3000'
  }
};

const currentEnvironment = typeof process.env.NODE_ENV === 'string' ?
  process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof environments[currentEnvironment] === 'object' ?
  environments[currentEnvironment] : environments.staging;

module.exports = environments;

```
Edit **menu.json** file in the /.data folder to update the menu with your own.
Add logo.png and favicon.ico to your /public folder.

## Usage

Place your key.pem and cert.pem files inside https/ folder in the project directory.
Start the project by running **NODE_ENV=your_environment node index** in the terminal.

Now you have your website available by URL and port specified in **config.json** file! Users are able to sign in, sign up, fill their cart with items from your menu, submit order to your server, pay for it and get a receipt to their email.
Additionally, there is a simple CLI tool available for you for monitoring the data. Type **man** or **help** to get started.
