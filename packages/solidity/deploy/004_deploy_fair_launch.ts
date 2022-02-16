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

  type DeployArgs = Parameters<FairPriceLaunch__factory['deploy']>;
      
  // Initiate Named Accounts
  const {
      deployer: deployerAddress,
      treasury: treasuryAddress
  } = await getNamedAccounts();
  // Contract Name
  const CONTRACT_NAME = 'FairPriceLaunch';

  // Deploy logic
  let fairLaunch = network.live && (await deployments.getOrNull(CONTRACT_NAME));
  if (!fairLaunch) {        
      console.debug(`Deploying FairLaunch Contract`);

      // Get USDC Token
      const usdcFtm = await deployments.get('USDC')
      const usdc = (await ethers.getContract<USDC>(`USDC`)).attach(
        usdcFtm.address
      ) as USDC;
      const usdcDecimals = await usdc.decimals();     
      // Get Fair Launch NRT
      const fairLaunchNRT = await ethers.getContract<FairLaunchNRT>(
        'FairLaunchNRT',
        deployerAddress
      );         
            
      // Params
      const launchStartTime = 1645286400 // 19 feb 2022 04:00 PM UTC 
      const saleDuration = (2 * 86400) // 2 days
      const investRemovalDelay = 1 * 3600
      const maxInvestAllowed = ethers.utils.parseUnits("2500", usdcDecimals) // 2_500 USDC
      const maxInvestRemovablePerPeriod = ethers.utils.parseUnits("1000", usdcDecimals)
      const maxGlobalInvestAllowed = ethers.utils.parseUnits("8750", usdcDecimals)
      const frockDecimals = 9;
      const maxRedeemableToIssue = ethers.utils.parseUnits('350000', frockDecimals); // 350_000 FROCK
      const statingPrice = ethers.utils.parseUnits("0.08", usdcDecimals) // 0,08 USDC            

      const args: DeployArgs = [                    
        treasuryAddress, // fundsRedeemer,
        usdc.address, // Invest Token
        fairLaunchNRT.address,
        launchStartTime, // launchStartTime
        saleDuration, // saleDuration
        investRemovalDelay, //investRemovalDelay
        maxInvestAllowed, // maxInvestAllowed
        0, // minInvestAllowed
        maxInvestRemovablePerPeriod, // maxInvestRemovablePerPeriod
        maxGlobalInvestAllowed, // maxGlobalInvestAllowed
        maxRedeemableToIssue, //maxRedeemableToIssue
        statingPrice, // startingPrice        
      ];
  
      fairLaunch = await deployments.deploy(CONTRACT_NAME, {
        contract: CONTRACT_NAME,
        from: deployerAddress, // Deployer will be performing the deployment transaction.
        args, // Arguments to the contract's constructor.
        log: true, // Display the address and gas used in the console (not when run in test though).
      });

      // Get Named Accounts
      const deployer = await ethers.getNamedSigner('deployer')        
      // Set Launch Token
      const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
      const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)         
      const fairLaunchContract = await ethers.getContract<FairPriceLaunch>(`FairPriceLaunch`)
      await fairLaunchContract.connect(deployer).setLaunchToken(frock.address)
      
        // Set Community Offering as Owner of NRT      
      await fairLaunchNRT.connect(deployer).transferOwnership(fairLaunch.address)

      // Set Sales Contract as Excluded from fee
      await frock.connect(deployer).excludeFromFees(fairLaunchContract.address, true);
  }    

};

func.tags = ['FairLaunch']; // This sets up a tag so you can execute the script on its own (and its dependencies).
func.dependencies = ['Frock', 'FairLaunchNRT'];

export default func;