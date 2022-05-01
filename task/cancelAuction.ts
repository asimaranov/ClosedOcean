import { task, types } from "hardhat/config";

task("cancelAuction", "Finish the auction")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemId", "Id of item to list", 0, types.int)

    .setAction(async (taskArgs, hre) => {
        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);

        const cancelTransaction = await marketplaceContract.cancelAuction(taskArgs['itemId']);
        const rc = await cancelTransaction.wait();
        const canceledEvent = rc!.events!.find(e => e.event == "AuctionCanceled");
        const [
            [auctionItemId, topBidder, topBidderSum, bidsNum, deadline, isActive], 
            [itemId, tokenId, price, name, itemOwner, itemProtocolType, isAvailable, isInAuction]
          ]  = canceledEvent!.args!;

        console.log(`Successfully cancelled. New item owner: ${itemOwner}`)
    });
