import { network, ethers } from 'hardhat';
import {CommunityOffering } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/whitelist.ts --address [your_address]
 */
async function main() {
    console.log("Whitelist")

    let args = process.argv.slice(2);

    if(args && args[0] === "--address" && args[1] ) {
        const holder = args[1]         
       
        const deployer = await ethers.getNamedSigner('deployer');      
        const communityOffering = await ethers.getContract<CommunityOffering>(`CommunityOffering`)
        await communityOffering.connect(deployer).addWhitelist(holder)

        console.log(`Address ${holder} is whitelisted`)

    }

    
    

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
