import { task } from "hardhat/config";

enum ProtocolType {
    ERC721 = 0,
    ERC1155 = 1
}

task("createItem", "Creates new marketplace item")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemMetadataUri", "Item metadata uri", "ipfs://QmWkyzTp1DwfeL7BDuUsKjGVAsudDs8zzsKCzaR9qE4pwp")
    .addParam("price", "Price of item, eth", "0.001")
    .addParam("name", "Name of item", "Test item 1")
    .addParam("protocolType", "Type of nft protocol to be used. ERC721/ERC1155", "ERC721")

    .setAction(async (taskArgs, hre) => {

        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);
        
        const ethPrice = hre.ethers.utils.parseEther(taskArgs['price']);
        const protocol = taskArgs['protocolType'] == "ERC721" ? ProtocolType.ERC721 : ProtocolType.ERC1155;

        const createTransaction = await marketplaceContract.createItem(
            taskArgs['itemMetadataUri'], 
            ethPrice, 
            taskArgs['name'], 
            protocol
        );
        
        const rc = await createTransaction.wait();
        const itemCreatedEvent = rc!.events!.find(e => e.event == "ItemCreated");
        const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = itemCreatedEvent!.args!;

        console.log(
            `Created new nft item. Item id: ${itemId}, item price: ${price}, item name: "${name}", ` +
            `item owner: ${itemOwner}, item protocol type: ${ProtocolType[itemProtocolType]}, is available for buying: ${isAvailable}, is in auction: ${isInAuction}`
        );
    });