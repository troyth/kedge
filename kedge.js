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

var fee = 0; // instantiate dev fee
var halfFee = 0; // fee is split into upfront and after success

var availableBalance = 0; // maximum amount of ETH to purchase tokens with (measured in wei)

var gasLimitInGwei = utils.bigNumberify( config.gas_limit ); // gas limit in safe Big Number format
var gasPriceInGwei = utils.bigNumberify( config.gas_price ); // gas price in safe Big Number format
var maxSpendInWei = utils.bigNumberify( config.max_spend ); // maximum transaction spend in Big Number format

var gasLimitInHex = utils.hexlify( gasLimitInGwei );
var gasPriceInHex = utils.hexlify( gasPriceInGwei );

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
  MAX_TRANSACTIONS = utils.bigNumberify( 3 );
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
wallet.getBalance().then(function(totalBalance) {
  // totalBalance is a BigNumber in wei of the total balance of the wallet
  console.log("totalBalance: " + totalBalance);

  // subtract max_spend param and fees from total balance to ensure transactions don't run out of gas
  if(!testnet){
    availableBalance = totalBalance.sub( config.max_spend );
    fee = availableBalance.div( 100 );
    availableBalance = availableBalance.sub( fee );
    console.log("availableBalance: " + availableBalance);
  }

  // need to get the nonce first, so wrap the entire operation in the nonce callback
  wallet.getTransactionCount().then(function( nonceInInt ){

    // account for fee transactions
    var startIndex = 0; // nonce offset
    var upfrontFeePaid = false; // upfront fee paid flag
    var successFeePaid = false; // success fee paid flag

    // pay 50% fee upfront
    if(!testnet){
      halfFee = fee.div( 2 );
      upfrontFeePaid = feeTransaction( halfFee ); // pay upfront fee

      MAX_TRANSACTIONS = MAX_TRANSACTIONS.sub( 4 ); // two up front, two after success
      nonceInInt = nonceInInt + 2; // increment the nonce
    }

    var transactions = []; // instantiate array of transaction parameter objects
    var signedTransactions = []; // instantiate array of signed transactions
    var amountToSpend = availableBalance; // set amount of ether to send in wei

    // create MAX_TRANSACTIONS number of unsigned transactions with increasing odd values
    for(var i = 0; i < MAX_TRANSACTIONS; i++){

      // if testing, send odd number of wei starting with 1, 3, 5, ...
      if(testnet){
        amountToSpend = (2*i)+1; // overwrite amountToSpend
      }

      // set up transaction parameters
      transactions[i] = {
        nonce: utils.hexlify( nonceInInt ), // convert nonce to hex
        gasLimit: gasLimitInHex,
        gasPrice: gasPriceInHex,
        to: config.test_address,
        value: amountToSpend, //1, 3, 5, ... in wei for test; availableBalance for live
        data: "", //empty bc just sending ether, no message or function call
        chainId: CHAIN_ID // This ensures the transaction cannot be replayed on different networks
      };

      // sign each transaction with wallet private key
      signedTransactions[i] = wallet.sign( transactions[i] );

      // increment nonce for each successive transaction
      nonceInInt++;

      // if testing, log transaction data to console
      if(testnet){
        console.log('transactions['+i+']:');
        console.dir(transactions[i]);
        console.log('signedTransactions['+i+']');
        console.log(signedTransactions[i]);
      }
    }// end for loop to create unsigned transactions

    // counter for number of transactions
    var tx_count = 0;

    // set timer loop every config.period milliseconds
    var timerId = setInterval(function(){

      // send the transactions one at a time
      provider.sendTransaction(signedTransactions[tx_count]).then(function(hash) {
        // log the transaction hash to the console
        if(testnet){
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
