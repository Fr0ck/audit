import { HardhatRuntimeEnvironment } from 'hardhat/types'; // This adds the type from hardhat runtime environment.
import { DeployFunction } from 'hardhat-deploy/types'; 

import { FairLaunchNRT__factory } from '@project/contracts/typechain/generated';

const func: DeployFunction = async function ({    
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {

  type DeployArgs = Parameters<FairLaunchNRT__factory['deploy']>;
      
  // Initiate Named Accounts
  const {
      deployer: deployerAddress
  } = await getNamedAccounts();
  // Contract Name
  const CONTRACT_NAME = 'FairLaunchNRT';

  // Deploy logic
  let receiverContract = network.live && (await deployments.getOrNull(CONTRACT_NAME));
  if (!receiverContract) {        
      console.debug(`Deploying FairLaunchNRT Contract`);

      const args: DeployArgs = [                    
        "bFrock", // Symbols
        9 // Decimals
      ];
  
      receiverContract = await deployments.deploy(CONTRACT_NAME, {
      contract: CONTRACT_NAME,
      from: deployerAddress, // Deployer will be performing the deployment transaction.
      args, // Arguments to the contract's constructor.
      log: true, // Display the address and gas used in the console (not when run in test though).
      });
  }    

};

func.tags = ['FairLaunchNRT']; // This sets up a tag so you can execute the script on its own (and its dependencies).

export default func;