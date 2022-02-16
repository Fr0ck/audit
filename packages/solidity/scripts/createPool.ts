import { network, ethers } from 'hardhat';
import { SpookyRouter, SpookyFactory, FrockProxy, FrockTokenV1 } from '@project/contracts/typechain/generated';

/**
 * @dev to run this function :  yarn solidity run-local scripts/createPool.ts
 * @dev Remember to share FROCK or make sure the poolCreator have FOCK before running this scripts
 */
async function main() {
    console.log("Create Pool")
    
    const poolCreator = await ethers.getNamedSigner('user11');  // Change the Pool Creator
    const amountFrock = ethers.utils.parseUnits("7000", 9)
    const amountETH = ethers.utils.parseUnits("7000");

    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 100;
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         
    const spookyRouter = await ethers.getContract<SpookyRouter>('SpookyRouter');
    const spookyFactory = await ethers.getContract<SpookyFactory>('SpookyFactory');

    await frock.connect(poolCreator).approve(spookyRouter.address, amountFrock)
    await spookyRouter.connect(poolCreator).addLiquidityETH(
      frock.address,
      amountFrock,
      0,
      0, 
      poolCreator.address, 
      deadline, 
      {
          value : amountETH
      }
    )

    const pairAddress = await spookyFactory.getPair(frock.address, (await spookyRouter.WETH()));
    console.log(`Pair Address: ${pairAddress}`)
    console.log(`Balance Frock of Pair : ${ethers.utils.formatUnits(await frock.balanceOf(pairAddress))}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
