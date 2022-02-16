import { network, ethers } from 'hardhat';
import { Vault, FrockProxy, FrockTokenV1} from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/withdrawLockToken.ts
 */
async function main() {
    console.log("Withdraw Locked Token on Vault")

    // Define Contract
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         
    const vault = await ethers.getContract<Vault>('Vault')
    const frockDecimals = await frock.decimals()

    // Parameters    
    const withdrawAmount = ethers.utils.parseUnits("20000", frockDecimals);
    const user = await ethers.getNamedSigner('deployer'); // Need to change

    // Lock Token
    await vault.connect(user).withdraw(withdrawAmount)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
