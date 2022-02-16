import { BigNumber } from 'ethers';
import { SignerWithAddress } from "./utils/interfaces";
import {
  Vault,
  FrockProxy,
  FrockTokenV1,
  DividenDistributorV1,
  DividenDistributorProxy
} from "@project/contracts/typechain/generated";
import { expect } from "chai";
import { calculateDividen } from "./utils/calculations";
import { deployments, ethers, upgrades, network } from "hardhat";

describe("Community Offering", async () => {  
  let frock: FrockTokenV1
  let frockProxy: FrockProxy  
  let dividenDistributor: DividenDistributorV1
  let dividenDistributorProxy: DividenDistributorProxy
  let vault: Vault
  let deployer: SignerWithAddress;  
  let rewarder1: SignerWithAddress;
  let rewarder2: SignerWithAddress;
  let rewarder3: SignerWithAddress;  
  let devTeam: SignerWithAddress;  
  let frockDecimals: number;
  let lockPeriode: number
  let periodPerWithdraw: number
  let maxAmountPerWithdraw: BigNumber

  before(async () => {
    await deployments.fixture(["Vault"], {
      keepExistingDeployments: true,
    });
    
    // Get Frock COntract
    frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
    frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);
    frockDecimals = await frock.decimals();
    // Dividen Distributor Contract
    dividenDistributorProxy = await ethers.getContract<DividenDistributorProxy>('DividenDistributorProxy');
    dividenDistributor = (await ethers.getContract<DividenDistributorV1>('DividenDistributorV1')).attach(dividenDistributorProxy.address);
    // Get Vault
    vault = await ethers.getContract<Vault>('Vault');
    // Set Value
    lockPeriode = 15778800 // 6 months
    periodPerWithdraw = 2629800 // 1 month
    maxAmountPerWithdraw = ethers.utils.parseUnits("25000", frockDecimals); 

    ({
      deployer,      
      user1: rewarder1,
      user2: rewarder2,
      user3: rewarder3,
      user4: devTeam
    } = await ethers.getNamedSigners());
  });

  it('Deployer share tokens', async() => {
    // Exclude DevTeam from Fee
    await frock.connect(deployer).excludeFromFees(devTeam.address, true);
    // Share token to others 
    await frock.connect(deployer).transfer(devTeam.address, ethers.utils.parseUnits("125000", frockDecimals))    
  }) 
  it('Set Rewarder Role', async() => {
    const REWARDER_ROLE = await dividenDistributor.REWARDER_ROLE();
    await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder1.address);
    await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder2.address);
    await dividenDistributor.connect(deployer).grantRole(REWARDER_ROLE, rewarder3.address);
  })

  it("Call Lock Token", async() => {
    await frock.connect(devTeam).approve(vault.address, ethers.utils.parseUnits("125000", frockDecimals));
    await expect(
      vault.connect(devTeam).lockToken(
        ethers.utils.parseUnits("125000", frockDecimals),
        lockPeriode,
        periodPerWithdraw,
        maxAmountPerWithdraw
      )
    ).to.emit(vault, "Locked").withArgs(
      devTeam.address,
      ethers.utils.parseUnits("125000", frockDecimals),
      lockPeriode, 
      periodPerWithdraw, 
      maxAmountPerWithdraw
    )

    const balanceOfVault = await frock.balanceOf(vault.address)
    expect(balanceOfVault).to.eq(ethers.utils.parseUnits("125000", frockDecimals))
  })

  it("Cannot Call Lock Token Twice", async() => {
    await expect(
      vault.connect(devTeam).lockToken(
        ethers.utils.parseUnits("125000", frockDecimals),
        lockPeriode,
        periodPerWithdraw,
        maxAmountPerWithdraw
      )
    ).to.be.revertedWith("Vault: Already Locked")
  })

  it('Failed to Withdraw', async() => {
    await expect(
      vault.connect(rewarder1).withdraw("0")
    ).to.be.revertedWith("Vault: Not the Holder")

    await expect(
      vault.connect(devTeam).withdraw("0")
    ).to.be.revertedWith("Vault: Cannot Withdraw")  
  })

  it('Share Dividen', async() => {
    await dividenDistributor.connect(rewarder1).shareReward({
      value: ethers.utils.parseUnits("1000")
    })
  })

  it('Success Claim Dividen', async() => {
    const rewardId = 0;
    const balanceDevBefore = await ethers.provider.getBalance(devTeam.address);
    await vault.connect(devTeam).claimDividen(rewardId);
    const balanceDevAfter = await ethers.provider.getBalance(devTeam.address)
    
    // Calculate Deviden
    const dividen = calculateDividen(
      ethers.utils.parseUnits("1000"), 
      ethers.utils.parseUnits("125000", frockDecimals), 
      ethers.utils.parseUnits("1000000", frockDecimals)
    );
    const estimateGas = ethers.utils.parseUnits("0.0002")

    expect(balanceDevAfter).to.gte(balanceDevBefore.add(dividen).sub(estimateGas))
  })

  it('Time Travel to Passing lock time', async() => {
    const startTime = parseInt((await vault.startLock()).toString());
    const destinationTime = startTime + lockPeriode + 1
    await network.provider.send("evm_setNextBlockTimestamp", [
      destinationTime
    ]);
    
    await expect(
      vault.connect(devTeam).withdraw(maxAmountPerWithdraw.add("1"))
    ).to.be.revertedWith("Vault: withdrawal exceed limit")
  })

  it('Success to Withdraw at epoch 0', async() => {
    await expect(
      vault.connect(devTeam).withdraw(maxAmountPerWithdraw)
    ).to.emit(vault, "WithdrawToken")
    .withArgs(0, maxAmountPerWithdraw)
  })
  
  it('Failed to Withdraw Again at epoch 0', async() => {
    await expect(
      vault.connect(devTeam).withdraw(maxAmountPerWithdraw)
    ).to.be.revertedWith("Vault: Already Withdraw for This Period")
  })
  

  it('Share Dividen', async() => {
    await dividenDistributor.connect(rewarder2).shareReward({
      value: ethers.utils.parseUnits("1000")
    })
  })

  it('Success Claim Dividen', async() => {
    const rewardId = 1;
    const balanceDevBefore = await ethers.provider.getBalance(devTeam.address);
    await vault.connect(devTeam).claimDividen(rewardId);
    const balanceDevAfter = await ethers.provider.getBalance(devTeam.address)
    
    // Calculate Deviden
    const dividen = calculateDividen(
      ethers.utils.parseUnits("1000"), 
      ethers.utils.parseUnits("100000", frockDecimals), // current token hold
      ethers.utils.parseUnits("1000000", frockDecimals) // total supply
    );
    const estimateGas = ethers.utils.parseUnits("0.0002")

    expect(balanceDevAfter).to.gte(balanceDevBefore.add(dividen).sub(estimateGas))
  })

  it('Success to Withdraw at epoch next epoch', async() => {
    const startTime = parseInt((await vault.startLock()).toString());
    const afterLockTime = startTime + lockPeriode

    for(let i = 1; i <= 4; i++) {
      await network.provider.send("evm_setNextBlockTimestamp", [
        afterLockTime + (periodPerWithdraw*i) + 1
      ]);
      await expect(
        vault.connect(devTeam).withdraw(maxAmountPerWithdraw)
      ).to.emit(vault, "WithdrawToken")
      .withArgs(i, maxAmountPerWithdraw)
    }       
  })

  it('Cannot Withdraw because already empty tokens', async() => {
    await expect(
      vault.connect(devTeam).withdraw(maxAmountPerWithdraw)
    ).to.be.revertedWith("Vault: withdrawal exceed stocks")
  })
    
});
