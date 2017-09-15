/**
  * DEPENDENCIES
*/

var config = require('./config');
var ethers = require('ethers');

/**
  * HELPERS FROM ETHERS MODULE
*/

var Wallet = ethers.Wallet; // your wallet, accessed by private key
var utils = ethers.utils; // utility functions
var providers = ethers.providers; // the blockchain


/**
  * CONSTANTS
*/

var gasLimitInGwei = utils.bigNumberify( config.gas_limit ); // gas limit in safe Big Number format
var gasPriceInGwei = utils.bigNumberify( config.gas_price ); // gas price in safe Big Number format
var maxSpendInWei = utils.bigNumberify( config.max_spend ); // maximum transaction spend in Big Number format

var gasLimitInHex = utils.hexlify( gasLimitInGwei ); // convert values to hex
var gasPriceInHex = utils.hexlify( gasPriceInGwei ); // convert values to hex

var provider = providers.getDefaultProvider( (environment == TESTNET ) ); // pass true for Ropsten testnet

var MAINNET_CHAIN_ID = providers.Provider.chainId.homestead; // chain id for mainnet
var TESTNET_CHAIN_ID = providers.Provider.chainId.ropsten; // chain id for Ropsten environment
var PRIVATENET_CHAIN_ID;// = providers.Provider.chainId.; // chain id for private environment
var CHAIN_ID = "";

var MAX_TRANSACTIONS = 0; // instantiate total number of test transactions


/**
  * GLOBALS
*/
var available_balance = 0; // maximum amount of ETH to purchase tokens with (measured in wei)
var recipient_address = 0x0;


/**
  * ARGUMENTS
*/

var TESTNET = "ropsten";
var PRIVATENET = "private";
var MAINNET = "live";
var environment; // testnet, private, or mainnet

