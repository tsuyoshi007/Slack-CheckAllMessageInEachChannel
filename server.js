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
function findChannelChanges (data, updatedData) {
  const dataId = data.map(message => {
    return message.id;
  });
  const updatedId = updatedData.map(message => {
    return message.id;
  });
  return [ updatedId.filter(element => {
    return !dataId.includes(element);
  }), dataId.filter(element => {
    return !updatedId.includes(element);
  })];
}
function compare (a, b) {
  return a === b;
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
function insertDB (data) {
  return new Promise((resolve, reject) => {
    db.insert(data, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
function removeDB (query) {
  return new Promise((resolve, reject) => {
    db.remove(query, {}, function (err, removed) {
      if (err) {
        reject(err);
      } else {
        resolve(removed);
      }
    });
  });
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
    if (!channel.is_archived) {
      updatedData.push(Object({ id: channel.id, name: channel.name, ts: (await web.conversations.history({ channel: channel.id, limit: 1 })).messages[0].ts }));
    }
  }

  let archivedChannels = channels.channels.filter(channel => {
    return channel.is_archived;
  });

  if (archivedChannels.length) {
    for (const channel of archivedChannels) {
      removeDB({ id: channel.id }).catch(err => { console.log(err); });
    }
  }

  // first index : Channel to add
  // second index : Channel to remove
  if (DATA.length !== updatedData.length) {
    const channelChanges = findChannelChanges(DATA, updatedData);
    if (channelChanges[0].length) {
      const channelToAdd = channelChanges[0].map(id => {
        return updatedData.filter(channel => {
          return channel.id === id;
        })[0];
      });
      await insertDB(channelToAdd).catch(err => {
        console.log('An error occured:', err);
      });
    }
    if (channelChanges[1].length) {
      for (const remove of channelChanges[1]) {
        db.remove({ id: remove }, err => {
          if (err) {
            console.log('An error occured:', err);
          }
        });
      }
    }
  }

  for (const dataMessage of DATA) {
    for (const updatedMessage of updatedData) {
      status = compare(dataMessage.id, updatedMessage.id);
      if (status) {
        changed = !compare(dataMessage.ts, updatedMessage.ts);
        if (changed) {
          console.log(`${dataMessage.id}, ${dataMessage.name}, ${changed}, ${updatedMessage.ts}`);
          updateDB({ id: dataMessage.id }, { $set: { ts: updatedMessage.ts } }).catch(err => {
            console.log('An error occured:', err);
          });
        } else {
          console.log(`${dataMessage.id}, ${dataMessage.name}, ${changed}, ${dataMessage.ts}`);
        }
      }
    }
  }
}
async function initialize () {
  let saveToDB = [];
  const channels = await web.channels.list(err => {
    console.log(err);
  });
  for (const channel of channels.channels) {
    if (!channel.is_archived) {
      saveToDB.push(Object({ id: channel.id,
        name: channel.name,
        ts: (await web.conversations.history({ channel: channel.id, limit: 1 }).catch(err => {
          console.log('An error occurred:', err);
        })).messages[0].ts }));
    }
  }
  db.insert(saveToDB, err => {
    if (err) {
      console.log('An error occured:', err);
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
    check(); // cron starter should be here here
  }
}

start();
