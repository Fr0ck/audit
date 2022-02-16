import { network, ethers } from 'hardhat';
import { DividenDistributorProxy, DividenDistributorV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/shareReward1.ts
 */
async function main() {
    console.log("Share Reward Mode 1")

    const amount = ethers.utils.parseUnits("1000"); // Change the amount
    const rewarder = await ethers.getNamedSigner('user1');  // Change the rewarder

    const deployer = await ethers.getNamedSigner('deployer'); 
    const dividenDistributorProxy = await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy');
    const dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address);
    const REWARDER_ROLE = await dividenDistributor.REWARDER_ROLE();
    await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder.address);
    await dividenDistributor.connect(rewarder).shareReward({
        value: amount
    })

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
