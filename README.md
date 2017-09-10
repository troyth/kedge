# Kedge

A node.js program that gives whitelisted wallets an edge in attempting to purchase Kyber tokens on day 2 of the ICO when purchase amounts are uncapped. This code will allow your wallet to repeatedly send the entire amount of ETH in your wallet to the Kyber crowdsale contract from just prior to the start of day 2 until it has sold out, you have successfully purchased your desired amount of tokens, or you have reached the maximum amount you are willing to spend on transaction fees.


## Problem
Kyber is doing a two phase ICO. Both phases are only for whitelisted wallets that have completed a Know Your Customer (KYC) process that reveals the wallet owner's official government identity. Phase 1 will likely have a very small personal cap (by the standards of major investors), the amount of which is dependent on the number of successful KYC applicants. Due to this small cap and the identity of the purchaser being tied to KYC, a traditional buyer pool is disincentivized because there is not enough funds to go around for many investors under a single cap and the KYC applicant may be liable for taxes on the entire purchase amount.

Phase 2, beginning on day 2, is uncapped, but all transactions are limited to a 50 gwei gas price, so whales cannot just amp up the gas price to be first in line. The result is that all whitelisted wallets wishing to purchase beyond their day 1 personal cap will be in a mad dash to send Ether to the Kyber crowdsale contract as soon as day 2 begins.


## Opportunity
Because the gas price is capped, the success of a purchase on day 2 can be augmented by sending multiple transactions in quick succession as soon as day 2 starts. The Kedge program allows you to repeatedly attempt to buy Kyber tokens in fast succession the moment the Kyber crowdsale contract begins accepting requests.


## Parameters
You will have to edit the code in config.json to update the parameters below. This is explained below in [Set up]() step 4. The only parameters you **must** update are `private_key` and `kyber_crowdsale_contract_address`, all others can be set by default. That said, you should read all the parameters and understand their defaults so you are not surprised if the program stops attempting to buy before being successful or your attempts cost you more than you were expecting.

**Warning: if you accidentally publish or share your `private_key`, ANYONE can steal all of your funds. If you are using Github, I have set the .gitignore file to NOT upload your config.json file with your `private_key` to the Github cloud. If you are using another public cloud service to store this code, I suggest not syncing the config.json file to the could, as it could get hacked and you could lose everything. Only edit your local version of config.json with your `private_key` to be safe.**

* `private_key`: replace this with the private key of your whitelisted wallet (be sure to replace all the alphanumeric characters between the quotes but leave the quotes in place). For the Kyber token sale, you will have had to complete a whitelist and KYC process with a specific public address. This field is *not* for that public address, it is for the private key only. If you set up your wallet with another security method (like mnemonic phrase or keystore file and password), you can use [myetherwallet.com](https://www.myetherwallet.com/#view-wallet-info) to find your private key by logging in with the method you have available, and then printing a paper wallet. The private key will be in the PDF you generate.
* `kyber_crowdsale_contract_address`: this is the ethereum address of the Kyber crowdsale contract. **You should check this very diligently and confirm that it is the same as that officially advertised by official Kyber channels. This is the address that you will send your ETH to on day 2 of the ICO, so if it is wrong, your ETH will go to someone else or be lost forever.** I will try to update this when Kyber announces it, but be diligent and check yourself.
* `max_spend`: this is the maximum amount you are willing to spend on transaction fees in wei (1 ETH = 1000000000000000000 wei; you can use [this website](https://etherconverter.online/) to compute wei in terms of ether). Default is 2000000000000000000, which is equal to 2 ETH. Once this much has been spent, the program will abort even if you did not already successfully purchase Kyber tokens, so be thoughtful about how much you are willing to risk.
* `timein`: this is the amount of time in milliseconds (ms) that you want to start attempting to call the buy() function before the day 2 period officially starts. Because the ethereum network blocktime is slightly different for each block (currently, it's about 24.5 seconds, or 24500 ms), it may be beneficial to start attempting to call the buy() function even before the official start time, as your transaction may not reach the Kyber crowdsale contract until after the official start time begins. Default is 24500 ms.
* `period`: this is the time between each successive attempt to call the buy() function in milliseconds (ms). The shorter your period, the more quickly the Kedge program will attempt to call the buy() function, which will cost you more and may arrive at your `max_spend` cap very quickly. Default is 100 ms, which is 10 calls per second.
* `gas_price`: the maximum gas price that the Kyber crowdsale contract allows is 50 gwei. This parameter allows you to set any value you like for the gas price of your transaction, but it is recommended to leave it at the default of 50 gwei. The parameter is measured in wei, so the default value is 50000000000.
* `gas_limit`: this is the maximum number of gas units (priced at `gas_price` wei) that you are willing to spend for each transaction attempt. 250,000 gwei is a standard high value. This parameter is measured in wei, so the default value is 250000000000000.
* `test_address`: this is an ethereum address (it looks like 0x###...###) of another wallet you own that you can use to test the program.


## Instructions
### Preparation (do this well before day 2 of the crowdsale starts)
This will set things up on your computer so you are ready for the rush at the beginning of day 2. Do these steps as far in advance as possible so you are not stressed and are fully tested in advance.

#### Set Up
1.  install node.js
2.  install git and clone the Kedge repository to your local computer; **or** just download the zip file of this repository
3.  open the config.json file in a plain text editor (**Do not use Word.** Use a computer code editor like Atom or Sublime Text, which you can download for free. If you do not have these, use Notepad on a PC or textedit on a Mac.) and update the `private_key` to match that of the wallet you whitelisted and any other parameters you would like to customize

#### Test Run (required)
*These instructions will be for Mac and Linux users. Windows/PC users should look at the nodejs.org website to see how to interact with node on their operating system. I believe you should do it through the Command Prompt, and the syntax may be the same, but I'm not sure.**

1.  open a command line interface (the Terminal app on a Mac)
2.  move into the directory where you stored the Kedge repository (use the `cd` command)
3.  type: `node confirm`

This should output a list of all the parameters you set in the `config.json` file. If it does, your node.js installation was successful, and so were your edits to the `config.json` file.

#### Test Send (optional but recommended)
**This will cost you ETH, but not a lot.** The objective here is to attempt to send a very small amount of ETH from the wallet associated with the private key you entered (ie. your whitelisted wallet) to another wallet you own to make sure it is working. The test send will send 0.000000000000000001 ether, then 0.000000000000000003 ether, then 0.000000000000000005 ether to the wallet with the address you declare in quick succession.

1.  set the `test_address` parameter in the `config.json` file to be the address of another ethereum wallet you own (you can easily and freely create one using [myetherwallet.com](https://www.myetherwallet.com/).\)
open a command line interface (the Terminal app on a Mac)
2.  move into the directory where you stored the Kedge repository (use the `cd` command)
3.  type: `node test`
4.  go to etherscan.io/address/`test_address` to see if the very small amounts were received, in which order, and when (it will take a few moments for the new transactions to appear)

If it worked, then you are good to go. Else, you'll have to contact me to help troubleshoot (you can find me in a number of crypto slack teams @troyth).


### Beginning of Day 2 (do this moments before day 2 of the crowdsale starts)

1.  Load your whitelisted wallet with exactly the amount of Ether you want to spend on purchasing Kyber tokens.
2.  


## Fee
The cost of using this program is 0.5% of the total value of ETH you are trying to invest. A transfer function is called that sends this amount to the Kedge developers' Ethereum wallet only on the very first transaction attempt and then it is disabled. If you run the program itself multiple times, the fee will be sent with each first transaction (ie. if you use it for other ICOs that use a similar structure). The test run does not cost anything.
