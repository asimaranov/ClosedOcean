import { task, types } from "hardhat/config";

task("finishAuction", "Finish the auction")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemId", "Id of item to list", 0, types.int)

    .setAction(async (taskArgs, hre) => {
        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);

        const finishTransaction = await marketplaceContract.finishAuction(taskArgs['itemId']);
        const rc = await finishTransaction.wait();
        const listedEvent = rc!.events!.find(e => e.event == "AuctionFinished");
        const [
            [topBidderSum, bidsNum, deadline, topBidder], 
            [itemId, tokenId, price, amount, itemOwner, itemProtocolType, isAvailable, isInAuction, name]
          ]  = listedEvent!.args!;

        console.log(`Successfully finished. New item owner: ${itemOwner}, top bidder: ${topBidder}, top bidder sum: ${topBidderSum}`)
    });