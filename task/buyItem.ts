import { task, types } from "hardhat/config";

task("buyItem", "Buy marketplace item")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemId", "Id of item to list", 0, types.int)
    .addParam("price", "Price to pay", "0.001")

    .setAction(async (taskArgs, hre) => {
        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);

        const buyTransaction = await marketplaceContract.buyItem(taskArgs['itemId'], {value: hre.ethers.utils.parseEther(taskArgs['price'])});
        const rc = await buyTransaction.wait();
    
        const boughtEvent = rc!.events!.find(e => e.event == 'ItemBought');
        
        const [[itemId, tokenId, price, amount, itemOwner, itemProtocolType, isAvailable, isInAuction, name], prevOwner] = boughtEvent!.args!;
    
        console.log(
            `Item successfully bought. Item id: ${itemId}, item price: ${price}, item name: "${name}", ` +
            `item owner: ${itemOwner}, is available for buying: ${isAvailable}, is in auction: ${isInAuction}`
        );
    });