import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";

describe("marketplace test", function () {
  let marketplaceContract: Contract;
  let niceErc721Contract: Contract, niceErc1155Contract: Contract;
  let owner: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress;
  const testPrice = ethers.utils.parseEther("0.1");
  const testMetadataUri = "http://test.com";
  const testName = "Token";
  const item1Id = 0;
  const testBid1 = ethers.utils.parseEther("0.01");
  const testBid2 = ethers.utils.parseEther("0.03");
  const testBid3 = ethers.utils.parseEther("0.05");

  const auctionTime = 60 * 60 * 24 * 3;

  enum ProtocolType {
    ERC721 = 0,
    ERC1155 = 1
}

  this.beforeEach(async () => {
    const NiceErc721 = await ethers.getContractFactory("NiceErc721");
    niceErc721Contract = await NiceErc721.deploy();
    await niceErc721Contract.deployed();

    const NiceErc1155 = await ethers.getContractFactory("NiceErc1155");
    niceErc1155Contract = await NiceErc1155.deploy();
    await niceErc1155Contract.deployed();

    const marketplace = await ethers.getContractFactory("Marketplace");
    marketplaceContract = await marketplace.deploy(niceErc721Contract.address, niceErc1155Contract.address);
    await marketplaceContract.deployed();
    [owner, user1, user2] = await ethers.getSigners();
  })

  it("Test marketplace ERC721 item creation", async () => {
    const createTransaction = await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    const rc = await createTransaction.wait();
    const itemCreatedEvent = rc.events.find((e: {event: string}) => e.event == "ItemCreated");
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = itemCreatedEvent!.args;
    expect(itemId).to.equal(item1Id);
    expect(price).to.equal(testPrice);
    expect(name).to.equal(testName);
    expect(itemOwner).to.equal(owner.address);
    expect(itemProtocolType).to.equal(ProtocolType.ERC721);
    expect(isAvailable).to.equal(false);
  });

  it("Test marketplace ERC1155 item creation", async () => {
    const createTransaction = await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC1155);
    const rc = await createTransaction.wait();
    const itemCreatedEvent = rc.events.find((e: {event: string}) => e.event == "ItemCreated");
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = itemCreatedEvent!.args;
    expect(itemId).to.equal(item1Id);
    expect(price).to.equal(testPrice);
    expect(name).to.equal(testName);
    expect(itemOwner).to.equal(owner.address);
    expect(itemProtocolType).to.equal(ProtocolType.ERC1155);
    expect(isAvailable).to.equal(false);
  });

  it("Test item listing", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    const listTransaction = await marketplaceContract.listItem(item1Id);
    const rc = await listTransaction.wait();
    const listedEvent = rc.events.find((e: {event: string}) => e.event == "ItemListed");
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = listedEvent!.args;
    expect(isAvailable).to.equal(true);
  });

  it("Check that only owner can list a thing", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await expect(marketplaceContract.connect(user1).listItem(item1Id)).to.be.revertedWith("You're not the owner");
  });

  it("Test item buying", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItem(item1Id);

    const initialOwnerBalance = await owner.getBalance();
    const initialUser1Balance = await user1.getBalance();

    const buyTransaction = await marketplaceContract.connect(user1).buyItem(item1Id, {value: testPrice});
    const rc = await buyTransaction.wait();

    const boughtEvent = rc.events.find((e: {event: string}) => e.event == 'ItemBought');
    
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction], prevOwner] = boughtEvent.args;
    expect(itemOwner).to.equal(user1.address);
    expect(prevOwner).to.equal(owner.address);
    expect(isAvailable).to.be.false;

    expect((await owner.getBalance()).gt(initialOwnerBalance));
    expect((await user1.getBalance()).lt(initialUser1Balance));
  });

  it("Check that user cant buy something by a lower price", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItem(item1Id);

    await expect(marketplaceContract.connect(user1).buyItem(item1Id, {value: testPrice.sub(1)})).to.be.revertedWith("Invalid payment sum");
  });

  it("Check that user can buy something by a bigger price", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItem(item1Id);

    const user1BalanceBeforeBuy = await user1.getBalance();

    const priceToPay = testPrice.add(testPrice);
    const buyTransaction = await marketplaceContract.connect(user1).buyItem(item1Id, {value: priceToPay});
    const rc = await buyTransaction.wait();

    const boughtEvent = rc.events.find((e: {event: string}) => e.event == 'ItemBought');
    
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction], prevOwner] = boughtEvent.args;
    expect(itemOwner).to.equal(user1.address);
    expect(user1BalanceBeforeBuy.sub(await user1.getBalance()).lt(priceToPay)).to.be.true;
    expect(user1BalanceBeforeBuy.sub(await user1.getBalance()).gt(testPrice)).to.be.true;

  });

  it("Check that user cant by an unlisted item", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.cancel(item1Id);

    await expect(marketplaceContract.connect(user1).buyItem(item1Id, {value: testPrice.sub(1)})).to.be.revertedWith("Item is not available"); 
  });

  it("Test item unlisting", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItem(item1Id);
    const unlistTransaction = await marketplaceContract.cancel(item1Id);

    const rc = await unlistTransaction.wait();
    const unlistedEvent = rc.events.find((e: {event: string}) => e.event == "ItemUnlisted");
    const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = unlistedEvent!.args;
    expect(isAvailable).to.equal(false);
  });
  
  it("Check that only owner can unlist a thing", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await expect(marketplaceContract.connect(user1).cancel(item1Id)).to.be.revertedWith("You're not the owner");
  });

  it("Test item auction listing", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    const listingTransaction = await marketplaceContract.listItemOnAuction(item1Id);
    const rc = await listingTransaction.wait();
    const listingEvent = rc.events.find((e: {event: string}) => e.event == "AuctionCreated");
    const [
      [auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive], 
      [itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]
    ] = listingEvent.args;

    expect(auctionItemId).to.equal(item1Id);
    expect(topBidder).to.equal("0x0000000000000000000000000000000000000000");
    expect(topBidderSum).to.equal(0);
    expect(bidsNum).to.equal(0);
    expect(deadline.toNumber()).to.be.greaterThan(Date.now() / 1000);
    expect(isActive).to.be.true;
    expect(isInAuction).to.be.true;
    expect(isAvailable).to.be.false;
  });

  it("Check that it's impossible to double list item", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);
    await expect(marketplaceContract.listItemOnAuction(item1Id)).to.be.revertedWith("Item already placed");
  });

  it("Check that it's impossible to double list someone else's item", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await expect(marketplaceContract.connect(user1).listItemOnAuction(item1Id)).to.be.revertedWith("You're not the owner");
  });

  it("Test bid creation", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    const initialUser1Balance = await user1.getBalance();
    
    const bidTransaction = await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    const rc = await bidTransaction.wait();
    const bidEvent = rc.events.find((e: {event: string}) => e.event == "BidMade");
    const [[auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive]] = bidEvent.args;
    expect(topBidder).to.equal(user1.address);
    expect(topBidderSum).to.equal(testBid1);
    expect(bidsNum).to.equal(bidsNum);

    const currentUser1Balance = await user1.getBalance();

    expect(currentUser1Balance.lt(initialUser1Balance.sub(testBid1))).to.be.true;
  });

  it("Test second bid creation", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    const initialUser1Balance = await user1.getBalance();
    const initialUser2Balance = await user2.getBalance();
    
    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    const bidTransaction = await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    const rc = await bidTransaction.wait();
    const bidEvent = rc.events.find((e: {event: string}) => e.event == "BidMade");
    const [[auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive]] = bidEvent.args;

    expect(topBidder).to.equal(user2.address);
    expect(topBidderSum).to.equal(testBid2);
    expect(bidsNum).to.equal(bidsNum);
    expect(initialUser1Balance.sub(await user1.getBalance()).lt(testBid1)).to.be.true;
    expect(initialUser2Balance.sub(await user2.getBalance()).gt(testBid1)).to.be.true;
  });

  it("Check that it's impossible to bid sum that less or equal the top sum", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);
    
    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await expect(marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid1})).to.be.revertedWith("Bid is too low");

  });

  it("Check that it's impossible to list a thing that's placed in auction", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await expect(marketplaceContract.listItem(item1Id)).to.be.revertedWith("Item is placed in auction");
  });

  it("Check that it's impossible to finish auction before deadline", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await expect(marketplaceContract.finishAuction(item1Id)).to.be.revertedWith("Auction is still active");
  });

  it("Check that it's impossible to finish auction if too few bids", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await expect(marketplaceContract.finishAuction(item1Id)).to.be.revertedWith("Too few bidders");
  });

  it("Check that only owner can finish auction", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await expect(marketplaceContract.connect(user1).finishAuction(item1Id)).to.be.revertedWith("You're not the owner");
  });

  it("Check that it's impossible to bid after finish", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await marketplaceContract.finishAuction(item1Id);

    await expect(marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid3})).to.be.revertedWith("Auction finished");
  });

  it("Check that it's impossible to double finish", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await marketplaceContract.finishAuction(item1Id);

    await expect(marketplaceContract.finishAuction(item1Id)).to.be.revertedWith("Auction finished");
  });


  it("Test auction finishing", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    const initialOwnerBalance = await owner.getBalance();

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days
    const finishTransaction = await marketplaceContract.finishAuction(item1Id);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: {event: string}) => e.event == "AuctionFinished");

    const [
      [auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive],
      [itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]
    ] = finishEvent.args;

    expect(isActive).to.be.false;
    expect(itemOwner).to.equal(user2.address);
    expect(isInAuction).to.be.false;

    expect((await owner.getBalance()).gt(initialOwnerBalance)).to.be.true;

  });

  it("Check that it's impossible to cancel auction before deadline", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);
    await expect(marketplaceContract.cancelAuction(item1Id)).to.be.revertedWith("Auction is still active");
  });

  it("Check that only owner can cancel auction", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await expect(marketplaceContract.connect(user1).cancelAuction(item1Id)).to.be.revertedWith("You're not the owner");
  });

  it("Check that it's imposible to cancel auction if it already took place", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});
    await marketplaceContract.connect(user2).makeBid(item1Id, {value: testBid2});

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await expect(marketplaceContract.cancelAuction(item1Id)).to.be.revertedWith("Auction has already taken place");
  });

  it("Check that it's impossible to double cancel", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    await marketplaceContract.cancelAuction(item1Id);

    await expect(marketplaceContract.cancelAuction(item1Id)).to.be.revertedWith("Auction finished");
  });

  it("Test auction canceling if no bidders", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    const finishTransaction = await marketplaceContract.cancelAuction(item1Id);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: {event: string}) => e.event == "AuctionCanceled");

    const [
      [auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive],
      [itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]
    ] = finishEvent.args;

    expect(isActive).to.be.false;
    expect(isInAuction).to.be.false;
    expect(itemOwner).to.equal(owner.address);
  });

  it("Test auction canceling if one bidder", async () => {
    await marketplaceContract.createItem(testMetadataUri, testPrice, testName, ProtocolType.ERC721);
    await marketplaceContract.listItemOnAuction(item1Id);

    await marketplaceContract.connect(user1).makeBid(item1Id, {value: testBid1});

    const user1BalanceAfterBid = await user1.getBalance();

    await network.provider.send("evm_increaseTime", [auctionTime]); // Add 3 days

    const finishTransaction = await marketplaceContract.cancelAuction(item1Id);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: {event: string}) => e.event == "AuctionCanceled");

    const [
      [auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive],
      [itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]
    ] = finishEvent.args;

    expect(isActive).to.be.false;
    expect(isInAuction).to.be.false;
    expect(itemOwner).to.equal(owner.address);
    
    expect((await user1.getBalance()).eq(user1BalanceAfterBid.add(testBid1))).to.be.true;

  });
});
