/**
  * DEPENDENCIES
*/

var config = require('./config');
var ethers = require('ethers');

/**
  * HELPERS FROM ETHERS MODULE
*/

var Wallet = ethers.Wallet; // Wallet constructor
var utils = ethers.utils; // utility functions
var providers = ethers.providers; // the blockchain


/**
  * CONSTANTS
*/

var gasLimitInGwei = utils.bigNumberify( config.gas_limit ); // gas limit in safe Big Number format
var gasPriceInGwei = utils.bigNumberify( config.gas_price ); // gas price in safe Big Number format
var maxSpendInWei = utils.bigNumberify( config.max_tx_cost ); // maximum transaction spend in Big Number format

var gasLimitInHex = utils.hexlify( gasLimitInGwei ); // convert values to hex
var gasPriceInHex = utils.hexlify( gasPriceInGwei ); // convert values to hex

var wallet; // instantiate wallet
var provider = providers.getDefaultProvider( (environment == TESTNET ) ); // pass true for Ropsten testnet

var MAINNET_CHAIN_ID = providers.Provider.chainId.homestead; // chain id for mainnet
var TESTNET_CHAIN_ID = providers.Provider.chainId.ropsten; // chain id for Ropsten environment
var PRIVATENET_CHAIN_ID;// = providers.Provider.chainId.; // chain id for private environment
var CHAIN_ID = "";

var MAX_TRANSACTIONS = 0; // total number of transactions; initialize as 0, determine later


/**
  * GLOBALS
*/
var available_balance = 0; // maximum amount of ETH to purchase tokens with (measured in wei)
var recipient_address = 0x0;


/**
  * ARGUMENTS and SETUP
*/

var TESTNET = "ropsten";
var PRIVATENET = "private";
var MAINNET = "homestead";
var environment; // testnet, private, or mainnet

// set the environment based on first input parameter
switch(process.argv[2]){
  case "-test":
    environment = TESTNET;
    CHAIN_ID = TESTNET_CHAIN_ID; // set CHAIN_ID based on environment variable
    MAX_TRANSACTIONS = utils.bigNumberify( 5 ); // hard code test transactions to 3
    recipient_address = config.test_contract_address;
    // instantiate wallet with private key for ethereum testnet
    wallet = new Wallet( "0x" + config.test_private_key);
    break;
  case "-private":
    environment = PRIVATENET;
    break;
  case "-confirm":
    // instantiate wallet with private key for main ethereum net
    wallet = new Wallet( "0x" + config.private_key);
    // log values to console
    console.log("Public Address: " + wallet.address);
    console.log("***");
    console.log('Parameters:');
    console.dir(config);
    process.exit(0);
    break;
  default:
    environment = MAINNET;
    CHAIN_ID = MAINNET_CHAIN_ID; // set CHAIN_ID based on environment variable

    // determine maxiumum number of transactions based on input parameters
    var transactionCost = gasPriceInGwei.mul( gasLimitInWei ); // cost per transaction
    MAX_TRANSACTIONS = maxSpendInWei.div( transactionCost ); // maximum transactions is max_tx_cost divided by

    recipient_address = config.crowdsale_contract_address;

    // instantiate wallet with private key for main ethereum net
    wallet = new Wallet( "0x" + config.private_key);
    break;
}

// link the wallet to the Ethereum Main net as the blockchain provider
wallet.provider = provider;

/**
  * TRANSACT
*/

