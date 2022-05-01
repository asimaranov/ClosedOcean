import { task, types } from "hardhat/config";

task("listItem", "Lists item on the marketplace")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemId", "Id of item to list", 0, types.int)

    .setAction(async (taskArgs, hre) => {
        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);

        const listTransaction = await marketplaceContract.listItem(taskArgs['itemId']);
        const rc = await listTransaction.wait();
        const listedEvent = rc!.events!.find(e => e.event == "ItemListed");
        const [[itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]] = listedEvent!.args!;

        console.log(`Successfully listed. Is available for buying: ${isAvailable}`)
    });