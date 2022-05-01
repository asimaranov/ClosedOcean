import { ethers } from "hardhat";

async function main() {

  const NiceFt721 = await ethers.getContractFactory("NiceErc721");
  const niceFt721 = await NiceFt721.deploy();

  const NiceFt1155 = await ethers.getContractFactory("NiceErc1155");
  const niceFt1155 = await NiceFt1155.deploy();


  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(niceFt721.address, niceFt1155.address);

  await marketplace.deployed();

  console.log(`Marketplace deployed to: ${marketplace.address}, niceft721 deployed to: ${niceFt721.address}, niceft1155 deployed to: ${niceFt1155.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
