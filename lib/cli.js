const readline = require('readline');
const debug = require('util').debuglog('cli');
const events = require('events');
const os = require('os');
const v8 = require('v8');
const _data = require('./data');
const helpers = require('./helpers');

class _events extends events{};
const e = new _events();

const cli = {};

e.on('man', () => {
  cli.responders.help();
});

e.on('help', () => {
  cli.responders.help();
});

e.on('exit', () => {
  cli.responders.exit();
});

e.on('stats', () => {
  cli.responders.stats();
});

e.on('users', () => {
  cli.responders.users();
});

e.on('user', str => {
  cli.responders.user(str);
});

e.on('orders', () => {
  cli.responders.orders();
});

e.on('order', str => {
  cli.responders.order(str);
});

cli.verticalSpace = lines => {
  lines = typeof lines === 'number' && lines > 0 ?
    lines : 1;
  for (i = 0; i < lines; i++) {
    console.log('');
  }
};

cli.horizontalLine = () => {
  const width = process.stdout.columns;
  let line = '';
  for (i = 0; i < width; i++) {
    line+='-';
  }
  console.log(line);
};

cli.centered = str => {
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : '';
  const width = process.stdout.columns;
  const leftPadding = Math.floor((width - str.length) / 2);
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

cli.responders = {};

cli.responders.help = () =>{
  const commands = {
    'man' : 'Show this help page',
    'help' : 'Alias of the "man" command',
    'exit' : 'Kill the application',
    'stats' : 'Get stats on the OS and resource utilization',
    'menu' : 'Show the menu',
    'users' : 'List users who have signed up in the last 24 hours',
    'user --{userId}' : 'Show details of a specific user',
    'orders' : 'List orders submitted in the last 24 hours',
    'order --{orderId}' : 'Show details of a specific order'
  };
  
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);
  
  for (const key in commands) {
    if (commands.hasOwnProperty(key)) {
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += commands[key];
      console.log(line);
      cli.verticalSpace(1);
    }
  }
  
  cli.verticalSpace(1);
  cli.horizontalLine();
};

cli.responders.exit = () =>{
  process.exit(0);
};

cli.responders.stats = () => {
  const stats = {
    'Load Average' : os.loadavg().join(' '),
    'CPU Count' : os.cpus().length,
    'Free Memory' : os.freemem(),
    'Current Malloced Memory' : v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory' : v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)' : Math.round(v8.getHeapStatistics().used_heap_size 
      / v8.getHeapStatistics().total_heap_size * 100),
    'Available Heap Allocated (%)' : Math.round(v8.getHeapStatistics().total_heap_size 
    / v8.getHeapStatistics().heap_size_limit * 100),
    'Uptime' : `${os.uptime()} S`
  };
  
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);
  
  for (const key in stats) {
    if (stats.hasOwnProperty(key)) {
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += stats[key];
      console.log(line);
      cli.verticalSpace(1);
    }
  }
  
  cli.verticalSpace(1);
  cli.horizontalLine();
};

cli.responders.users = () =>{
  _data.list('users', (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      cli.verticalSpace();
      userIds.forEach(userId => {
        _data.read('users', userId, (err, userData) => {
          if (!err && userData && userData.created - Date.now() <= 24*3600*1000) {
            let line = `Name: ${userData.firstName} ${userData.lastName} `
            line += `Phone: ${userData.phone} `;
            const numberOfChecks = typeof userData.checks === 'object'
              && userData.checks instanceof Array ?
              userData.checks.length : 0;
            line += `Checks: ${numberOfChecks}`;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

cli.responders.user = str => {
  const arr = str.split('--');
  const userId = typeof(arr[1]) === 'string' 
    && arr[1].trim().length > 0 ?
    arr[1].trim() : false;
  if (userId) {
    _data.read('users', userId, (err, userData) => {
      if (!err && userData) {
        delete userData.hashedPassword;
        cli.verticalSpace();
        console.dir(userData, {'colors' : true});
        cli.verticalSpace();
      }
    });
  }
};

cli.responders.orders = () => {
  _data.list('orders', (err, orderIds) => {
    if (!err && orderIds && orderIds.length > 0) {
      cli.verticalSpace();
      orderIds.forEach(orderId => {
        _data.read('orders', orderId, (err, orderData) => {
          if (!err && orderData && orderData.created - Date.now() <= 24*3600*1000) {
            let line = `Name: ${orderData.firstName} ${orderData.lastName} `
            line += `Phone: ${orderData.phone} `;
            const numberOfChecks = typeof orderData.checks === 'object'
              && orderData.checks instanceof Array ?
              orderData.checks.length : 0;
            line += `Checks: ${numberOfChecks}`;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

cli.responders.order = str =>{
  const arr = str.split('--');
  const orderId = typeof(arr[1]) === 'string' 
    && arr[1].trim().length > 0 ?
    arr[1].trim() : false;
  if (orderId) {
    _data.read('orders', orderId, (err, orderData) => {
      if (!err && orderData) {
        cli.verticalSpace();
        console.dir(orderData, {'colors' : true});
        cli.verticalSpace();
      }
    });
  }
};

cli.processInput = str => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : false;
  if(str) {
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'menu',
      'orders',
      'order',
      'users',
      'user'
    ];
    
    let matchFound = false;
    let counter = 0;
    uniqueInputs.some((input) => {
      if(str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        e.emit(input, str);
      }
    });
    
    if (!matchFound) {
      console.log('Sorry not sorry');
    }
  }
}

cli.init = () => {
  console.log('\x1b[34m%s\x1b[0m','The CLI is running');
  const _interface = readline.createInterface({
    input: process.stdin,
    output : process.stdout,
    prompt: '> '
  });
  
  _interface.prompt();
  
  _interface.on('line', str => {
    cli.processInput(str);
    _interface.prompt();
  });
  
  _interface.on('close', () => {
    process.exit(0);
  });
  
}

module.exports = cli;
