import { task, types } from "hardhat/config";

task("makeBid", "Make a bid")
    .addParam("contractAddr", "Address of the deployed auction contract", "0x9FdC46ef40da210F33CaDFcc6176178EdB934d4B")
    .addParam("itemId", "Id of item to list", 0, types.int)
    .addParam("bidSum", "Sum to bid", "0.01", types.int)

    .setAction(async (taskArgs, hre) => {
        const marketplaceContract = await hre.ethers.getContractAt("Marketplace", taskArgs['contractAddr']);

        const bidTransaction = await marketplaceContract.makeBid(taskArgs['itemId'], {value: hre.ethers.utils.parseEther(taskArgs['bidSum'])});
        const rc = await bidTransaction.wait();
        const listedEvent = rc!.events!.find(e => e.event == "BidMade");
        const [
            [topBidderSum, bidsNum, deadline, topBidder], 
          ]  = listedEvent!.args!;

        console.log(`Successfully bidded`)
    });