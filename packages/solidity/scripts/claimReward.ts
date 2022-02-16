import { network, ethers } from 'hardhat';
import { DividenDistributorProxy, DividenDistributorV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/claimReward.ts
 */
async function main() {
    console.log("Claim Reward")

    const rewardId = 0; // Id of Reward
    const user = await ethers.getNamedSigner('deployer');  // Change the user

    const dividenDistributorProxy = await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy');
    const dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address);

    await dividenDistributor.connect(user).claimReward(rewardId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
