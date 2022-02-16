import { network, ethers } from 'hardhat';
import { FairPriceLaunch } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/enableFairLaunchSales.ts
 */
async function main() {
  console.log("Enable Fair Sales")

    const deployer = await ethers.getNamedSigner('deployer');  
    const fairLaunch = await ethers.getContract<FairPriceLaunch>(`FairPriceLaunch`)
    await fairLaunch.connect(deployer).enableSale()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
