/**
  * DEPENDENCIES
*/

var config = require('./config');
var ethers = require('ethers');


/**
  * ARGUMENTS
*/
var testnet = false; // set false for mainnet, true for Ropsten testnet

if(process.argv[2] == "-test"){
  testnet = true;
}


/**
  * HELPERS FROM ETHERS MODULE
*/

var Wallet = ethers.Wallet;
var utils = ethers.utils;
var providers = ethers.providers;


/**
  * CONSTANTS
*/

var gasLimitInGwei = utils.bigNumberify( config.gas_limit ); // gas limit in safe Big Number format
var gasPriceInGwei = utils.bigNumberify( config.gas_price ); // gas price in safe Big Number format
var maxSpendInWei = utils.bigNumberify( config.max_spend ); // maximum transaction spend in Big Number format

var gasLimitInHex = utils.hexlify( gasLimitInGwei );
var gasPriceInHex = utils.hexlify( gasPriceInGwei );

console.log("gasLimitInHex: " + gasLimitInHex);

var provider = providers.getDefaultProvider(testnet); // the blockchain to link to

var MAINNET_CHAIN_ID = providers.Provider.chainId.homestead; // chain id for mainnet
var TESTNET_CHAIN_ID = providers.Provider.chainId.ropsten; // chain id for Ropsten testnet
var CHAIN_ID = "";

// set CHAIN_ID based on testnet variable
if(testnet){
  CHAIN_ID = TESTNET_CHAIN_ID;
}else{
  CHAIN_ID = MAINNET_CHAIN_ID;
}

var MAX_TRANSACTIONS = 0; // instantiate total number of test transactions

if(testnet){
  MAX_TRANSACTIONS = 3;
}else{
  var transactionCost = gasPriceInWei.mul( gasLimitInWei ); // cost per transaction
  MAX_TRANSACTIONS = maxSpendInWei.div( transactionCost ); // maximum transactions is max_spend divided by transaction cost
}


/**
  * WALLET SETUP
*/

// add 0x prefix to private key
var privateKey = "0x" + config.private_key;

// instantiate wallet with private key and main ethereum net
var wallet = new Wallet( privateKey );

// link the wallet to the Ethereum Main net as the blockchain provider
wallet.provider = provider;

/**
  * TRANSACT
*/

// need to get wallet balance first, so wrap everything below in this balance callback
wallet.getBalance().then(function(fullBalance) {
  // fullBalance is a BigNumber in wei
  console.log("fullBalance: " + fullBalance);

  // subtract max_spend param from balance to ensure transactions don't run out of gas
  if(!testnet){
    var availableBalance = fullBalance.sub( config.max_spend );
    console.log("availableBalance: " + availableBalance);
  }

  // need to get the nonce first, so wrap the entire operation in the nonce callback
  wallet.getTransactionCount().then(function( nonceInInt ){
    // convert nonce to hex value
    var nonceInHex;

    // instantiate array of transaction parameter objects
    var transactions = [];

    // create MAX_TRANSACTIONS number of unsigned transactions with increasing odd values
    for(var i = 0; i < MAX_TRANSACTIONS; i++){
      // set amount of ether to send in wei
      var amountToSend = 0;
      if(testnet){
        amountToSend = (2*i)+1;
      }else{
        amountToSend = availableBalance;
      }

      // increment nonce for each successive transaction
      nonceInHex = utils.hexlify( nonceInInt + i );
      console.log("nonce: " + nonceInHex);

      transactions[i] = {
        nonce: nonceInHex, // forces .sign() method to source nonce
        gasLimit: gasLimitInHex,
        gasPrice: gasPriceInHex,

        to: config.test_address,

        value: amountToSend, //1, 3, 5, ... in wei
        data: "", //empty bc just sending ether, no message or function call

        // This ensures the transaction cannot be replayed on different networks
        chainId: CHAIN_ID
      };

      console.log("***transactions["+i+"]***");
      console.dir(transactions[i]);
    }// end for loop to create unsigned transactions


    // instantiate array of signed transactions
    var signedTransactions = [];

    // prepare MAX_TRANSACTIONS number of signed transactions to deploy to the Ethereum live network
    for(var i = 0; i < MAX_TRANSACTIONS; i++){
      // sign each transaction
      signedTransactions[i] = wallet.sign( transactions[i] );

      // log signed transaction bytecode to console
      console.log(signedTransactions[i]);
    }

    // counter for number of transactions
    var tx_count = 0;

    // set timer loop every config.period milliseconds
    var timerId = setInterval(function(){

      // send the transactions one at a time
      provider.sendTransaction(signedTransactions[tx_count]).then(function(hash) {
        // log the transaction hash to the console
        console.log('Transaction Hash: ' + hash);
      });

      tx_count++; //increment transaction counter

      // stop when hit maximum number of transactions
      if(tx_count >= MAX_TRANSACTIONS){
        clearInterval(timerId);
      }

    }, parseInt( config.period ) ); // end setInterval

  }); // end getTransactionCount() callback

}); // end getBalance() callback
