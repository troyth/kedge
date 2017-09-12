var config = require('./config');
var Wallet = require('ethers-wallet').Wallet;

// add 0x prefix to private key
var privateKey = "0x" + config.private_key;

// instantiate wallet with private key
var wallet = new Wallet( privateKey );

// log values to console
console.log("Public Address: " + wallet.address);
console.log("***");
console.log('Parameters:');
console.dir(config);
