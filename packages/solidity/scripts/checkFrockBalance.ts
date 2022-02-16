import { network, ethers } from 'hardhat';
import { CommunityOffering, FrockProxy, FrockTokenV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/checkFrockBalance.ts --address [address]
 */
async function main() {
  console.log("Check Balances")

  var args = process.argv.slice(2);
  if(args && args[0] === "--address" && args[1]) {   
    const address = args[1];
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         
    const balance = ethers.utils.formatUnits(await frock.balanceOf(address), 9); 
    console.log(`Balance of ${address} : ${balance.toString()}`)
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
