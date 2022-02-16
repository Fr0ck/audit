import { ContractFactory } from 'ethers';
import { FrockTokenV1,FrockProxy, DividenDistributorProxy,DividenDistributorV1 } from '@project/contracts/typechain/generated';
import chai from 'chai';
import { deployments, ethers, upgrades } from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';

import { SignerWithAddress } from '../utils/interfaces';

const { expect } = chai;

describe('Frock Proxy', async () => {
  let proxyAdmin: SignerWithAddress
  let wrongAdmin: SignerWithAddress
  let recepient: SignerWithAddress
  let middleMan: SignerWithAddress
  let snapshoter: SignerWithAddress
  let newProxyAdmin: SignerWithAddress
  let marketing: SignerWithAddress
  let treasury: SignerWithAddress
  let dividenDistributorProxy: DividenDistributorProxy
  let dividenDistributor: DividenDistributorV1
  let reward: SignerWithAddress
  let frockToken: FrockTokenV1
  let frockProxy: FrockProxy
  let newFrockImplementation: DeployResult
  let wrongFrockImplementation: DeployResult

  const args: any[] = [];

  before(async () => {
    await deployments.fixture(['FROCK', ], {
      keepExistingDeployments: true,
    });

    ({
      deployer: proxyAdmin,
      wrongAdmin,
      marketing,
      reward,
      treasury,      
      user1: newProxyAdmin,
      user2: recepient,
      user3: middleMan,
      snapshoter
    } = await ethers.getNamedSigners())
    frockProxy = await ethers.getContract<FrockProxy>('FrockProxy')
    frockToken = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address)

    dividenDistributorProxy = (await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy'))
    dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address)    

    newFrockImplementation = await deployments.deploy(
      'FrockTokenNew',
      {
        from: proxyAdmin.address,
        args,
        log: true,
      }
    )
    
    // Unable to deploy new implementation with this contract
    wrongFrockImplementation = await deployments.deploy(
      'FrockTokenWrong',
      {
        from: proxyAdmin.address,
        args,
        log: true,
      }
    )
  })

  describe('Upgrade contract', async () => {
    it('Should fail upgrade when actor is not admin', async () => {      
      await expect(
        frockToken
          .connect(wrongAdmin)
          .upgradeTo(newFrockImplementation.address)
      ).to.be.revertedWith(`Not the Owner of Contract`)
    })

    it('Should success run initializer', async () => {                
      expect(await frockToken.totalSupply()).to.be.eq(ethers.utils.parseUnits("1000000",9))
      expect(await frockToken.name()).to.be.eq('Fractional Rocket')
      expect(await frockToken.symbol()).to.be.eq('FROCK')
      expect(await frockToken.decimals()).to.be.eq(9)
    })

    it('Should fail when run initializer more than one', async () => {
      await expect(
        frockToken.initialize("FrockNew","BEST",120000)
      ).to.be.revertedWith('Initializable: contract is already initialized')
    });

    it('Should fail to set parameter when acccount don`t have Role Admin', async () => {
      await expect(frockToken.connect(wrongAdmin).setReflection(dividenDistributor.address))
      .to.be.revertedWith(
        `AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      )

      await expect(frockToken.connect(wrongAdmin).setTreasury(treasury.address))
      .to.be.revertedWith(
        `AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      )

      await expect(frockToken.connect(wrongAdmin).setMarketing(marketing.address))
      .to.be.revertedWith(
        `AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      )

      await expect(frockToken.connect(wrongAdmin).setPercentage(400,400,200))
      .to.be.revertedWith(
        `AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      )
    });   
    
    it('Should fail to transfer ownership', async () => {            
      await expect(frockProxy.connect(wrongAdmin).changeAdmin(newProxyAdmin.address)).to.be.revertedWith('Caller must be admin')      
    })

    it('Should success to transfer ownership', async () => {            
      await frockProxy.connect(proxyAdmin).changeAdmin(newProxyAdmin.address)      
      
      const currentProxyAdmin = await frockProxy.getAdmin()      
      expect(currentProxyAdmin).to.be.eq(newProxyAdmin.address)      
    })

    it('Should able to Transfer Without Fee', async () => {          
           
      const transferAmount = 1000_000_000000;
    
      const previousSenderBalance = await frockToken.balanceOf(proxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(newProxyAdmin.address)            

      await frockToken.connect(proxyAdmin).transfer(newProxyAdmin.address, transferAmount);

      const currentSenderBalance = await frockToken.balanceOf(proxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(newProxyAdmin.address)      
        
      // Assert
      expect(previousSenderBalance.sub(transferAmount)).to.be.eq(currentSenderBalance);            
      expect(previousRecepientBalance.add(transferAmount)).to.be.eq(currentRecepientBalance);            
    })

    // Transfer & check Tax, balance user
    it('Should success to transfer and Tax calculation is correct', async() => {
      const transferAmount = 1000_000000;
      const reflectionFee = 7 // 7%
      const treasuryFee = 14 // 14%      
      const marketingFee = 1 // 2%      

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)      

      await frockToken.connect(newProxyAdmin).transfer(recepient.address, transferAmount);

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)

      // Calculation
      const reflectionFeeAmount = ethers.BigNumber.from(reflectionFee).mul(100).mul(transferAmount).div(10000) 
      const treasuryFeeAmount = ethers.BigNumber.from(treasuryFee).mul(100).mul(transferAmount).div(10000)
      const marketingFeeAmount = ethers.BigNumber.from(marketingFee).mul(100).mul(transferAmount).div(10000)
      const receivedAmount = ethers.BigNumber.from(transferAmount)
      .sub(reflectionFeeAmount)
      .sub(treasuryFeeAmount)
      .sub(marketingFeeAmount)       

      // Assert
      expect(previousSenderBalance.sub(transferAmount)).to.be.eq(currentSenderBalance);      
      expect(
        previousRecepientBalance.add(receivedAmount)
      ).to.be.eq(currentRecepientBalance)  
      expect(previousReflectionBalance.add(reflectionFeeAmount)).to.be.eq(currentReflectionBalance)
      expect(previousTreasuryBalance.add(treasuryFeeAmount)).to.be.eq(currentTreasuryBalance)
      expect(previousMarketingBalance.add(marketingFeeAmount)).to.be.eq(currentMarketingBalance)          
    })


    // TransferFrom & check Tax, balance user
    it('Should success to transferFrom and Tax calculation is correct', async() => {
      const transferAmount = 2000_000000;
      const reflectionFee = 7 // 7%
      const treasuryFee = 14 // 14%      
      const marketingFee = 1 // 2%      

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)    

      await frockToken.connect(newProxyAdmin).approve(middleMan.address, transferAmount);
      await frockToken.connect(middleMan).transferFrom(newProxyAdmin.address, recepient.address,transferAmount);

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)
      
       // Calculation
       const reflectionFeeAmount = ethers.BigNumber.from(reflectionFee).mul(100).mul(transferAmount).div(10000) 
       const treasuryFeeAmount = ethers.BigNumber.from(treasuryFee).mul(100).mul(transferAmount).div(10000)
       const marketingFeeAmount = ethers.BigNumber.from(marketingFee).mul(100).mul(transferAmount).div(10000)
       const receivedAmount = ethers.BigNumber.from(transferAmount)
       .sub(reflectionFeeAmount)
       .sub(treasuryFeeAmount)
       .sub(marketingFeeAmount)       
 
       // Assert
       expect(previousSenderBalance.sub(transferAmount)).to.be.eq(currentSenderBalance);      
       expect(
         previousRecepientBalance.add(receivedAmount)
       ).to.be.eq(currentRecepientBalance)  
       expect(previousReflectionBalance.add(reflectionFeeAmount)).to.be.eq(currentReflectionBalance)
       expect(previousTreasuryBalance.add(treasuryFeeAmount)).to.be.eq(currentTreasuryBalance)
       expect(previousMarketingBalance.add(marketingFeeAmount)).to.be.eq(currentMarketingBalance) 
    })

    // Approve & check tax not happed, balance user
    it('Sender approve token to recepient, the tax doesn`t applied', async() => {
      const approveAmount = 2000_000000;       

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)              

      await frockToken.connect(proxyAdmin).approve(recepient.address, approveAmount);      

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)
     
      // Assert
      expect(previousSenderBalance).to.be.eq(currentSenderBalance);      
      expect(previousRecepientBalance).to.be.eq(currentRecepientBalance)    
      expect(previousReflectionBalance).to.be.eq(currentReflectionBalance)
      expect(previousTreasuryBalance).to.be.eq(currentTreasuryBalance)
      expect(previousMarketingBalance).to.be.eq(currentMarketingBalance)              
    })


    // Burn & check tax not happend, balance user    
    it('Sender burn token to recepient, the tax doesn`t applied', async() => {
      const burnAmount = 2000_000000;       

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)              

      await frockToken.connect(newProxyAdmin).burn(burnAmount);      

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)
     
      // Assert
      expect(previousSenderBalance.sub(burnAmount)).to.be.eq(currentSenderBalance);      
      expect(previousRecepientBalance).to.be.eq(currentRecepientBalance)    
      expect(previousReflectionBalance).to.be.eq(currentReflectionBalance)
      expect(previousTreasuryBalance).to.be.eq(currentTreasuryBalance)
      expect(previousMarketingBalance).to.be.eq(currentMarketingBalance)       
    })

    // Change Tax number and recreate transaction & check tax, balance user
    it('Should success to transfer and Tax calculation is correct after tweak params', async() => {
      const transferAmount = 1000_000000;
      const reflectionFee = 6 // 7%
      const treasuryFee = 10 // 14%      
      const marketingFee = 1 // 2%      

      // Tweak Parameter
      await frockToken.connect(proxyAdmin).setPercentage(
        ethers.BigNumber.from(reflectionFee).mul(100), 
        ethers.BigNumber.from(treasuryFee).mul(100),         
        ethers.BigNumber.from(marketingFee).mul(100),         
      )

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)      

      await frockToken.connect(newProxyAdmin).transfer(recepient.address, transferAmount);

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)

       // Calculation
       const reflectionFeeAmount = ethers.BigNumber.from(reflectionFee).mul(100).mul(transferAmount).div(10000) 
       const treasuryFeeAmount = ethers.BigNumber.from(treasuryFee).mul(100).mul(transferAmount).div(10000)
       const marketingFeeAmount = ethers.BigNumber.from(marketingFee).mul(100).mul(transferAmount).div(10000)
       const receivedAmount = ethers.BigNumber.from(transferAmount)
       .sub(reflectionFeeAmount)
       .sub(treasuryFeeAmount)
       .sub(marketingFeeAmount)    

      // Assert
      expect(previousSenderBalance.sub(transferAmount)).to.be.eq(currentSenderBalance);      
      expect(
        previousRecepientBalance.add(receivedAmount)
      ).to.be.eq(currentRecepientBalance)  
      expect(previousReflectionBalance.add(reflectionFeeAmount)).to.be.eq(currentReflectionBalance)
      expect(previousTreasuryBalance.add(treasuryFeeAmount)).to.be.eq(currentTreasuryBalance)
      expect(previousMarketingBalance.add(marketingFeeAmount)).to.be.eq(currentMarketingBalance)          
    })

    // Pause and Unpause, then check to create acticity when paused
    it('Should able to Stop and Resume Contract Transfer Functionalities', async () => {          

      // fail to stop
      await expect(frockToken.connect(wrongAdmin).pause())
      .to.be.revertedWith(`AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);      

      // Success to stop
      await frockToken.connect(proxyAdmin).pause()

      // Fail transfer
      await expect(frockToken.connect(newProxyAdmin).transfer(recepient.address, 100)).to.be.revertedWith('ERC20Pausable: token transfer while paused')
      await expect(frockToken.connect(middleMan).transferFrom(proxyAdmin.address, recepient.address, 100)).to.be.revertedWith('ERC20Pausable: token transfer while paused')

      // fail to resumt
      await expect(frockToken.connect(wrongAdmin).unpause())
      .to.be.revertedWith(`AccessControl: account ${wrongAdmin.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);      

      // Success to resume
      await frockToken.connect(proxyAdmin).unpause()      
      const transferAmount = 1000_000000;
      const reflectionFee = 6 // 7%
      const treasuryFee = 10 // 14%      
      const marketingFee = 1 // 2%            

      const previousSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const previousRecepientBalance = await frockToken.balanceOf(recepient.address)      
      const previousReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const previousTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const previousMarketingBalance = await frockToken.balanceOf(marketing.address)       

      await frockToken.connect(newProxyAdmin).transfer(recepient.address, transferAmount);

      const currentSenderBalance = await frockToken.balanceOf(newProxyAdmin.address)
      const currentRecepientBalance = await frockToken.balanceOf(recepient.address)
      const currentReflectionBalance = await frockToken.balanceOf(dividenDistributor.address)      
      const currentTreasuryBalance = await frockToken.balanceOf(treasury.address)      
      const currentMarketingBalance = await frockToken.balanceOf(marketing.address)

      // Calculation
      const reflectionFeeAmount = ethers.BigNumber.from(reflectionFee).mul(100).mul(transferAmount).div(10000) 
      const treasuryFeeAmount = ethers.BigNumber.from(treasuryFee).mul(100).mul(transferAmount).div(10000)
      const marketingFeeAmount = ethers.BigNumber.from(marketingFee).mul(100).mul(transferAmount).div(10000)
      const receivedAmount = ethers.BigNumber.from(transferAmount)
      .sub(reflectionFeeAmount)
      .sub(treasuryFeeAmount)
      .sub(marketingFeeAmount)    

      // Assert
      expect(previousSenderBalance.sub(transferAmount)).to.be.eq(currentSenderBalance);      
      expect(
        previousRecepientBalance.add(receivedAmount)
      ).to.be.eq(currentRecepientBalance)  
      expect(previousReflectionBalance.add(reflectionFeeAmount)).to.be.eq(currentReflectionBalance)
      expect(previousTreasuryBalance.add(treasuryFeeAmount)).to.be.eq(currentTreasuryBalance)
      expect(previousMarketingBalance.add(marketingFeeAmount)).to.be.eq(currentMarketingBalance)      
    })

   
    it('Should fail upgrade when actor is not the new admin', async () => {
      await expect(
        frockToken
        .connect(proxyAdmin)
        .upgradeTo(newFrockImplementation.address))
      .to.be.revertedWith('Not the Owner of Contract');
    });


    it('Should success upgrade when actor is admin', async () => {     
      await frockToken
        .connect(newProxyAdmin)
        .upgradeTo(newFrockImplementation.address);

      expect(await frockProxy.getImplementation()).to.eq(
        newFrockImplementation.address
      );        
    });    

    it('Create Snapshoot', async() => {
      await expect(
        frockToken.connect(snapshoter).snapshot()
      ).to.emit(frockToken, "Snapshot");

      await expect(
        frockToken.connect(proxyAdmin).snapshot()
      ).to.be.reverted
    })    
   
  });
});
