//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./NiceFT.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Marketplace is ERC1155Holder {

    enum ProtocolType {
        ERC721,
        ERC1155
    }

    struct AuctionItem {
        uint256 topBidderSum;
        uint256 bidsNum;
        uint256 deadline;
        address payable topBidder;
    }

    struct MarketplaceItem {
        uint256 itemId;
        uint256 tokenId;
        uint256 price;
        uint256 amount;
        address payable owner;
        ProtocolType protocolType;
        bool isAvailable;
        bool isInAuction;
        string name;
    }

    event ItemCreated(MarketplaceItem item);
    event ItemListed(MarketplaceItem item);
    event ItemUnlisted(MarketplaceItem item);
    event ItemBought(MarketplaceItem item, address prevOwner);

    event AuctionCreated(AuctionItem auction, MarketplaceItem item);
    event BidMade(AuctionItem auction);
    event AuctionFinished(AuctionItem auction, MarketplaceItem item);
    event AuctionCanceled(AuctionItem auction, MarketplaceItem item);

    uint256 private itemCount;
    uint256 private auctionCount;

    NiceErc721 private niceErc721;
    NiceErc1155 private niceErc1155;

    mapping(uint256 => MarketplaceItem) private marketplaceItems;
    mapping(uint256 => AuctionItem) private auctions;

    constructor (address niceErc721Addr, address niceErc1155Addr) {
        niceErc721 = NiceErc721(niceErc721Addr);
        niceErc1155 = NiceErc1155(niceErc1155Addr);
    }

    function createItem(string memory itemMetadataUri, uint256 price, string memory name, ProtocolType protocolType, uint256 amount) public returns (uint256 itemId) {
        require(amount >= 1, "Amount must be positive");

        itemId = itemCount;
        uint256 tokenId;

        if (protocolType == ProtocolType.ERC721) {
            require(amount == 1, "Erc721 doesn't support amount");
            tokenId = niceErc721.mint(itemMetadataUri);
        } else {
            tokenId = niceErc1155.mint(amount, itemMetadataUri);
        }

        marketplaceItems[itemId] = MarketplaceItem(itemId, tokenId, price, amount, payable(msg.sender), protocolType, false, false, name);
        itemCount++;
        emit ItemCreated(marketplaceItems[itemId]);
    }

    function listItem(uint256 itemId) public {
        require(marketplaceItems[itemId].owner == msg.sender, "You're not the owner");
        require(!marketplaceItems[itemId].isInAuction, "Item is placed in auction");

        marketplaceItems[itemId].isAvailable = true;
        emit ItemListed(marketplaceItems[itemId]);
    }

    function buyItem(uint256 itemId) public payable {
        MarketplaceItem memory item = marketplaceItems[itemId];

        require(item.isAvailable, "Item is not available");
        require(msg.value >= item.price, "Invalid payment sum");

        if(msg.value > item.price) 
            payable(msg.sender).transfer(msg.value - item.price);
        
        item.owner.transfer(item.price);
        address prevOwner = item.owner;
        item.owner = payable(msg.sender);
        item.isAvailable = false;
        emit ItemBought(item, prevOwner);
    }

    function cancel(uint256 itemId) public {
        require(marketplaceItems[itemId].owner == msg.sender, "You're not the owner");
        marketplaceItems[itemId].isAvailable = false;
        emit ItemUnlisted(marketplaceItems[itemId]);
    }

    function listItemOnAuction(uint256 itemId) public {
        require(marketplaceItems[itemId].owner == msg.sender, "You're not the owner");
        require(!marketplaceItems[itemId].isInAuction, "Item already placed");
        
        marketplaceItems[itemId].isInAuction = true;
        marketplaceItems[itemId].isAvailable = false;

        auctions[itemId] = AuctionItem(0, 0, block.timestamp + 3 days, payable(0));
        emit AuctionCreated(auctions[itemId], marketplaceItems[itemId]);
    }

    function makeBid(uint256 itemId) public payable {
        require(marketplaceItems[itemId].isInAuction, "Auction finished");
        require(msg.value > auctions[itemId].topBidderSum, "Bid is too low");
        
        address payable prevBidder = auctions[itemId].topBidder;
        uint256 prevBidderSum = auctions[itemId].topBidderSum;

        auctions[itemId].topBidder = payable(msg.sender);
        auctions[itemId].topBidderSum = msg.value;
        auctions[itemId].bidsNum++;

        if(prevBidder != address(0)) 
            prevBidder.transfer(prevBidderSum);
        
        emit BidMade(auctions[itemId]);
    }

    function finishAuction(uint256 itemId) public {
        require(marketplaceItems[itemId].isInAuction, "Auction finished");
        require(marketplaceItems[itemId].owner == msg.sender, "You're not the owner");
        require(block.timestamp >= auctions[itemId].deadline, "Auction is still active");
        require(auctions[itemId].bidsNum >= 2, "Too few bidders");

        address payable prevOwner = marketplaceItems[itemId].owner;

        marketplaceItems[itemId].isInAuction = false;
        marketplaceItems[itemId].owner = auctions[itemId].topBidder;

        prevOwner.transfer(auctions[itemId].topBidderSum);
        emit AuctionFinished(auctions[itemId], marketplaceItems[itemId]);
    }

    function cancelAuction(uint256 itemId) public {
        require(marketplaceItems[itemId].isInAuction, "Auction finished");
        require(marketplaceItems[itemId].owner == msg.sender, "You're not the owner");
        require(block.timestamp >= auctions[itemId].deadline, "Auction is still active");
        require(auctions[itemId].bidsNum < 2, "Auction has already taken place");

        marketplaceItems[itemId].isInAuction = false;

        if (auctions[itemId].bidsNum > 0) 
            auctions[itemId].topBidder.transfer(auctions[itemId].topBidderSum);
        
        emit AuctionCanceled(auctions[itemId], marketplaceItems[itemId]);
    }
}