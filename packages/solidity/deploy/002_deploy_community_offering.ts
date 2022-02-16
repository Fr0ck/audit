import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types'; // This adds the type from hardhat runtime environment.
import { DeployFunction } from 'hardhat-deploy/types'; 
import { FrockProxy, FrockTokenV1, USDC, CommunityOfferingNRT, CommunityOffering__factory, CommunityOffering } from '@project/contracts/typechain/generated';

const func: DeployFunction = async function ({    
  ethers,
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {

  type DeployArgs = Parameters<CommunityOffering__factory['deploy']>;
      
  // Initiate Named Accounts
  const {
      deployer: deployerAddress,
      treasury : treasuryAddress
  } = await getNamedAccounts();
  // Contract Name
  const CONTRACT_NAME = 'CommunityOffering';
  
  // Deploy logic
  let communityOffering = network.live && (await deployments.getOrNull(CONTRACT_NAME));
  if (!communityOffering) {        
      console.debug(`Deploying CommunityOffering Contract`);
      
      // Get USDC Token      
      const usdcFtm = await deployments.get('USDC')      
      const usdc = (await ethers.getContract<USDC>(`USDC`)).attach(
        usdcFtm.address
      ) as USDC;      
      const usdcDecimals = await usdc.decimals();          
      // Get Community Offering NRT
      const communityOfferingNRT = await ethers.getContract<CommunityOfferingNRT>(
        'CommunityOfferingNRT',
        deployerAddress
      );      

      // Params
      const startTime = 1644681600 // 12 Feb 2022 4:00 PM UTC , check on https://www.epochconverter.com/
      const duration = (1 * 86400) // 1 days
      const epochTime = (6 * 3600) // every 6 hours
      const initialCap = ethers.utils.parseUnits("100", usdcDecimals) // 100 USDC

      // 125_000 Frock Token, each token worth 0,08 USDC = 10_000 USDC
      const amountFrockToSale = ethers.BigNumber.from('125000')
      const frockPrice = ethers.utils.parseUnits("0.08", usdcDecimals) // 0,08 USDC
      const totalRaiseCap  = amountFrockToSale.mul(frockPrice) // 10_000 USDC      

      const args: DeployArgs = [                    
        usdc.address, // Invest Token
        startTime, // Stat Time
        duration, /// Duration
        epochTime, // Epoch Time
        initialCap, // Initial Cap
        totalRaiseCap, // totalraiseCap
        0, // Min Invest, There is no minimum invest
        treasuryAddress, // Treasury,
        communityOfferingNRT.address , 
      ];
  
      communityOffering = await deployments.deploy(CONTRACT_NAME, {
        contract: CONTRACT_NAME,
        from: deployerAddress, // Deployer will be performing the deployment transaction.
        args, // Arguments to the contract's constructor.
        log: true, // Display the address and gas used in the console (not when run in test though).
      });

      // Get Named Accounts
      const deployer = await ethers.getNamedSigner('deployer')

      // Set Community Offering as Owner of NRT      
      await communityOfferingNRT.connect(deployer).transferOwnership(communityOffering.address)

      // Set Launch Token
      const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
      const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)    
      const communityOfferingContract = await ethers.getContract<CommunityOffering>(`CommunityOffering`)
      await communityOfferingContract.connect(deployer).setLaunchToken(frock.address)

      // Set Sales Contract as Excluded from fee
      await frock.connect(deployer).excludeFromFees(communityOfferingContract.address, true);
  }    

};

func.tags = ['CommunityOffering']; // This sets up a tag so you can execute the script on its own (and its dependencies).
func.dependencies = ['CommunityNRT','Frock'];

export default func;