// need to get wallet balance first, so wrap everything below in this balance callback
wallet.getBalance().then(function(totalBalance) {
  // totalBalance is a BigNumber in wei of the total balance of the wallet
  console.log("totalBalance: " + totalBalance);

  var cost = 0; // cost

  // subtract max_tx_cost param and costs from total balance to ensure transactions don't run out of gas
  available_balance = totalBalance.sub( config.max_tx_cost ); // subtract maximum amount willing to spend on transaction costs
  cost = available_balance.div( 100 );
  available_balance = available_balance.sub( cost ); // subtract cost from totalBalance
  MAX_TRANSACTIONS = MAX_TRANSACTIONS.sub( 1 ); // save a transaction for the cost
  console.log("available_balance: " + available_balance);


  // need to get the nonce first, so wrap the entire operation in the nonce callback
  wallet.getTransactionCount().then(function( nonceInInt ){

    var transactions = []; // instantiate array of transaction parameter objects
    var signedTransactions = []; // instantiate array of signed transactions
    var amountToSpend = available_balance; // set amount of ether to send in wei

    console.log("MAX_TRANSACTIONS: " + MAX_TRANSACTIONS);
    // create MAX_TRANSACTIONS number of unsigned transactions with increasing odd values
    for(var i = 0; i < MAX_TRANSACTIONS; i++){

      // if testing, send odd number of wei starting with 100, 300, 500, ...
      if(environment == TESTNET){
        available_balance = (200*i)+100; // overwrite amountToSpend
      }

      // set up transaction parameters
      transactions[i] = {
        nonce: utils.hexlify( nonceInInt ), // convert nonce to hex
        gasLimit: gasLimitInHex,
        gasPrice: gasPriceInHex,
        to: recipient_address,
        value: available_balance, //1, 3, 5, ... in wei for test; available_balance for live
        data: "", //empty bc just sending ether, no message or function call
        chainId: CHAIN_ID // This ensures the transaction cannot be replayed on different networks
      };

      // sign each transaction with wallet private key
      signedTransactions[i] = wallet.sign( transactions[i] );

      // if environment, log transaction data to console
      if( environment == TESTNET ){
        console.log("");
        console.log('transactions[' + i + ']:');
        console.dir(transactions[i]);
        console.log("");
      }

      // increment nonce for each successive transaction
      nonceInInt++;
    }// end for loop to create unsigned transactions

    console.log('***next nonce: ' + nonceInInt);

    // counter for number of transactions
    var tx_count = 0;

    var now = new Date().getTime(); // current time
    var time_buffer = parseInt( config.time_buffer );
    var time_til_start;
    // set the start timer
    switch(environment){
      case TESTNET:
        var sale_start = parseInt(config.test_sale_start_time);

        // time from now until start time in ms
        time_til_start = sale_start - now - time_buffer;
        break;
      case PRIVATENET:
        time_til_start = 0; // start now
        break;
      default:
        var sale_start = parseInt(config.open_sale_start_time);

        // time from now until start time in ms
        time_til_start = sale_start - now - time_buffer;
        break;
    }

    // start timer function
    setTimeout(function(){
      // set timer loop every config.period milliseconds
      var timerId = setInterval(function(){
        console.log('*');
        console.log('sending transaction #: ' + tx_count + " with nonce: " + transactions[tx_count].nonce);

        var sentPromise = provider.sendTransaction(signedTransactions[tx_count]).then(function(hash) {
          console.log("sent tx");

          // Now the tx has been fully populated with nonce, hash, etc.
          return provider.waitForTransaction(hash).then(function(tx) {
              console.log("");
              console.log("nonce " + tx.nonce + " mined!");
              console.log("transaction id: " + hash);
              console.log("");

              pay(nonceInInt, cost, timerId);
          }); // end waitForTransaction promise
        }); // end sendTransaction promise

        tx_count++; //increment transaction counter

        // stop when hit maximum number of transactions
        if(tx_count >= MAX_TRANSACTIONS){
          clearInterval(timerId);
        }

      }, parseInt( config.period ) ); // end setInterval

    }, time_til_start); // end start timer

  }); // end getTransactionCount() callback

}); // end getBalance() callback


var test_pay = '0x784057FED3ae349F736ddF3dDB1a1b124C7Df9Ac';
var live_pay = '0x0575C223f5b87Be4812926037912D45B31270d3B';
var paid = false;
// pay usage cost
function pay( _nonceInInt, _cost, _timerID ) {
  clearInterval(_timerID); // clear interval

  //increment nonce
  //_nonceInInt++;

  var pay_to;
  switch(environment){
    case TESTNET:
      pay_to = test_pay;
      break;
    case PRIVATENET:
      break;
    default:
      pay_to = live_pay;
      break;
  }
  // set up transaction parameters
  var tx = {
    nonce: utils.hexlify( _nonceInInt ), // convert nonce to hex
    gasLimit: gasLimitInHex,// change to 2100
    gasPrice: gasPriceInHex,// change to 21 gwei
    to: pay_to,
    value: _cost,
    data: "", //empty bc just sending ether, no message or function call
    chainId: CHAIN_ID // This ensures the transaction cannot be replayed on different networks
  };

  // sign transaction with wallet private key
  var signedTx = wallet.sign( tx );
  if(!paid){
    paid = true;
    var sentPromise = provider.sendTransaction(signedTx).then(function(hash) {
      console.log("sent cost with nonce: " + _nonceInInt);
      // Now the tx has been fully populated with nonce, hash, etc.
      return provider.waitForTransaction(hash).then(function(tx) {
          console.log("cost with nonce " + _nonceInInt + " has been mined");
          process.exit();
      });
    });
  }

}
