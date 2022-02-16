import { calculateNRTAmount } from "./utils/calculations";
import { SignerWithAddress } from "./utils/interfaces";
import {
  USDC,
  CommunityOffering,
  CommunityOfferingNRT,
  FrockProxy,
  FrockTokenV1,
} from "@project/contracts/typechain/generated";
import { expect } from "chai";
import { deployments, ethers, upgrades, network } from "hardhat";

describe("Community Offering", async () => {
  let usdc: USDC;
  let communityOffering: CommunityOffering;
  let nrt: CommunityOfferingNRT;
  let frock: FrockTokenV1
  let frockProxy: FrockProxy
  let treasury: SignerWithAddress;
  let deployer: SignerWithAddress;
  let usdcHolder: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let nonDeployer: SignerWithAddress;
  let usdcDecimals: number;
  const epochTime = 6 * 3600;

  before(async () => {
    await deployments.fixture(["CommunityOffering"], {
      keepExistingDeployments: true,
    });

    // Get USDC Token
    const usdcFtm = await deployments.get("USDC");
    usdc = (await ethers.getContract<USDC>(`USDC`)).attach(
      usdcFtm.address
    ) as USDC;
    usdcDecimals = await usdc.decimals();
    // Community Offering
    communityOffering = await ethers.getContract<CommunityOffering>(
      "CommunityOffering"
    );
    nrt = await ethers.getContract<CommunityOfferingNRT>(
      "CommunityOfferingNRT"
    );    
    frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
    frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);

    ({
      deployer,
      usdcHolder: nonDeployer,
      usdcHolder,
      user1,
      user2,
      user3,
      user4,
      treasury,
    } = await ethers.getNamedSigners());
  });

  it("Distribute USDC", async () => {
    await usdc
      .connect(usdcHolder)
      .transfer(user1.address, ethers.utils.parseUnits("100", usdcDecimals));
    await usdc
      .connect(usdcHolder)
      .transfer(user2.address, ethers.utils.parseUnits("1000", usdcDecimals));
    await usdc
      .connect(usdcHolder)
      .transfer(user3.address, ethers.utils.parseUnits("10000", usdcDecimals));
    await usdc
      .connect(usdcHolder)
      .transfer(user4.address, ethers.utils.parseUnits("1000", usdcDecimals));
  });

  it("Send Frock to Community Sales", async () => {
    const frockDecimals = await frock.decimals();
    const amountFrockToSale = ethers.utils.parseUnits("125000", frockDecimals);    
    await frock
      .connect(deployer)
      .transfer(communityOffering.address, amountFrockToSale);

    const frockBalanceOfCommunitySalesContract = await frock.balanceOf(
      communityOffering.address
    );
    expect(amountFrockToSale).to.be.eq(frockBalanceOfCommunitySalesContract);
  });

  it("Whitelist & Remove Whitelist Users", async () => {
    // Whitelist user1
    await communityOffering.connect(deployer).addWhitelist(user1.address);
    expect(await communityOffering.whitelisted(user1.address)).to.be.true;

    // Whitelist user2 & user3
    await communityOffering
      .connect(deployer)
      .addMultipleWhitelist([user2.address, user3.address, user4.address]);
    expect(await communityOffering.whitelisted(user2.address)).to.be.true;
    expect(await communityOffering.whitelisted(user3.address)).to.be.true;
    expect(await communityOffering.whitelisted(user4.address)).to.be.true;

    // Remove whitelist
    await communityOffering.connect(deployer).removeWhitelist(user4.address);
    expect(await communityOffering.whitelisted(user4.address)).to.be.false;
  });

  it("Fail to Invest because Sales not enabled yet", async () => {
    // User 1 invest 100 USDC but the time not yet started
    const investAmount1 = ethers.utils.parseUnits("100", usdcDecimals);
    await usdc.connect(user1).approve(communityOffering.address, investAmount1);
    await expect(
      communityOffering.connect(user1).invest(investAmount1)
    ).to.be.revertedWith("not started yet");

    // Time travel
    const startTime = parseInt(
      (await communityOffering.startTime()).toString()
    );
    await network.provider.send("evm_setNextBlockTimestamp", [startTime]);

    // user1 invest but sales not started yet
    await expect(
      communityOffering.connect(user1).invest(investAmount1)
    ).to.be.revertedWith("not enabled yet");
  });

  it("Enable Sale", async () => {
    // Cannot be done by non Owner
    await expect(
      communityOffering.connect(nonDeployer).enableSale()
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // Success Enable Sale
    await expect(communityOffering.connect(deployer).enableSale()).to.emit(
      communityOffering,
      "SaleEnabled"
    );

    expect(await communityOffering.saleEnabled()).to.be.true;
  });

  it("Invest", async () => {
    const startTime = parseInt(
      (await communityOffering.startTime()).toString()
    );

    // Time Travel to increase epoch
    await network.provider.send("evm_setNextBlockTimestamp", [
      startTime + epochTime * 1 + 10,
    ]);
    // Epoch  0
    // Cap  100_000_000 a.k.a 100 USDC
    // User 1 invest 100 USDC
    const investAmount1 = ethers.utils.parseUnits("100", usdcDecimals);
    await usdc.connect(user1).approve(communityOffering.address, investAmount1);
    await communityOffering.connect(user1).invest(investAmount1);
    const nrtAmount1 = calculateNRTAmount(investAmount1);
    expect(await nrt.balanceOf(user1.address)).to.be.eq(nrtAmount1);

    // Time Travel to increase epoch
    await network.provider.send("evm_setNextBlockTimestamp", [
      startTime + epochTime * 2 + 10,
    ]);
    // Epoch  1
    // Cap  200_000_000 a.k.a 200 USDC
    // User 2 invest 1_000 USDC
    const investAmount2 = ethers.utils.parseUnits("200", usdcDecimals);
    await usdc.connect(user2).approve(communityOffering.address, investAmount2);
    await communityOffering.connect(user2).invest(investAmount2);
    const nrtAmount2 = calculateNRTAmount(investAmount2);
    expect(await nrt.balanceOf(user2.address)).to.be.eq(nrtAmount2);

    // Time Travel to increase epoch
    await network.provider.send("evm_setNextBlockTimestamp", [
      startTime + epochTime * 3 + 10,
    ]);
    // Epoch  2
    // Cap  400000000 a.k.a 400 USDC
    // User 3 Fail to invest 10_000 USDC because exceed limit
    const investAmount3 = ethers.utils.parseUnits("400", usdcDecimals);
    await usdc.connect(user3).approve(communityOffering.address, investAmount3);
    await communityOffering.connect(user3).invest(investAmount3);

    // Epoch  3
    // Cap  800000000 a.k.a 800 USDC
    // User 3 Fail to invest 8_800 USDC because exceed limit
    const amountToFail = ethers.utils.parseUnits("8800", usdcDecimals);
    await usdc.connect(user3).approve(communityOffering.address, amountToFail);
    await expect(
      communityOffering.connect(user3).invest(amountToFail)
    ).to.be.revertedWith("above cap");

    // User3 reinvest and succedd
    const reinvestAmount3 = ethers.utils.parseUnits("400", usdcDecimals);
    await usdc
      .connect(user3)
      .approve(communityOffering.address, reinvestAmount3);
    await communityOffering.connect(user3).invest(reinvestAmount3);

    // User 4 Fail to invest 100 USDC because not in whitelist
    const reinvestAmount4 = ethers.utils.parseUnits("100", usdcDecimals);
    await usdc
      .connect(user4)
      .approve(communityOffering.address, reinvestAmount4);
    await expect(
      communityOffering.connect(user4).invest(reinvestAmount4)
    ).to.be.revertedWith("msg.sender is not whitelisted");

    // Time travel to end of sales
    const endTime =
      parseInt((await communityOffering.endTime()).toString()) + 60;
    await network.provider.send("evm_setNextBlockTimestamp", [endTime]);

    // Invest after periode end
    // User 3 Fail to invest 8_800 USDC because sales ended
    const amountToInvest = ethers.utils.parseUnits("100", usdcDecimals);
    await usdc
      .connect(user3)
      .approve(communityOffering.address, amountToInvest);
    await expect(
      communityOffering.connect(user3).invest(amountToInvest)
    ).to.be.revertedWith("sales ended");
  });

  it("Enable Redeem", async () => {
    // Cannot be done by non Owner
    await expect(
      communityOffering.connect(nonDeployer).enableRedeem()
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // Success Enable Sale
    await expect(communityOffering.connect(deployer).enableRedeem()).to.emit(
      communityOffering,
      "RedeemEnabled"
    );

    expect(await communityOffering.redeemEnabled()).to.be.true;
  });

  it("Redeem", async () => {    
    // User1 Redeem
    const investAmount1 = ethers.utils.parseUnits("100", usdcDecimals);
    const nrtAmount1 = calculateNRTAmount(investAmount1);
    const nrtBalance1 = await nrt.balanceOf(user1.address);
    await expect(communityOffering.connect(user1).redeem())
      .to.emit(communityOffering, "Redeem")
      .withArgs(user1.address, parseInt(nrtAmount1.toString()));
    const frockAmount1 = await frock.balanceOf(user1.address);
    expect(nrtAmount1).to.be.eq(nrtBalance1);
    expect(frockAmount1).to.be.eq(nrtBalance1);
    // Only able to redeem once
    await expect(communityOffering.connect(user1).redeem()).to.be.revertedWith(
      "no amount issued"
    );

    // User2 Redeem
    const investAmount2 = ethers.utils.parseUnits("200", usdcDecimals);
    const nrtAmount2 = calculateNRTAmount(investAmount2);
    const nrtBalance2 = await nrt.balanceOf(user2.address);
    await expect(communityOffering.connect(user2).redeem())
      .to.emit(communityOffering, "Redeem")
      .withArgs(user2.address, nrtAmount2);
    const frockAmount2 = await frock.balanceOf(user2.address);
    expect(nrtAmount2).to.be.eq(nrtBalance2);
    expect(frockAmount2).to.be.eq(nrtBalance2);

    // User3 Redeem
    const investAmount3 = ethers.utils.parseUnits("800", usdcDecimals);
    const nrtAmount3 = calculateNRTAmount(investAmount3);
    const nrtBalance3 = await nrt.balanceOf(user3.address);
    await expect(communityOffering.connect(user3).redeem())
      .to.emit(communityOffering, "Redeem")
      .withArgs(user3.address, nrtAmount3);
    const frockAmount3 = await frock.balanceOf(user3.address);
    expect(nrtAmount3).to.be.eq(nrtBalance3);
    expect(frockAmount3).to.be.eq(nrtBalance3);

    // No Amount to redeem
    await expect(communityOffering.connect(user4).redeem()).to.be.revertedWith(
      "no amount issued"
    );
  });

  it("Withdraw Treasury", async () => {
    const amountCollected = ethers.utils.parseUnits("1100", usdcDecimals);
    const treasuryBalanceBefore = await usdc.balanceOf(treasury.address);
    const communityOfferingBalanceBefore = await usdc.balanceOf(
      communityOffering.address
    );
    await communityOffering
      .connect(deployer)
      .withdrawTreasury(communityOfferingBalanceBefore);
    const treasuryBalanceAfter = await usdc.balanceOf(treasury.address);
    const communityOfferingBalanceAfter = await usdc.balanceOf(
      communityOffering.address
    );

    expect(treasuryBalanceBefore).to.be.eq(0);
    expect(communityOfferingBalanceBefore).to.be.eq(amountCollected);
    expect(treasuryBalanceAfter).to.be.eq(amountCollected);
    expect(communityOfferingBalanceAfter).to.be.eq(0);
    expect(treasuryBalanceAfter).to.be.eq(
      treasuryBalanceBefore.add(amountCollected)
    );
  });

  it("Withdraw Launch Token", async () => {
    // Fund collected : 1100 USDC
    // in FROCK (0,08 USDC/FROCK) : 1100/0,08 = 13750 FROCK is sold
    // remaining = 125000 - 13750 = 111250
    const remainingFrock = ethers.utils.parseUnits(
      "111250",
      await frock.decimals()
    );
    const balanceFrockOfDeployerBefore = await frock.balanceOf(
      deployer.address
    );
    await communityOffering
      .connect(deployer)
      .withdrawLaunchtoken(remainingFrock);
    const balanceFrockOfCommunityContract = await frock.balanceOf(
      communityOffering.address
    );
    const balanceFrockOfDeployerAfter = await frock.balanceOf(deployer.address);
    expect(balanceFrockOfCommunityContract).to.be.eq(0);
    expect(balanceFrockOfDeployerAfter).to.be.eq(
      balanceFrockOfDeployerBefore.add(remainingFrock)
    );
  });
});
