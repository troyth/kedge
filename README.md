# Kedge

A node.js program that gives whitelisted wallets an edge in attempting to purchase Kyber tokens on day 2 of the ICO when purchase amounts are uncapped. This code will allow your wallet to repeatedly send the entire amount of ETH in your wallet (minus transaction and developer fees) to the Kyber crowdsale contract from just prior to the start of day 2 until: (1) it has sold out, or (2) you have successfully purchased your desired amount of tokens, or (3) you have reached the maximum amount you are willing to spend on transaction fees.

## Tl;dr
Don't care about the details? Just skip to the instructions.

## Problem
Kyber is doing a two phase ICO. Both phases are only for whitelisted wallets that have completed a Know Your Customer (KYC) process that reveals the wallet owner's official government identity. Phase 1 will likely have a very small personal cap (by the standards of major investors), the amount of which is dependent on the number of successful KYC applicants. Due to this small cap and the identity of the purchaser being tied to KYC, a traditional buyer pool is disincentivized because there is not enough funds to go around for many investors under a single cap and the KYC applicant may be liable for taxes on the entire purchase amount.

Phase 2, beginning on day 2, is uncapped, but all transactions are limited to a 50 gwei gas price, so whales cannot just amp up the gas price to be first in line. The result is that all whitelisted wallets wishing to purchase beyond their day 1 personal cap will be in a mad dash to send Ether to the Kyber crowdsale contract as soon as day 2 begins.


## Opportunity
Because the gas price is capped, the success of a purchase on day 2 can be augmented by sending multiple transactions in quick succession as soon as day 2 starts. The Kedge program allows you to repeatedly attempt to buy Kyber tokens in fast succession the moment the Kyber crowdsale contract begins accepting requests.

## Strategy
### Assumptions
This strategy works on the following understanding of mining algorithms. If you feel this is not the case, please add your comments in the issues list.

The gas cost of a transaction is fixed by the byte code of the transaction itself and the standardized cost of each operation code therein. For Kyber, this is a simple transfer of ETH from one account to another, which is fixed at `21000 wei`. The gas price is limited to `50 gwei`, so a miner can only hope to earn a reward of `50 gwei * 21000 wei`, or `gas_price * gas_cost` if they include your transaction.

