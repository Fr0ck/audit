import { network, ethers } from 'hardhat';
import { Vault, FrockProxy, FrockTokenV1} from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/lockToken.ts
 */
async function main() {
    console.log("Lock Token to Vault")

    // Define Contract
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         
    const vault = await ethers.getContract<Vault>('Vault')
    const frockDecimals = await frock.decimals()

    // Parameters
    const amountToLock =  ethers.utils.parseUnits("125000", frockDecimals)
    const lockPeriode  = 15778800 // 6 months
    const periodPerWithdraw = 2629800 // 1 month
    const maxAmountPerWithdraw = ethers.utils.parseUnits("25000", frockDecimals);
    const user = await ethers.getNamedSigner('deployer'); // Need to change

    // Approve token
    await frock.connect(user).approve(vault.address, amountToLock);

    // Lock Token
    await vault.connect(user).lockToken(
        amountToLock,
        lockPeriode,
        periodPerWithdraw,
        maxAmountPerWithdraw
    )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
