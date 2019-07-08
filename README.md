# Trello-Board-Monitoring

## Getting Started

### Prerequisites

### Inside .env file

* SLACK_TOKEN=[string][1]


You also need :
  -*@slack/web-api*
  -*dotenv*
  -*nedb*

### Installing

```
npm install
```

## Running the tests

For Example:

```bash
node server.js
```
Expected output: channel_id(string),channel_name(string),is_there_msg(boolean),last_message_ts(string)


### And coding style tests

```bash
semistandard --fix
```
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

## Built With

* [NodeJS](https://nodejs.org/en/)

## Authors

* **Hun Vikran** 

[1]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String