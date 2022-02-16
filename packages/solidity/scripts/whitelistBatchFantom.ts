import { network, ethers, deployments } from 'hardhat';
import {CommunityOffering } from '@project/contracts/typechain/generated';
import { address , abi } from '../../contracts/deployments/fantom/CommunityOffering.json'

/**
 * @dev to run this function : npx hardhat run scripts/whitelistBatchFantom.ts --network fantom
 */
async function main() {
   
  const whitelistAddresses = [
      ''
    // Put Addresses Here
  ]
  const deployer = await ethers.getNamedSigner('deployer');      
  const communityOffering = new ethers.Contract(address, abi, deployer)
  await communityOffering.addMultipleWhitelist(whitelistAddresses)
  console.log(`Whitelisted Addresses : ${whitelistAddresses}`)
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
