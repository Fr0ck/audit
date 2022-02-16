import { Contract } from 'ethers';
import {     
    FrockTokenV1,
    FrockProxy,
    ERC1967Proxy__factory,    
    FrockProxy__factory,
    DividenDistributorProxy,
    DividenDistributorV1
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
    type ProxyDeployArgs = OmitLast<Parameters<FrockProxy__factory['deploy']>>;
    type InitializeParams = OmitLast<Parameters<FrockTokenV1['initialize']>>;
    // Initiate Named Accounts
    const {
        deployer: deployerAddress,    
        developer: developerAddress,    
        marketing: marketingAddress,    
        snapshoter
    } = await getNamedAccounts();
    // Contract Name
    const LOGIC_NAME = 'FrockTokenV1';
    const NAME = 'FrockProxy';
    // Token Attributes
    const name = "Fractional Rocket";
    const symbol = "FROCK";
    const decimals = 9;
    const cap = ethers.utils.parseUnits('1000000', decimals); // 1_000_000 a.k.a 1 Million

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
    const contractImpl = await ethers.getContract<FrockTokenV1>(LOGIC_NAME);


    // Deploy real child
    const childDeployed = network.live && (await deployments.getOrNull(NAME));
    if (!childDeployed) {
        console.log('Deploying FrockProxy')
        // Prepare initialization on Constructor
        const initArgs: InitializeParams = [
            name,
            symbol,
            cap
          ];
        const proxyDeployArgs: ProxyDeployArgs = [
            contractImpl.address,
            deployerAddress,
            contractImpl.interface.encodeFunctionData('initialize', initArgs),
        ];
      const FrockProxy = await deployments.deploy(NAME, {
        contract: NAME,
        from: deployerAddress, // Deployer will be performing the deployment transaction.
        args: proxyDeployArgs, // Arguments to the contract's constructor.
        log: true, // Display the address and gas used in the console (not when run in test though).
      });      

      console.debug(`Frock Impl : ${contractImpl.address}`)
      console.debug(`Frock Proxy : ${FrockProxy.address}`)
      await FrockProxy


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



    const dividenDistributorProxy = (await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy'))
    const dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address)    

    // Set up Value of Contract   
    const deployer = await ethers.getNamedSigner('deployer');     
    const treasury = await ethers.getNamedSigner('treasury');     
    const marketing = await ethers.getNamedSigner('marketing'); 

    const frockProxy = (await ethers.getContract<FrockProxy>(NAME))
    const frockToken = (await ethers.getContract<FrockTokenV1>(LOGIC_NAME)).attach(frockProxy.address)    

    // Set Addresses and Fee percentage
    await frockToken.connect(deployer).setReflection(dividenDistributor.address);
    await frockToken.connect(deployer).setTreasury(treasury.address);
    await frockToken.connect(deployer).setMarketing(marketing.address);
    await frockToken.connect(deployer).setPercentage(700,1400,100); // 7% reflection, 14% treasury, 1% Marketing    
    
    // Set snapshooter    
    const snapshoterRole = await frockToken.SNAPSHOTER();
    await frockToken.connect(deployer).grantRole(snapshoterRole, dividenDistributor.address)
    await frockToken.connect(deployer).grantRole(snapshoterRole, snapshoter)

    // Set Main Token on DividenDistributor
    await dividenDistributor.connect(deployer).setMainToken(frockToken.address)
};

func.tags = ['Frock']; // This sets up a tag so you can execute the script on its own (and its dependencies).
func.dependencies = ['DividenDistributor']

export default func;