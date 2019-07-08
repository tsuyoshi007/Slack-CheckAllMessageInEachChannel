/**
 * author: Hun Vikran
 * version: 1.0.0
 * */

require('dotenv').config();

const Datastore = require('nedb');
const db = new Datastore({ filename: './database/message', autoload: true });

const WebClient = require('@slack/web-api').WebClient;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const web = new WebClient(SLACK_TOKEN);

let DATA;

// user-defined function
// function notInclude (data, updatedData) {
//   const dataId = data.map(message => {
//     return message.id;
//   });
//   const updatedId = updatedData.map(message => {
//     return message.id;
//   });
//   return [dataId.filter(element => {
//     return !updatedId.includes(element);
//   }), dataId.filter(element => {
//     return !updatedId.includes(element);
//   })];
// }
function compare (data, updatedData) {
  return data.ts === updatedData.ts;
}
function getDataFromDB (query) {
  return new Promise(function (resolve, reject) {
    db.find(query, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
function checkMessage (data, updatedData) {
  return data.ts !== updatedData.ts;
}
function updateDB (query, data) {
  return new Promise((resolve, reject) => {
    db.update(query, data, (err, updated) => {
      if (err) {
        reject(err);
      } else {
        resolve(updated);
      }
    });
  });
}

async function check () {
  let updatedData = [];
  let status;
  let changed;

  const channels = await web.channels.list(err => {
    console.log('An error occurred:', err);
  });

  for (const channel of channels.channels) {
    updatedData.push(Object({ id: channel.id, name: channel.name, message: (await web.conversations.history({ channel: channel.id, limit: 1 })).messages[0] }));
  }

  for (const dataMessage of DATA) {
    for (const updatedMessage of updatedData) {
      status = compare(dataMessage.id, updatedMessage.id);
      if (status) {
        changed = checkMessage(dataMessage.message, updatedMessage.message);
        if (changed) {
          console.log(`${dataMessage.id}, ${dataMessage.name}, ${changed}, ${updatedMessage.message.ts}`);
          updateDB({ id: dataMessage.id }, { $set: { message: updatedMessage.message } }).catch(err => {
            console.log(err);
          });
        } else {
          console.log(`${dataMessage.id}, ${dataMessage.name}, ${changed}, ${dataMessage.message.ts}`);
        }
      }
      break;
    }
  }
}
async function initialize () {
  let saveToDB = [];
  const channels = await web.channels.list(err => {
    console.log(err);
  });
  for (const channel of channels.channels) {
    saveToDB.push(Object({ id: channel.id,
      name: channel.name,
      message: (await web.conversations.history({ channel: channel.id, limit: 1 }).catch(err => {
        console.log('An error occurred:', err);
      })).messages[0] }));
  }
  db.insert(saveToDB, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

async function start () {
  DATA = await getDataFromDB({}).catch(err => {
    console.log('An error occured:', err);
  });
  if (!DATA.length) {
    initialize();
  } else {
    check();
  }
}

start();
