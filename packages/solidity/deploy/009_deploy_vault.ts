
import { HardhatRuntimeEnvironment } from 'hardhat/types'; // This adds the type from hardhat runtime environment.
import { DeployFunction } from 'hardhat-deploy/types'; 
import { FrockProxy, FrockTokenV1, DividenDistributorProxy, DividenDistributorV1, Vault__factory } from '@project/contracts/typechain/generated';

const func: DeployFunction = async function ({    
  ethers,
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
    const CONTRACT_NAME = 'Vault';
    type DeployArgs = Parameters<Vault__factory['deploy']>;
    
    // Initiate Named Accounts    
    const {
        deployer: deployerAddress    
    } = await getNamedAccounts();

    // Get Frock Token
    const frockProxy = (await ethers.getContract<FrockProxy>('FrockProxy'))
    const frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)    

    // Get Dividen Distributor
    const dividenDistributorProxy = (await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy'))
    const dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address)    
    
    let vault = network.live && (await deployments.getOrNull(CONTRACT_NAME));
    if (!vault) {
        console.log("Deploy Vault")

        // Set Constructor Parameters
        const args: DeployArgs = [
            frock.address,
            dividenDistributor.address
        ]
        // Deploy
        vault = await deployments.deploy(CONTRACT_NAME, {
            contract: CONTRACT_NAME,
            from: deployerAddress, // Deployer will be performing the deployment transaction.
            args, // Arguments to the contract's constructor.
            log: true, // Display the address and gas used in the console (not when run in test though).
        });

        console.log("Vault : ", vault.address)
    }     
};

func.tags = ['Vault']; // This sets up a tag so you can execute the script on its own (and its dependencies).
func.dependencies = ['Frock','DividenDistributor'];

export default func;