Now, ["it's time for some game theory."](http://knowyourmeme.com/memes/it-s-time-for-some-game-theory) Miners are incentivized to select the transactions that will maximize their block rewards. The standard way of ensuring that your transaction is successful is to crank up the `gas_price`, but Kyber rejects any transaction above `50 gwei`, so that doesn't apply here. Kedge applies a two-part strategy of finding the right `gas_limit` and then spamming your transaction to the network until it is, hopefully, successful.

Miners use the following formula to determine their total potential reward on a block:

```
reward = max(BLOCK_GAS_LIMIT, SUM(transaction_fee_by_limit))
```

`BLOCK_GAS_LIMIT ` is set by the Ethereum network (currently ~6.7M gas) as a limit to the size of each block, so miners cannot exceed this. To do so, they have to choose from the entire pool of transactions which to include in their block such that they fall below the `BLOCK_GAS_LIMIT` and maximize their reward. Miners do this by choosing a combination of the highest `gas_price` and lowest `gas_limit`, as they have to refund any unused gas.


### Mining Strategy
#### Geth
Geth comes pre-installed with a single default mining strategy, but leaves two other options commented out of their code, which would be easy for a savvy enough miner to recover and implement:

```
/* //approach 1
	transactions := self.eth.TxPool().GetTransactions()
	sort.Sort(types.TxByNonce(transactions))
	*/

	//approach 2
	transactions := self.eth.TxPool().GetTransactions()
	types.SortByPriceAndNonce(transactions)

	/* // approach 3
	// commit transactions for this run.
	txPerOwner := make(map[common.Address]types.Transactions)
	// Sort transactions by owner
	for _, tx := range self.eth.TxPool().GetTransactions() {
		from, _ := tx.From() // we can ignore the sender error
		txPerOwner[from] = append(txPerOwner[from], tx)
	}
	var (
		singleTxOwner types.Transactions
		multiTxOwner  types.Transactions
	)
	// Categorise transactions by
	// 1. 1 owner tx per block
	// 2. multi txs owner per block
	for _, txs := range txPerOwner {
		if len(txs) == 1 {
			singleTxOwner = append(singleTxOwner, txs[0])
		} else {
			multiTxOwner = append(multiTxOwner, txs...)
		}
	}
	sort.Sort(types.TxByPrice(singleTxOwner))
	sort.Sort(types.TxByNonce(multiTxOwner))
	transactions := append(singleTxOwner, multiTxOwner...)
	*/
```

The default option is super simple: it just sorts by gas price and nonce (the order in which transactions are signed by the transacting wallet). The only potential problem here is that the third option, which is commented out, would prioritize wallets that send a single transaction per block, which is a liability for spamming.

#### Parity
Parity offers it's users the option of choosing from 5 strategies as command line arguments:

```
--tx-queue-strategy S          Prioritization strategy used to order transactions
                                in the queue. S may be:
                                gas - Prioritize txs with low gas limit;
                                gas_price - Prioritize txs with high gas price;
                                gas_factor - Prioritize txs using gas price
                                and gas limit ratio (default: gas_price).
```
[Source](https://github.com/paritytech/parity/blob/e9abcb2f6d9d5a4a451beb61de7c85e793ea71f3/ethcore/src/miner/transaction_queue.rs#L235)

The default is to sort by `gas_price` alone, though another option favors the lowest `gas_limit`. All to say, these are both aligned with the Kedge protocol.

That said, this is only a guess as to what miners are actually implementing. Best to test...


### Testing

I am currently doing testing on the Ropsten testnet. The gas cost has consistently been `59763`. You can see the contract and results here: https://ropsten.etherscan.io/address/0x972b4a9bcf20e04ee1d99be6bd0e23c48f6d19af


## Parameters
You will have to edit the code in config.json to update the parameters below. This is explained below in [Set up]() step 4. The only parameters you **must** update are `private_key` and `crowdsale_contract_address`, all others can be set by default. That said, you should read all the parameters and understand their defaults so you are not surprised if the program stops attempting to buy before being successful or your attempts cost you more than you were expecting.

**Warning: if you accidentally publish or share your `private_key`, ANYONE can steal all of your funds. If you are using Github, I have set the .gitignore file to NOT upload your config.json file with your `private_key` to the Github cloud. If you are using another public cloud service to store this code, I suggest not syncing the config.json file to the could, as it could get hacked and you could lose everything. Only edit your local version of config.json with your `private_key` to be safe.**

* `private_key`: replace this with the private key of your whitelisted wallet (be sure to replace all the alphanumeric characters between the quotes but leave the quotes in place, but **do not** include any 0x prefix). For the Kyber token sale, you will have had to complete a whitelist and KYC process with a specific public address. This field is *not* for that public address, it is for the private key only. If you set up your wallet with another security method (like mnemonic phrase or keystore file and password), you can use [myetherwallet.com](https://www.myetherwallet.com/#view-wallet-info) to find your private key by logging in with the method you have available, and then printing a paper wallet. The private key will be in the PDF you generate.
* `crowdsale_contract_address`: this is the ethereum address of the Kyber crowdsale contract. **You should check this very diligently and confirm that it is the same as that officially advertised by official Kyber channels. This is the address that you will send your ETH to on day 2 of the ICO, so if it is wrong, your ETH will go to someone else or be lost forever.** I will try to update this when Kyber announces it, but be diligent and check yourself.
* `max_tx_cost`: this is the maximum amount you are willing to spend on transaction fees in wei (1 ETH = 1000000000000000000 wei; you can use [this website](https://etherconverter.online/) to compute wei in terms of ether). If you leave the default `gas_price` and `gas_limit`, the cost of a transaction will be 3500000000000000. Default is 84000000000000000, which is equal to 0.084 ETH, and will allow for 24 transactions. Once this much has been spent, the program will abort even if you did not already successfully purchase Kyber tokens, so be thoughtful about how much you are willing to risk.
* `time_buffer`: this is the amount of time in milliseconds (ms) that you want to start attempting to call the buy() function before the day 2 period officially starts. Because the ethereum network blocktime is slightly different for each block (currently, it's about 24.5 seconds, or 24500 ms), it may be beneficial to start attempting to call the buy() function even before the official start time, as your transaction may not reach the Kyber crowdsale contract until after the official start time begins. Default is 24500 ms.
* `period`: this is the time between each successive attempt to call the buy() function in milliseconds (ms). The shorter your period, the more quickly the Kedge program will attempt to call the buy() function, which will cost you more and may arrive at your `max_tx_cost` cap very quickly. Default is 100 ms, which is 10 calls per second.
* `gas_price`: the maximum gas price that the Kyber crowdsale contract allows is 50 gwei. This parameter allows you to set any value you like for the gas price of your transaction, but it is recommended to leave it at the default of 50 gwei. The parameter is measured in wei, so the default value is 50000000000.
* `gas_limit`: this is the maximum number of gas units (priced at `gas_price` wei) that you are willing to spend for each transaction attempt. Kyber suggests 150,000 gas. Testing a slightly edited version of the final contract on the Ropsten testnet revealed a gas cost of 59,763. Default here is 70,000.
* `test_contract_address`: this is the ethereum address of a text Kyber contract on the Ropsten testnet that you can use to test the program.
* `test_private_key`: this is the private key of a wallet you own on the Ropsten testnet that you can use to test the program.


## Instructions
### Preparation (do this well before day 2 of the crowdsale starts)
This will set things up on your computer so you are ready for the rush at the beginning of day 2. Do these steps as far in advance as possible so you are not stressed and are fully tested in advance.

#### Set Up
1.  install node.js and npm
2.  install git and clone the Kedge repository to your local computer; **or** just download the zip file of this repository
3.  move into the directory where you stored the Kedge repository (use the `cd` command) and type: `npm install`
4.  open the `config.json` file in a plain text editor (**Do not use Word.** Use a computer code editor like Atom or Sublime Text, which you can download for free. If you do not have these, use Notepad on a PC or textedit on a Mac.) and update the `private_key` to match that of the wallet you whitelisted and any other parameters you would like to customize (*Note: I am currently testing the best `gas_limit` and will update the default parameter in a future version.*)

#### Confirm Installation (optional but recommended)
*These instructions will be for Mac and Linux users. Windows/PC users should look at the nodejs.org website to see how to interact with node on their operating system. I believe you should do it through the Command Prompt, and the syntax may be the same, but I'm not sure.**

1.  open a command line interface (the Terminal app on a Mac)
2.  move into the directory where you stored the Kedge repository (use the `cd` command)
3.  type: `node kedge -confirm`

This should output the public address of your wallet and a list of all the parameters you set in the `config.json` file. If it does, your node.js installation was successful, and so were your edits to the `config.json` file.

#### Test Send (optional but recommended)
You can test the program on the Ropsten testnet by pasting the private key of a Ropsten testnet wallet you may have into the `test_private_key` parameter in the `config.json` file and running the program with:

```
node kedge -test
```

If it worked, then you are good to go. Else, you'll have to contact me to help troubleshoot (you can find me in a number of crypto slack teams @troyth). Note, in the terminal window, a link to each transaction on the etherscan network will be printed, which you can copy-paste into a browser to check on.

### Beginning of Day 2 (do this moments before day 2 of the crowdsale starts)

1.  Load your whitelisted wallet with exactly the amount of Ether you determined in the process above.
2.  Open terminal (on Mac) and type the startup command and press enter:

```
node kedge
```

3.	Watch your wallet on etherscan to see if it worked (don't stop the program until it closes out, or you are sure you have not been successful)


## Fee
The cost of using this program is 1% of the total value of ETH you are trying to invest. A transfer function is called that sends this amount to the Kedge developers's Ethereum wallets only if you successfully transfer ETH to the target contract.
