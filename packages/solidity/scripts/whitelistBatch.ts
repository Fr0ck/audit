import { network, ethers } from 'hardhat';
import {CommunityOffering } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/whitelistBatch.ts
 */
async function main() {
   
  const whitelistAddresses = [
    ''
    // Put Addresses Here
  ]
    const deployer = await ethers.getNamedSigner('deployer');      
    const communityOffering = await ethers.getContract<CommunityOffering>(`CommunityOffering`)
    await communityOffering.connect(deployer).addMultipleWhitelist(whitelistAddresses)
    console.log(`Whitelisted Addresses : ${whitelistAddresses}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
