# ClosedOcean

This project contains implemenation nft marketplace with auction functionality. 

The project comes with the marketplace contract, simple token contracts, test for those contracts, scripts that deploys those contracts and task implementations. 

## Contract addresses
- Rinkeby: `0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B`

## Verification
- Rinkeby: https://rinkeby.etherscan.io/address/0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B#code

## How to deploy

```shell
npx hardhat run scripts/deploy.ts --network rinkeby
```

## How to verify

```shell
npx hardhat verify 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B 0x73BFFD3CbA87b3B53Bb5d3536732EdDaAeFA6F19 0x572af55581FA813dCafA247058A24cA16671F77a  --network rinkeby
```

## How to create item

```shell
npx hardhat createItem --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-metadata-uri ipfs://QmWkyzTp1DwfeL7BDuUsKjGVAsudDs8zzsKCzaR9qE4pwp --price 0.01 --name "Test Item" --protocolType ERC721 --network rinkeby
```

## How to list item

```shell
npx hardhat listItem --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --network rinkeby
```

## How to buy item

```shell
npx hardhat buyItem --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --price 0.01 --network rinkeby
```

## How to unlist/cancel item

```shell
npx hardhat unlist --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --network rinkeby
```

## How to list item on auction

```shell
npx hardhat listItemOnAuction --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --network rinkeby
```

## How to make a bid

```shell
npx hardhat listItemOnAuction --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --bid-sum 0.001 --network rinkeby
```

## How to finish auction

```shell
npx hardhat finishAuction --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --network rinkeby
```

## How to cancel auction

```shell
npx hardhat cancelAuction --contract-addr 0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B --item-id 0 --network rinkeby
```
