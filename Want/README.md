# Want

Want allows for a nearly-trustless way of using an existing privately held Ethereum wallet like a pooling contract for group token buying. This is useful if a crowdsale contract, such as Wanchain, doesn't allow for purchasing by contracts.

## Identifying the Use Case
If a the crowdsale contract of the token you are trying to purchase contains code like that pasted below, it will not accept purchases from contracts, only from individually held wallets:

```
/// @dev Internal function to determine if an address is a contract
/// @param _addr The address being queried
/// @return True if `_addr` is a contract
function isContract(address _addr) constant internal returns(bool) {
   uint size;
   if (_addr == 0) return false;
   assembly {
       size := extcodesize(_addr)
   }
   return size > 0;
}
```
Source: [Wanchain Github](https://github.com/wanchain/wanchain-token/blob/master/contracts/WanchainContribution.sol)

## Strategy
The strategy of Want is to chain together a cintix-style ICO Buyer pooling contract, `WanBuyer`, with a personal wallet that is controlled by `Wapp`, a node.js app. It works like this:

1.  Someone (call them `owner`) creates a fresh wallet (call it `wallet`) and uses it to sign up for a whitelist
2.  The developer of Want (call them `developer`) will deploy the `WanBuyer` contract on the Ethereum blockchain and connect it to the `wallet`
3.  Interested investors (call them `investors`) send ETH to the `WanBuyer` contract, which records their contributions
4.  Just prior to the crowdsale, the `WanBuyer` contract is closed to new contributions, the `developer` starts up `Wapp` on a public cloud, and the `owner` inputs the `private_key` of the `wallet` using the `Wapp` interface
5.  When the crowdsale starts, `Wapp` will interact with `WanBuyer` by sending a small and random amount of ETH to the `wallet`. As soon as it detects that that amount has been recieved, it will control the `wallet` to send those funds to the crowdsale contract.
6.  If that first amount was successfully sent to the crowdsale contract and not intercepted by the `owner`, the process will repeat with larger random amount of ETH, over and over until the entire amount has been contributed.
7.  `Wapp` will monitor the `wallet` for the receipt of Wanchain tokens. As soon as they arrive, it will send the entire amount to the `WanBuyer` contract, which will distribute them according to the amount that each of the `investors` contributed.



### Fee
A 1% fee will be evenly split between the developer of this code and the `owner` who signs up for the whitelist.
