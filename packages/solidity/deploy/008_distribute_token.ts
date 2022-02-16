import { FairPriceLaunch } from './../../react-app/src/generated/typechain/FairPriceLaunch.d';
import { HardhatRuntimeEnvironment } from 'hardhat/types'; // This adds the type from hardhat runtime environment.
import { DeployFunction } from 'hardhat-deploy/types'; 
import { FrockProxy, FrockTokenV1, USDC, FairPriceLaunch__factory, FairLaunchNRT } from '@project/contracts/typechain/generated';

const func: DeployFunction = async function ({    
  ethers,
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
    console.log("Distribute USDC")
    
    // Initiate Named Accounts
    const deployer = await ethers.getNamedSigner('deployer');
    const user1 = await ethers.getNamedSigner('user1');
    const user2 = await ethers.getNamedSigner('user2');
    const usdcHolder = await ethers.getNamedSigner('usdcHolder');
  

    // Get USDC Token
    const usdcFtm = await deployments.get('USDC')
    const usdc = (await ethers.getContract<USDC>(`USDC`)).attach(
    usdcFtm.address
    ) as USDC;
    const usdcDecimals = await usdc.decimals();        
    
    // List of Token Recepients
    const recepients = [
        user1,
        user2,
        deployer,
    ]        
    const sendUSDC = recepients.map((recepient) => {
        usdc.connect(usdcHolder).transfer(recepient.address, ethers.utils.parseUnits("5000", usdcDecimals))
    })
    const shareUSDC = await Promise.all(sendUSDC)
};

func.tags = ['ShareToken']; // This sets up a tag so you can execute the script on its own (and its dependencies).
func.dependencies = ['Frock'];

export default func;