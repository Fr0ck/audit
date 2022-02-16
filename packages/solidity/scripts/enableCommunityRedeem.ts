import { network, ethers } from 'hardhat';
import {CommunityOffering } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/enableCommunityRedeem.ts
 */
async function main() {
  console.log("Enable Community Redeem")

    const deployer = await ethers.getNamedSigner('deployer');  
    const communityOfferingContract = await ethers.getContract<CommunityOffering>(`CommunityOffering`)
    await communityOfferingContract.connect(deployer).enableRedeem()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
