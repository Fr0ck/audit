import { calculateDividen } from "./utils/calculations";
import { SignerWithAddress } from "./utils/interfaces";
import {
  DividenDistributorProxy,
  DividenDistributorV1,
  FrockTokenV1,
  FrockProxy,
  SpookyRouter,
  SpookyFactory
} from "@project/contracts/typechain/generated";
import { expect } from "chai";
import { deployments, ethers, upgrades, network } from "hardhat";


describe("Community Offering", async () => {  
  let deployer: SignerWithAddress;  
  let user1: SignerWithAddress;  
  let user2: SignerWithAddress;  
  let rewarder1: SignerWithAddress;  
  let rewarder2: SignerWithAddress;  
  let rewarder3: SignerWithAddress;  
  let frockToken: FrockTokenV1
  let frockProxy: FrockProxy
  let dividenDistributor: DividenDistributorV1
  let dividenDistributorProxy: DividenDistributorProxy
  let frockDecimals: number;
  let spookyRouter: SpookyRouter;
  let spookyFactory: SpookyFactory;

  before(async () => {
    await deployments.fixture(["DividenDistributor"], {
      keepExistingDeployments: true,
    });

    // Get Frock Contract
    frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
    frockToken = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);
    frockDecimals = await frockToken.decimals();
    // Dividen Distributor Contract
    dividenDistributorProxy = await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy');
    dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address);
    // Get Spooky DEX
    spookyRouter = await ethers.getContract<SpookyRouter>('SpookyRouter');
    spookyFactory = await ethers.getContract<SpookyFactory>('SpookyFactory');

    ({
      deployer,    
      user1, 
      user2, 
      user11 : rewarder1,
      user12 : rewarder2,
      user13 : rewarder3,
    } = await ethers.getNamedSigners());
  });

  describe("Reward Share Mode 0", async () => { 
    it('Deployer share tokens', async() => {
      // Share token to others 
      await frockToken.connect(deployer).transfer(user1.address, ethers.utils.parseUnits("100000", frockDecimals))
      await frockToken.connect(deployer).transfer(user2.address, ethers.utils.parseUnits("100000", frockDecimals))
      await frockToken.connect(deployer).transfer(rewarder1.address, ethers.utils.parseUnits("100000", frockDecimals))
      
      // Console Log Balances
      console.log(`Balance DividenDist : ${await frockToken.balanceOf(dividenDistributor.address)}`)
      console.log(`Balance Deployer : ${await frockToken.balanceOf(deployer.address)}`)
      console.log(`Balance User1 : ${await frockToken.balanceOf(user1.address)}`)
      console.log(`Balance User2 : ${await frockToken.balanceOf(user2.address)}`)
    }) 
    it('Set Rewarder Role', async() => {
      const REWARDER_ROLE = await dividenDistributor.REWARDER_ROLE();
      await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder1.address);
      await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder2.address);
      await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder3.address);
    })
    it('Make Liquidity Pool', async() => {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 10;
      await frockToken.connect(rewarder1).approve(spookyRouter.address, ethers.utils.parseUnits("7000", frockDecimals))
      await spookyRouter.connect(rewarder1).addLiquidityETH(
        frockToken.address,
        ethers.utils.parseUnits("7000", frockDecimals), 
        0,
        0, 
        rewarder1.address, 
        deadline, {
          value : ethers.utils.parseUnits("7000")
        })

        const pairAddress = await spookyFactory.getPair(frockToken.address, (await spookyRouter.WETH()));
        console.log("Pair Address:")
        console.log(`Balance Frock of Pair : ${await frockToken.balanceOf(pairAddress)}`)
    })   
    it('Share Reward mode 0', async() => {
      console.log(`FTM of rewarder1 : ${await ethers.provider.getBalance(rewarder1.address)}`)

      // Before Transfer
      // Deployer : 700_000
      // User1 : 100_000
      // User2 : 100_000
      // Rewarder1 : 93_000
      // Dividen Distributor : 0
      await frockToken.connect(user1).transfer(user2.address, ethers.utils.parseUnits("100000", frockDecimals))
      // After Transfer
      // Deployer : 700_000
      // User1 : 0
      // User2 : 178_000
      // Rewarder1 : 93_000
      // Dividen Distributor : 7_000

      // Console Log Balances
      console.log(`Balance DividenDist : ${await frockToken.balanceOf(dividenDistributor.address)}`)
      console.log(`Balance Deployer : ${await frockToken.balanceOf(deployer.address)}`)
      console.log(`Balance User1 : ${await frockToken.balanceOf(user1.address)}`)
      console.log(`Balance User2 : ${await frockToken.balanceOf(user2.address)}`)

      // Console Log Balances
      console.log(`FTM of dividen distributor Before :  ${await ethers.provider.getBalance(dividenDistributor.address)}`)
      console.log(`Balance DividenDist Before : ${await frockToken.balanceOf(dividenDistributor.address)}`)
      
      // Swap and Share Reward
      await dividenDistributor.connect(rewarder1).swapAndShareReward();

      const pairAddress = await spookyFactory.getPair(frockToken.address, (await spookyRouter.WETH()));
      console.log("Pair Address:")
      console.log(`Balance Frock of Pair After  Swap and Share: ${await frockToken.balanceOf(pairAddress)}`)

      // Console Log Balances
      console.log(`FTM of dividen distributor After :  ${await ethers.provider.getBalance(dividenDistributor.address)}`)
      console.log(`Balance DividenDist After: ${await frockToken.balanceOf(dividenDistributor.address)}`)
    })
    it('Claim Reward mode 0', async() => {
      const rewardId = 0;
      const reward = await dividenDistributor.rewards(rewardId);
      const rewardAmount = reward[0]
      const snapshotId = reward[3]
      const totalExcluded = reward[4]   
      const snapshotTotalSupplyAt = (await frockToken.totalSupplyAt(snapshotId))
      const totalSupplyAt =snapshotTotalSupplyAt.sub(totalExcluded)

      console.log(`Reward : ${reward}`)
      console.log(`Reward Amount : ${rewardAmount}`)

      // Check Balance on Snapshot      
      const frockOfDeployer = await frockToken.balanceOfAt(deployer.address, snapshotId)
      const frockOfUser1 = await frockToken.balanceOfAt(user1.address, snapshotId)
      const frockOfUser2 = await frockToken.balanceOfAt(user2.address, snapshotId)
      console.log(`SnapshotTotal Supply : ${snapshotTotalSupplyAt}`)
      console.log(`Total Supply : ${totalSupplyAt}`)
      console.log(`Snapshot Balance Deployer : ${frockOfDeployer}`)
      console.log(`Snapshot Balance User1 : ${frockOfUser1}`)
      console.log(`Snapshot Balance User2 : ${frockOfUser2}`)

      // FTM Balances Before
      const ftmOfDeployerBefore = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1Before = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2Before = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer Before :  ${ftmOfDeployerBefore}`)
      console.log(`FTM of user1 Before :  ${ftmOfUser1Before}`)
      console.log(`FTM of user2 Before :  ${ftmOfUser2Before}`)  

      // Claim            
      const claim1 = await dividenDistributor.connect(deployer).claimReward(rewardId);
      const claim2 = await expect(dividenDistributor.connect(user1).claimReward(rewardId)).to.be.revertedWith('DD: NOT_A_HOLDER');
      const claim3 = await dividenDistributor.connect(user2).claimReward(rewardId);

      console.log(`Claim 1: ${claim1.wait()}`)      
      console.log(`Claim 3: ${claim3.wait()}`)

      const dividenForDeployer =  calculateDividen(rewardAmount, frockOfDeployer, totalSupplyAt)
      const dividenForUser1 =  calculateDividen(rewardAmount, frockOfUser1, totalSupplyAt)
      const dividenForUser2 =  calculateDividen(rewardAmount, frockOfUser2, totalSupplyAt)
      console.log(`dividenForDeployer : ${dividenForDeployer.toString()}`)
      console.log(`dividenForUser1 : ${dividenForUser1.toString()}`)
      console.log(`dividenForUser2 : ${dividenForUser2.toString()}`)

      // FTM Balances After
      const ftmOfDeployerAfter = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1After = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2After = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer After :  ${ftmOfDeployerAfter}`)
      console.log(`FTM of user1 After :  ${ftmOfUser1After}`)
      console.log(`FTM of user2 After :  ${ftmOfUser2After}`)
      
      console.log("Result : ", (ftmOfDeployerAfter.sub(ftmOfDeployerBefore)).toString())
      console.log("Diff : ", (dividenForDeployer.sub(ftmOfDeployerAfter.sub(ftmOfDeployerBefore))).toString())

      // Expect The FTM of User will increased
      // User will get Reward on FTM but also will be charge on FTM for fee transaction
      const estimateGas = ethers.utils.parseUnits("0.0002")
      expect(ftmOfDeployerAfter).to.be.gte(ftmOfDeployerBefore.add(dividenForDeployer).sub(estimateGas))
      expect(ftmOfUser1After).to.be.gte(ftmOfUser1Before.sub(estimateGas))  
      expect(ftmOfUser1After).to.be.lte(ftmOfUser1Before) // Because he's not get any Reward and must pay on fee    
      expect(ftmOfUser2After).to.be.gte(ftmOfUser2Before.add(dividenForUser2).sub(estimateGas))          
    })
  })  

  describe("Reward Share Mode 1", async () => {  
    it('Share Reward mode 1', async() => {
      // Swap and Share Reward
      await dividenDistributor.connect(rewarder2).shareReward({
        value: ethers.utils.parseUnits("1000")
      })
    })
    it('Claim Reward mode 1', async() => {
      // Get Reward Data
      const rewardId = 1;
      const reward = await dividenDistributor.rewards(rewardId);
      const rewardAmount = reward[0]
      const snapshotId = reward[3]
      const totalExcluded = reward[4]   
      const snapshotTotalSupplyAt = (await frockToken.totalSupplyAt(snapshotId))
      const totalSupplyAt =snapshotTotalSupplyAt.sub(totalExcluded)
      
      // Check Balance on Snapshot      
      // SnapshotTotal Supply : 1_000_000 $FROCK
      // Total Supply : 1_000_000 $FROCK
      // Snapshot Balance Deployer : 700_000 $FROCK
      // Snapshot Balance User1 : 0
      // Snapshot Balance User2 : 178_000 $FROCK
      const frockOfDeployer = await frockToken.balanceOfAt(deployer.address, snapshotId)
      const frockOfUser1 = await frockToken.balanceOfAt(user1.address, snapshotId)
      const frockOfUser2 = await frockToken.balanceOfAt(user2.address, snapshotId)
      console.log(`SnapshotTotal Supply : ${snapshotTotalSupplyAt}`)
      console.log(`Total Supply : ${totalSupplyAt}`)
      console.log(`Snapshot Balance Deployer : ${frockOfDeployer}`)
      console.log(`Snapshot Balance User1 : ${frockOfUser1}`)
      console.log(`Snapshot Balance User2 : ${frockOfUser2}`)

      // FTM Balances Before
      const ftmOfDeployerBefore = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1Before = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2Before = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer Before :  ${ftmOfDeployerBefore}`)
      console.log(`FTM of user1 Before :  ${ftmOfUser1Before}`)
      console.log(`FTM of user2 Before :  ${ftmOfUser2Before}`)  

      // Claim Reward
      const dividenForDeployer = calculateDividen(rewardAmount, frockOfDeployer, totalSupplyAt);
      const dividenForUser1 = calculateDividen(rewardAmount, frockOfUser1, totalSupplyAt);
      const dividenForUser2 = calculateDividen(rewardAmount, frockOfUser2, totalSupplyAt);
      const claim1 = await dividenDistributor.connect(deployer).claimReward(rewardId);
      const claim2 = await expect(dividenDistributor.connect(user1).claimReward(rewardId)).to.be.revertedWith('DD: NOT_A_HOLDER');
      const claim3 = await dividenDistributor.connect(user2).claimReward(rewardId);

       // FTM Balances After
       const ftmOfDeployerAfter = await ethers.provider.getBalance(deployer.address);
       const ftmOfUser1After = await ethers.provider.getBalance(user1.address)
       const ftmOfUser2After = await ethers.provider.getBalance(user2.address)
       console.log(`FTM of deployer After :  ${ftmOfDeployerAfter}`)
       console.log(`FTM of user1 After :  ${ftmOfUser1After}`)
       console.log(`FTM of user2 After :  ${ftmOfUser2After}`)

      // Expect The FTM of User will increased
      // User will get Reward on FTM but also will be charge on FTM for fee transaction
      const estimateGas = ethers.utils.parseUnits("0.0002")
      expect(ftmOfDeployerAfter).to.be.gte(ftmOfDeployerBefore.add(dividenForDeployer).sub(estimateGas))
      expect(ftmOfUser1After).to.be.gte(ftmOfUser1Before.sub(estimateGas))
      expect(ftmOfUser1After).to.be.lte(ftmOfUser1Before) // Because he's not get any Reward and must pay on fee
      expect(ftmOfUser2After).to.be.gte(ftmOfUser2Before.add(dividenForUser2).sub(estimateGas))          

    })
  })  

  describe("Users try to Cheating", async () => {  
    it('Share Reward mode 1', async() => {
      // Share Reward
      await dividenDistributor.connect(rewarder2).shareReward({
        value: ethers.utils.parseUnits("1000")
      })
    })
    it('User Claim Reward mode 1 && Failed to cheating', async() => {
      // Get Reward Data
      const rewardId = 2;
      const reward = await dividenDistributor.rewards(rewardId);
      const rewardAmount = reward[0]
      const snapshotId = reward[3]
      const totalExcluded = reward[4]   
      const snapshotTotalSupplyAt = (await frockToken.totalSupplyAt(snapshotId))
      const totalSupplyAt =snapshotTotalSupplyAt.sub(totalExcluded)
      
      // Check Balance on Snapshot      
      // SnapshotTotal Supply : 1_000_000 $FROCK
      // Total Supply : 1_000_000 $FROCK
      // Snapshot Balance Deployer : 700_000 $FROCK
      // Snapshot Balance User1 : 0
      // Snapshot Balance User2 : 178_000 $FROCK
      const frockOfDeployer = await frockToken.balanceOfAt(deployer.address, snapshotId)
      const frockOfUser1 = await frockToken.balanceOfAt(user1.address, snapshotId)
      const frockOfUser2 = await frockToken.balanceOfAt(user2.address, snapshotId)
      console.log(`SnapshotTotal Supply : ${snapshotTotalSupplyAt}`)
      console.log(`Total Supply : ${totalSupplyAt}`)
      console.log(`Snapshot Balance Deployer : ${frockOfDeployer}`)
      console.log(`Snapshot Balance User1 : ${frockOfUser1}`)
      console.log(`Snapshot Balance User2 : ${frockOfUser2}`)

      // FTM Balances Before
      const ftmOfDeployerBefore = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1Before = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2Before = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer Before :  ${ftmOfDeployerBefore}`)
      console.log(`FTM of user1 Before :  ${ftmOfUser1Before}`)
      console.log(`FTM of user2 Before :  ${ftmOfUser2Before}`)  

      // Claim Reward
      const dividenForDeployer = calculateDividen(rewardAmount, frockOfDeployer, totalSupplyAt);
      const dividenForUser1 = calculateDividen(rewardAmount, frockOfUser1, totalSupplyAt);
      const dividenForUser2 = calculateDividen(rewardAmount, frockOfUser2, totalSupplyAt);
      const claim1 = await dividenDistributor.connect(deployer).claimReward(rewardId);

      // Deployer and User1 Try to Cheat by Transfering all the Frock that owen by deployer to User1
      // But it will not work
      await frockToken.connect(deployer).transfer(user1.address, frockOfDeployer)
      
      const claim2 = await expect(dividenDistributor.connect(user1).claimReward(rewardId)).to.be.revertedWith('DD: NOT_A_HOLDER');
      const claim3 = await dividenDistributor.connect(user2).claimReward(rewardId);

       // FTM Balances After
       const ftmOfDeployerAfter = await ethers.provider.getBalance(deployer.address);
       const ftmOfUser1After = await ethers.provider.getBalance(user1.address)
       const ftmOfUser2After = await ethers.provider.getBalance(user2.address)
       console.log(`FTM of deployer After :  ${ftmOfDeployerAfter}`)
       console.log(`FTM of user1 After :  ${ftmOfUser1After}`)
       console.log(`FTM of user2 After :  ${ftmOfUser2After}`)

      // Expect The FTM of User will increased
      // User will get Reward on FTM but also will be charge on FTM for fee transaction
      const estimateGas = ethers.utils.parseUnits("0.0002")
      expect(ftmOfDeployerAfter).to.be.gte(ftmOfDeployerBefore.add(dividenForDeployer).sub(estimateGas.mul(2))) // Gas mul by 2: For Transfer to User1 and Make Claim
      expect(ftmOfUser1After).to.be.gte(ftmOfUser1Before.sub(estimateGas))
      expect(ftmOfUser1After).to.be.lte(ftmOfUser1Before) // Because he's not get any Reward and must pay on fee
      expect(ftmOfUser2After).to.be.gte(ftmOfUser2Before.add(dividenForUser2).sub(estimateGas))    
    })
  })
  
  describe("Exclude From Reward", async () => {  
    it('Exclude From Reward', async() => {
      // Exclude user 2 From Reward
      await dividenDistributor.connect(deployer).excludedFromReward(user2.address, true)
    })
    it('Share Reward mode 1', async() => {
       // Share Reward
       await dividenDistributor.connect(rewarder3).shareReward({
        value: ethers.utils.parseUnits("1000")
      })
    })
    it('User Claim Reward', async() => {
       // Get Reward Data
       const rewardId = 3;
       const reward = await dividenDistributor.rewards(rewardId);
       const rewardAmount = reward[0]
       const snapshotId = reward[3]
       const totalExcluded = reward[4]   
       const snapshotTotalSupplyAt = (await frockToken.totalSupplyAt(snapshotId))
       const totalSupplyAt =snapshotTotalSupplyAt.sub(totalExcluded)

       console.log(`Reward : ${reward}`)
       
       // Check Balance on Snapshot      
      // SnapshotTotal Supply : 1_000_000 $FROCK
      // Total Supply : 1_000_000 $FROCK
      // Snapshot Balance Deployer : 0 FROCK
      // Snapshot Balance User1 : 700_000 $FROCK
      // Snapshot Balance User2 : 178_000 $FROCK
      const frockOfDeployer = await frockToken.balanceOfAt(deployer.address, snapshotId)
      const frockOfUser1 = await frockToken.balanceOfAt(user1.address, snapshotId)
      const frockOfUser2 = await frockToken.balanceOfAt(user2.address, snapshotId)
      console.log(`SnapshotTotal Supply : ${snapshotTotalSupplyAt}`)
      console.log(`Total Supply : ${totalSupplyAt}`)
      console.log(`Snapshot Balance Deployer : ${frockOfDeployer}`)
      console.log(`Snapshot Balance User1 : ${frockOfUser1}`)
      console.log(`Snapshot Balance User2 : ${frockOfUser2}`)

      // FTM Balances Before
      const ftmOfDeployerBefore = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1Before = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2Before = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer Before :  ${ftmOfDeployerBefore}`)
      console.log(`FTM of user1 Before :  ${ftmOfUser1Before}`)
      console.log(`FTM of user2 Before :  ${ftmOfUser2Before}`)  

      // Claim Reward
      const dividenForDeployer = calculateDividen(rewardAmount, frockOfDeployer, totalSupplyAt);
      const dividenForUser1 = calculateDividen(rewardAmount, frockOfUser1, totalSupplyAt);
      const dividenForUser2 = calculateDividen(rewardAmount, frockOfUser2, totalSupplyAt);
      const claim1 = await expect(dividenDistributor.connect(deployer).claimReward(rewardId)).to.be.revertedWith('DD: NOT_A_HOLDER');
      const claim2 = await dividenDistributor.connect(user1).claimReward(rewardId);
      const claim3 = await expect(dividenDistributor.connect(user2).claimReward(rewardId)).to.be.revertedWith('DD: NOT_ALLOWED_TO_CLAIM');

      // FTM Balances After
      const ftmOfDeployerAfter = await ethers.provider.getBalance(deployer.address);
      const ftmOfUser1After = await ethers.provider.getBalance(user1.address)
      const ftmOfUser2After = await ethers.provider.getBalance(user2.address)
      console.log(`FTM of deployer After :  ${ftmOfDeployerAfter}`)
      console.log(`FTM of user1 After :  ${ftmOfUser1After}`)
      console.log(`FTM of user2 After :  ${ftmOfUser2After}`)

    // Expect The FTM of User will increased
    // User will get Reward on FTM but also will be charge on FTM for fee transaction
    const estimateGas = ethers.utils.parseUnits("0.0002")    
    expect(ftmOfDeployerAfter).to.be.gte(ftmOfDeployerBefore.sub(estimateGas))
    expect(ftmOfDeployerAfter).to.be.lte(ftmOfDeployerBefore) // Because he's not get any Reward and must pay on fee
    expect(ftmOfUser1After).to.be.gte(ftmOfUser1Before.add(dividenForUser1).sub(estimateGas))
    expect(ftmOfUser2After).to.be.lte(ftmOfUser2Before)  // Because he's not get any Reward and must pay on fee
    });
  })
  

});
