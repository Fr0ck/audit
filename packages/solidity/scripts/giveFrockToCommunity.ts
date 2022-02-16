import { network, ethers } from 'hardhat';
import { CommunityOffering, FrockProxy, FrockTokenV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/giveFrockToCommunity.ts
 */
async function main() {
  console.log("Gove Frock to Community Contract")

    const deployer = await ethers.getNamedSigner('deployer');  
    const communityOfferingContract = await ethers.getContract<CommunityOffering>(`CommunityOffering`)
    
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         

    await frock.connect(deployer).transfer(communityOfferingContract.address, ethers.utils.parseUnits("1250", 9));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