// set the environment based on first input parameter
switch(process.argv[2]){
  case "-test":
    environment = TESTNET;
    CHAIN_ID = TESTNET_CHAIN_ID; // set CHAIN_ID based on environment variable
    MAX_TRANSACTIONS = utils.bigNumberify( 3 ); // hard code test transactions to 3
    recipient_address = config.test_address;
    break;
  case "-private":
    environment = PRIVATENET;
    break;
  default:
    environment = MAINNET;
    CHAIN_ID = MAINNET_CHAIN_ID; // set CHAIN_ID based on environment variable

    // determine maxiumum number of transactions based on input parameters
    var transactionCost = gasPriceInWei.mul( gasLimitInWei ); // cost per transaction
    MAX_TRANSACTIONS = maxSpendInWei.div( transactionCost ); // maximum transactions is max_spend divided by

    recipient_address = config.crowdsale_contract_address;

    break;
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
wallet.getBalance().then(function(totalBalance) {
  // totalBalance is a BigNumber in wei of the total balance of the wallet
  console.log("totalBalance: " + totalBalance);

  var fee; // usage fee

  // subtract max_spend param and fees from total balance to ensure transactions don't run out of gas
  if(environment == MAINNET){
    available_balance = totalBalance.sub( config.max_spend ); // subtract maximum amount willing to spend on transaction costs
    fee = available_balance.div( 100 );
    available_balance = available_balance.sub( fee ); // subtract fee from totalBalance
    MAX_TRANSACTIONS = MAX_TRANSACTIONS.sub( 1 ); // save a transaction for the fee
    console.log("available_balance: " + available_balance);
  }

  // need to get the nonce first, so wrap the entire operation in the nonce callback
  wallet.getTransactionCount().then(function( nonceInInt ){

    var transactions = []; // instantiate array of transaction parameter objects
    var signedTransactions = []; // instantiate array of signed transactions
    var amountToSpend = available_balance; // set amount of ether to send in wei

    // create MAX_TRANSACTIONS number of unsigned transactions with increasing odd values
    for(var i = 0; i < MAX_TRANSACTIONS; i++){

      // if environment, send odd number of wei starting with 1, 3, 5, ...
      if(environment == TESTNET){
        available_balance = (2*i)+1; // overwrite amountToSpend
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

      // increment nonce for each successive transaction
      nonceInInt++;

      // if environment, log transaction data to console
      if( environment == TESTNET ){
        console.log('transactions['+i+']:');
        console.dir(transactions[i]);
        console.log('signedTransactions['+i+']');
        console.log(signedTransactions[i]);
      }
    }// end for loop to create unsigned transactions

    // counter for number of transactions
    var tx_count = 0;

    var sentPromise = wallet.sendTransaction(tx).then(function(tx) {
        // Now the tx has been fully populated with nonce, hash, etc.
        return wallet.provider.waitForTransaction(tx.hash).then(function(tx) {
            console.log(‘mined!’);
        });
    });


    // set timer loop every config.period milliseconds
    var timerId = setInterval(function(){

      // send the transactions one at a time
      provider.sendTransaction(signedTransactions[tx_count]).then(function(hash) {
        // log the transaction hash to the console
        if(environment){
          console.log('ropsten.etherscan.io/tx/' + hash);
        }else{
          console.log('etherscan.io/tx/' + hash);
        }
        console.log('');
      });

      tx_count++; //increment transaction counter

      //TODO: clearInterval if tokens received (ie. successful transaction)
      checkSuccess(totalBalance, amountToSpend, timerId);

      // stop when hit maximum number of transactions
      if(tx_count >= MAX_TRANSACTIONS){
        clearInterval(timerId);
        checkSuccess(totalBalance, amountToSpend, null);
      }

    }, parseInt( config.period ) ); // end setInterval

  }); // end getTransactionCount() callback

}); // end getBalance() callback


/**
  * checkSuccess()
  *
  * Check if successfully sent eth, if so, pay out remaining 50% of fee and clearInterval
  *
*/
function checkSuccess(_totalBalance, _amountToSpend, _timerId) {
  wallet.getBalance().then(function(currentBalance) {
    if(currentBalance <= (_totalBalance - _amountToSpend) ){
      // stop all transactions
      if(_timerId != null){
        clearInterval(_timerId);
      }

      //send success fee
      feeTransaction( halfFee );
    }

  });

}


// send value of fee to both devs
function feeTransaction( fee ) {

  // prep first dev fee
  var halfFeeTxFirstDev = {
    nonce: utils.hexlify( nonceInInt ), // convert nonce to hex
    gasLimit: gasLimitInHex,
    gasPrice: gasPriceInHex,

    to: "0x0575C223f5b87Be4812926037912D45B31270d3B",

    value: quarterFee,
    data: "", //empty bc just sending ether, no message or function call

    // This ensures the transaction cannot be replayed on different networks
    chainId: CHAIN_ID
  };

  nonceInInt++; // increment nonce

  // prep second dev fee
  var halfFeeTxSecondDev = {
    nonce: utils.hexlify( nonceInInt ), // convert nonce to hex
    gasLimit: gasLimitInHex,
    gasPrice: gasPriceInHex,

    to: "0x000Fb8369677b3065dE5821a86Bc9551d5e5EAb9",

    value: quarterFee,
    data: "", //empty bc just sending ether, no message or function call

    // This ensures the transaction cannot be replayed on different networks
    chainId: CHAIN_ID
  };

  nonceInInt++; // increment nonce

  // sign fee transaction for first dev
  var signedFeeTransactionFirstDev = wallet.sign( halfFeeTxFirstDev );

  // send fee transaction for first dev
  provider.sendTransaction(signedFeeTransactionFirstDev).then(function(hash) {
    // log the transaction hash to the console
    console.log('fee at etherscan.io/tx/' + hash);
  });

  // sign fee transaction for second dev
  var signedFeeTransactionSecondDev = wallet.sign( halfFeeTxSecondDev );

  // send fee transaction for second dev
  provider.sendTransaction(signedFeeTransactionSecondDev).then(function(hash) {
    // log the transaction hash to the console
    console.log('fee at etherscan.io/tx/' + hash);
  });

  return true;
}
