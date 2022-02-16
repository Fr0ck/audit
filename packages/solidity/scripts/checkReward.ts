import { network, ethers } from 'hardhat';
import { DividenDistributorProxy, DividenDistributorV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/checkReward.ts
 */
async function main() {
    console.log("Check Reward")

    const rewardId = 0; // Id of Reward

    const user = await ethers.getNamedSigner('deployer'); 
    const dividenDistributorProxy = await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy');
    const dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address);

    const reward = await dividenDistributor.connect(user).rewards(rewardId)
    const rewardAmount = reward[0];        
    const totalClaimed = reward[1];
    const issuedAt = reward[2];
    const snapshotId = reward[3];  
    const totalExcludedFromSupply = reward[4];      
    const rewardSource = reward[5];  

    console.log(`rewardAmount: ${ethers.utils.formatUnits(rewardAmount)} FTM`);
    console.log(`totalClaimed: ${ethers.utils.formatUnits(totalClaimed)} FTM`);
    console.log(`issuedAt: ${issuedAt}`);
    console.log(`snapshotId: ${snapshotId}`);
    console.log(`totalExcludedFromSupply: ${ethers.utils.formatUnits(totalExcludedFromSupply, 9)}`);
    console.log(`rewardSource: ${rewardSource}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
