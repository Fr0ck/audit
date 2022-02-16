import { Contract } from 'ethers';
import {     
    DividenDistributorV1,    
    DividenDistributorProxy__factory,    
  } from '@project/contracts/typechain/generated';
  import { HardhatRuntimeEnvironment } from 'hardhat/types'; // This adds the type from hardhat runtime environment.
  import { DeployFunction, DeployResult } from 'hardhat-deploy/types'; 

  const func: DeployFunction = async function ({
    ethers,
    network,
    deployments,
    getNamedAccounts,
  }: HardhatRuntimeEnvironment) {

    // Initialize Type
    type OmitLast<T extends unknown[]> = T extends [...infer Head, unknown?]
    ? Head
    : never;    
    type ProxyDeployArgs = OmitLast<Parameters<DividenDistributorProxy__factory['deploy']>>;
    type InitializeParams = OmitLast<Parameters<DividenDistributorV1['initialize']>>;
    // Initiate Named Accounts
    const {
        deployer: deployerAddress,              
    } = await getNamedAccounts();
    // Contract Name
    const LOGIC_NAME = 'DividenDistributorV1';
    const NAME = 'DividenDistributorProxy';

    // Deploy logic
    let logicDeployed = network.live && (await deployments.getOrNull(LOGIC_NAME));
    if (!logicDeployed) {        
        console.debug(`Deploying Logic Contract`);
    
        logicDeployed = await deployments.deploy(LOGIC_NAME, {
        contract: LOGIC_NAME,
        from: deployerAddress, // Deployer will be performing the deployment transaction.
        args: [], // Arguments to the contract's constructor.
        log: true, // Display the address and gas used in the console (not when run in test though).
        });
    }
    const contractImpl = await ethers.getContract<DividenDistributorV1>(LOGIC_NAME);


    // Deploy real child
    const childDeployed = network.live && (await deployments.getOrNull(NAME));
    if (!childDeployed) {
        console.log('Deploying Dividen Disttributor Proxy')
        // Prepare initialization on Constructor        
        const proxyDeployArgs: ProxyDeployArgs = [
            contractImpl.address,
            deployerAddress,
            contractImpl.interface.encodeFunctionData("initialize"),
        ];
      const DistributirProxy = await deployments.deploy(NAME, {
        contract: NAME,
        from: deployerAddress, // Deployer will be performing the deployment transaction.
        args: proxyDeployArgs, // Arguments to the contract's constructor.
        log: true, // Display the address and gas used in the console (not when run in test though).
      });      

      console.debug(`DistributirProxy Impl : ${contractImpl.address}`)
      console.debug(`DistributirProxy Proxy : ${DistributirProxy.address}`)
      await DistributirProxy


    } else if ((logicDeployed as DeployResult)?.newlyDeployed) {
      const deployer = await ethers.getNamedSigner('deployer');

      console.debug(
        `Upgrading ${NAME} proxy:`,
        `${childDeployed.address} -> ${contractImpl.address}`
      );

      await contractImpl
        .attach(childDeployed.address)
        .connect(deployer)
        .upgradeTo(contractImpl.address);

      console.debug(
        `${NAME} proxy upgraded:`,
        `${childDeployed.address} -> ${contractImpl.address}`
      );
    }


};

func.tags = ['DividenDistributor']; // This sets up a tag so you can execute the script on its own (and its dependencies).

export default func;