import { FrockTokenV1,FrockProxy } from '@project/contracts/typechain/generated';
import chai from 'chai';
import { deployments, ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '../utils/interfaces';

const { expect } = chai;

describe('Frock Proxy', async () => {
  let proxyAdmin: SignerWithAddress  
  let recepient: SignerWithAddress  
  let snapshoter: SignerWithAddress
  let frockToken: FrockTokenV1
  let frockProxy: FrockProxy

  const args: any[] = [];

  before(async () => {
    await deployments.fixture(['Frock'], {
      keepExistingDeployments: true,
    });

    ({
      deployer: proxyAdmin,                  
      user2: recepient,      
      snapshoter
    } = await ethers.getNamedSigners())
    frockProxy = await ethers.getContract<FrockProxy>('FrockProxy')
    frockToken = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)        
  })

  it('Blacklist and Disable Transfer', async() => {    
    // Fail to blacklist
    await expect(
      frockToken.connect(snapshoter).setBlacklist(proxyAdmin.address, true)
    ).to.be.revertedWith(`AccessControl: account ${snapshoter.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`)
   
    // Success to blacklist
    await frockToken.connect(proxyAdmin).setBlacklist(proxyAdmin.address, true)
    const blacklistState = await frockToken.isBlacklisted(proxyAdmin.address);
    expect(blacklistState).to.be.true
    
    const transferAmount = ethers.utils.parseUnits('1',9)
    await expect(
        frockToken.connect(proxyAdmin).transfer(recepient.address, transferAmount)
    ).to.be.revertedWith('Blacklisted: user blacklisted');
  })

  it('Remove Blacklist and Enable Transfer', async() => {    
    // Fail to remove blacklist
    await expect(
      frockToken.connect(snapshoter).setBlacklist(proxyAdmin.address, false)
    ).to.be.revertedWith(`AccessControl: account ${snapshoter.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`)
   
    // Success to remove blacklist
    await frockToken.connect(proxyAdmin).setBlacklist(proxyAdmin.address, false)
    const blacklistState = await frockToken.isBlacklisted(proxyAdmin.address);
    expect(blacklistState).to.be.false
    
    const transferAmount = ethers.utils.parseUnits('1',9)
    await expect(
        frockToken.connect(proxyAdmin).transfer(recepient.address, transferAmount)    
    ).to.emit(frockToken, "Transfer")
  })
});
