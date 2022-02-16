import { FairPriceLaunch, FrockProxy, FrockTokenV1, USDC, FairLaunchNRT } from '@project/contracts/typechain/generated';
import { expect } from 'chai';
import { deployments, ethers, network } from 'hardhat';
import { SignerWithAddress } from './utils/interfaces';

describe("Fair Offering", async () => {
    let usdc: USDC
    let nrt: FairLaunchNRT;
    let fairLaunch: FairPriceLaunch
    let frock: FrockTokenV1
    let frockProxy: FrockProxy
    let treasury: SignerWithAddress
    let deployer: SignerWithAddress
    let usdcHolder: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let user4: SignerWithAddress
    let user5: SignerWithAddress
    let user6: SignerWithAddress
    let user7: SignerWithAddress
    let user8: SignerWithAddress
    let user9: SignerWithAddress
    let user10: SignerWithAddress
    let user11: SignerWithAddress
    let user12: SignerWithAddress
    let user13: SignerWithAddress
    let user14: SignerWithAddress
    let user15: SignerWithAddress
    let user16: SignerWithAddress
    let user17: SignerWithAddress
    let notInvestor: SignerWithAddress
    let nonDeployer: SignerWithAddress
    let usdcDecimals: number
    let frockDecimals: number
    const epochTime = (6 * 3600)
    let investors: any;

    before(async () => {
        await deployments.fixture(['FairLaunch'], {
            keepExistingDeployments: true,
        });

        // Get USDC Token      
        const usdcFtm = await deployments.get('USDC')
        usdc = (await ethers.getContract<USDC>(`USDC`)).attach(
            usdcFtm.address
        ) as USDC;
        usdcDecimals = await usdc.decimals()
        // Community Offering
        fairLaunch = await ethers.getContract<FairPriceLaunch>('FairPriceLaunch');
        frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
        frock = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);
        frockDecimals = await frock.decimals();
        nrt = await ethers.getContract<FairLaunchNRT>(
            "FairLaunchNRT"
        );  
        

        ({
            deployer,
            usdcHolder: nonDeployer,
            usdcHolder, treasury,
            user1, user2, user3,
            user4, user5, user6,
            user7, user8, user9,
            user10, user11, user12,
            user13, user14, user15,
            user16, user17, notInvestor
        } = await ethers.getNamedSigners())

        // Investors
        investors = [
            user1, user3,
            user4, user5, user6,
            user7, user8, user9,
            user10, user11, user12,
            user13, user14, user15,
            user16, user17
        ]   
    })

    it('Distribute USDC', async () => {
        const recepients = [
            user1, user2, user3,
            user4, user5, user6,
            user7, user8, user9,
            user10, user11, user12,
            user13, user14, user15,
            user16, user17, notInvestor
        ]
        const sendUSDC = recepients.map((recepient) => {
            usdc.connect(usdcHolder).transfer(recepient.address, ethers.utils.parseUnits("5000", usdcDecimals))
        })
        await Promise.all(sendUSDC)
    })

    it('Send Frock to Fair Launch Sales', async () => {
        const frockDecimals = await frock.decimals()
        // Give biffer 100 token to prevent inaccurate calculation on final price
        // Solidity will always rounding the fractional number
        const amountFrockToSale = ethers.utils.parseUnits("350000", frockDecimals)
        .add(ethers.utils.parseUnits("100", frockDecimals))
        await frock.connect(deployer).transfer(fairLaunch.address, amountFrockToSale)
        const frockBalanceOfSalesContract = await frock.balanceOf(fairLaunch.address)
        expect(amountFrockToSale).to.be.eq(frockBalanceOfSalesContract)
    })

    it('Fail to Invest because Sales not enabled yet', async () => {
        // User 1 invest 100 USDC but the time not yet enabled
        const investAmount1 = ethers.utils.parseUnits("100", usdcDecimals)
        await usdc.connect(user1).approve(fairLaunch.address, investAmount1)
        await expect(
            fairLaunch.connect(user1).invest(investAmount1)
        ).to.be.revertedWith("Sale is not enabled yet")
    })

    it('Enable Sale', async () => {
        // Cannot be done by non Owner
        await expect(
            fairLaunch
                .connect(nonDeployer)
                .enableSale()
        ).to.be.revertedWith("Ownable: caller is not the owner")

        // Success Enable Sale
        await expect(
            fairLaunch
                .connect(deployer)
                .enableSale()
        ).to.emit(fairLaunch, "SaleEnabled")

        expect(await fairLaunch.saleEnabled()).to.be.true
    })

    it('Fail to Invest Start time not yet passed', async () => {
        // User 1 invest 100 USDC but the time not yet started
        const investAmount1 = ethers.utils.parseUnits("100", usdcDecimals)
        await usdc.connect(user1).approve(fairLaunch.address, investAmount1)
        await expect(
            fairLaunch.connect(user1).invest(investAmount1)
        ).to.be.revertedWith("Sale has not started yet")
    })

    it('Invest', async () => {
        const startTime = parseInt((await fairLaunch.launchStartTime()).toString())

        // Time Travel to increase epoch   
        await network.provider.send('evm_setNextBlockTimestamp', [
            startTime
        ]);

        // User 1 invest 1_000 USDC
        // current price : 0,08
        const investAmount1 = ethers.utils.parseUnits("1000", usdcDecimals)
        const currentPrice1 = ethers.utils.parseUnits("0.08", usdcDecimals)
        await usdc.connect(user1).approve(fairLaunch.address, investAmount1)
        await expect(
            fairLaunch.connect(user1).invest(investAmount1)
        ).to.emit(fairLaunch, "Invest")
            .withArgs(user1.address, investAmount1, investAmount1, currentPrice1)


        // User 2 invest 2_000 USDC
        // current price : 0,08
        const investAmount2 = ethers.utils.parseUnits("2000", usdcDecimals)
        const currentPrice2 = ethers.utils.parseUnits("0.08", usdcDecimals)
        await usdc.connect(user2).approve(fairLaunch.address, investAmount2)
        await expect(
            fairLaunch.connect(user2).invest(investAmount2)
        ).to.emit(fairLaunch, "Invest")
            .withArgs(user2.address, investAmount2, investAmount1.add(investAmount2), currentPrice2)


        // User 3 invest 2_500 USDC
        // current price : 0,08
        const investAmount3 = ethers.utils.parseUnits("2500", usdcDecimals)
        const currentPrice3 = ethers.utils.parseUnits("0.08", usdcDecimals)
        await usdc.connect(user3).approve(fairLaunch.address, investAmount3)
        await expect(
            fairLaunch.connect(user3).invest(investAmount3)
        ).to.emit(fairLaunch, "Invest")
            .withArgs(
                user3.address,
                investAmount3,
                investAmount1.add(investAmount2).add(investAmount3),
                currentPrice3
            )

        // FAIL
        // User1 fail to invest above the limit
        const failInvestAmount1 = ethers.utils.parseUnits("2000", usdcDecimals)
        await usdc.connect(user1).approve(fairLaunch.address, failInvestAmount1)
        await expect(
            fairLaunch.connect(user1).invest(failInvestAmount1)
        ).to.be.revertedWith("Max individual investment reached")


        // User 1 reinvest 1_500 USDC
        // current price : 0,08
        const investAmount4 = ethers.utils.parseUnits("1500", usdcDecimals)
        const currentPrice4 = ethers.utils.parseUnits("0.08", usdcDecimals)
        await usdc.connect(user1).approve(fairLaunch.address, investAmount4)
        await expect(
            fairLaunch.connect(user1).invest(investAmount4)
        ).to.emit(fairLaunch, "Invest")
            .withArgs(
                user1.address,
                investAmount4,
                investAmount1.add(investAmount2).add(investAmount3).add(investAmount4),
                currentPrice4
            )

        // NOTE : Batch Investment
        // 14 * 2_500
        const otherRecepients = [
            user4, user5, user6,
            user7, user8, user9,
            user10, user11, user12,
            user13, user14, user15,
            user16, user17
        ]
        const approves = otherRecepients.map((recepient) => {
            const investAmount = ethers.utils.parseUnits("2500", usdcDecimals)
            usdc.connect(recepient).approve(fairLaunch.address, investAmount)
        })
        await Promise.all(approves)
        const makeInvestments = otherRecepients.map((recepient) => {
            const investAmount = ethers.utils.parseUnits("2500", usdcDecimals)
            expect(
                fairLaunch.connect(recepient).invest(investAmount)
            ).to.emit(fairLaunch, "Invest")
        })
        await Promise.all(makeInvestments)

        // Total Investment
        // User1 : 2_500
        // User2 : 2_000
        // User3 : 2_500
        // Other : 14 * 2_500
        const totalInvestmentOnContract = await fairLaunch.totalGlobalInvested()
        const totalInvestmentCalculated = ethers.utils.parseUnits("42000", usdcDecimals)
        expect(totalInvestmentOnContract).to.be.eq(totalInvestmentCalculated)
    })


    it('Remove Investment', async () => {
        // User2 Remove 1000
        const amountToRemove1 = ethers.utils.parseUnits("1000", usdcDecimals)
        const balanceBeforeRemove1 = await usdc.balanceOf(user2.address)
        await expect(
            fairLaunch.connect(user2).removeInvestment(amountToRemove1)
        ).to.emit(fairLaunch, "RemoveInvestment")
        const balanceAfterRemove1 = await usdc.balanceOf(user2.address)
        expect(balanceAfterRemove1).to.be.eq(balanceBeforeRemove1.add(amountToRemove1))

        // User2 fail to Remove 1_000 USDC investment
        await expect(
            fairLaunch.connect(user2).removeInvestment(amountToRemove1)
        ).to.be.revertedWith("Max withdraw reached for this hour")

        // Time Travel to 1 hour after         
        const destinationTime = (await ethers.provider.getBlock("latest")).timestamp + (3600 + 10)
        await network.provider.send('evm_setNextBlockTimestamp', [
            destinationTime
        ]);

        // User2 success to Remove 1000 again
        const amountToRemove2 = ethers.utils.parseUnits("1000", usdcDecimals)
        const balanceBeforeRemove2 = await usdc.balanceOf(user2.address)
        await expect(
            fairLaunch.connect(user2).removeInvestment(amountToRemove2)
        ).to.emit(fairLaunch, "RemoveInvestment")
        const balanceAfterRemove2 = await usdc.balanceOf(user2.address)
        expect(balanceAfterRemove2).to.be.eq(balanceBeforeRemove2.add(amountToRemove2))

        // Update Total Investment
        // User1 : 2_500
        // User2 : 0
        // User3 : 2_500
        // Other : 14 * 2_500
        const totalInvestmentOnContract = await fairLaunch.totalGlobalInvested()
        const totalInvestmentCalculated = ethers.utils.parseUnits("40000", usdcDecimals)
        expect(totalInvestmentOnContract).to.be.eq(totalInvestmentCalculated)

    })

    it('Failed to Invest After times have passed', async () => {
        // Time travel to end of sales
        const endTime = parseInt((await fairLaunch.launchEndTime()).toString()) + 60
        await network.provider.send('evm_setNextBlockTimestamp', [
            endTime
        ]);

        // Invest after periode end
        // User2 Fail to invest because sales already ended
        const amountToInvest = ethers.utils.parseUnits("500", usdcDecimals)
        await usdc.connect(user2).approve(fairLaunch.address, amountToInvest)
        await expect(
            fairLaunch.connect(user2).invest(amountToInvest)
        ).to.be.revertedWith("Sale period has ended")
    })

    it('Enable Claimed', async () => {
        // Cannot be done by non Owner
        await expect(
            fairLaunch
                .connect(nonDeployer)
                .enableClaim()
        ).to.be.revertedWith("Ownable: caller is not the owner")

        // Success Enable Claim
        await expect(
            fairLaunch
                .connect(deployer)
                .enableClaim()
        ).to.emit(fairLaunch, "ClaimEnabled")

        expect(await fairLaunch.claimEnabled()).to.be.true
    })


    it('Claim', async () => {
        // Price should be
        // (40_000 * 10^6) * 10^9 / (350_000*10^9) = 114_285
        const finalPriceCalculated = ethers.utils.parseUnits("0.114285", usdcDecimals)
        const finalPrice = await fairLaunch.finalPrice();
        expect(finalPrice).to.be.eq(finalPriceCalculated)
               
        const investAmount = ethers.utils.parseUnits("2500", usdcDecimals)
        const issueAmount = investAmount.mul(ethers.utils.parseUnits("1", frockDecimals)).div(finalPrice)
        
        // Claim NRT
        const claims = investors.map((investor: SignerWithAddress) => {
            expect(
                fairLaunch.connect(investor).claimRedeemable()
            ).to.emit(fairLaunch, "Claimed")
            .withArgs(investor.address, issueAmount)        
        })          
        await Promise.all(claims)
        const balances = investors.map((investor: SignerWithAddress) => nrt.balanceOf(investor.address))                
        const getBalances = await Promise.all(balances)
        getBalances.map((balance) => expect(issueAmount).to.be.eq(balance))

        // Only able to redeem once
        await expect(
            fairLaunch.connect(user1).claimRedeemable()
        ).to.be.revertedWith('Tokens already claimed')

        // No Amount to redeem
        await expect(
            fairLaunch.connect(notInvestor).claimRedeemable()
        ).to.be.revertedWith('No investment made')
        await expect(
            fairLaunch.connect(user2).claimRedeemable()
        ).to.be.revertedWith('No investment made')
    })

    it("Not able to redeem before Redeem enabled", async() => {    
        const redeems = investors.map((investor: SignerWithAddress) => {
            expect(
                fairLaunch.connect(investor).claimRedeemable()
            ).to.be.reverted                 
        })          
        await Promise.all(redeems)
    })

    it("Enable Redeem", async() => {
         // Cannot be done by non Owner
         await expect(
            fairLaunch
                .connect(nonDeployer)
                .enableRedeem()
        ).to.be.revertedWith("Ownable: caller is not the owner")
        expect(await fairLaunch.redeemEnabled()).to.be.false

        // Success Enable Redeem
        await expect(
            fairLaunch
                .connect(deployer)
                .enableRedeem()
        ).to.emit(fairLaunch, "RedeemEnabled")

        expect(await fairLaunch.redeemEnabled()).to.be.true
    })

    it("Redeem", async() => {
        // Price should be
        // (40_000 * 10^6) * 10^9 / (350_000*10^9) = 114_285
        const finalPriceCalculated = ethers.utils.parseUnits("0.114285", usdcDecimals)
        const finalPrice = await fairLaunch.finalPrice();
        expect(finalPrice).to.be.eq(finalPriceCalculated)
                     
        const investAmount = ethers.utils.parseUnits("2500", usdcDecimals)
        const redeemAmount = investAmount.mul(ethers.utils.parseUnits("1", frockDecimals)).div(finalPrice)
        
        // Claim NRT
        const redeems = investors.map((investor: SignerWithAddress) => {
            expect(
                fairLaunch.connect(investor).redeem()
            ).to.emit(fairLaunch, "Redeemed")
            .withArgs(investor.address, redeemAmount)        
        })          
        await Promise.all(redeems)
        const balances = investors.map((investor: SignerWithAddress) => frock.balanceOf(investor.address))                
        const getBalances = await Promise.all(balances)
        getBalances.map((balance) => expect(redeemAmount).to.be.eq(balance))

        // Only able to redeem once
        await expect(
            fairLaunch.connect(user1).redeem()
        ).to.be.revertedWith('no amount issued')

        // No Amount to redeem
        await expect(
            fairLaunch.connect(notInvestor).redeem()
        ).to.be.revertedWith('no amount issued')
        await expect(
            fairLaunch.connect(user2).redeem()
        ).to.be.revertedWith('no amount issued')
    })

    it('Withdraw Treasury', async () => {
        const investAmount = ethers.utils.parseUnits("40000", usdcDecimals)
        const treasuryUsdcBalanceBefore = await usdc.balanceOf(treasury.address)
        await fairLaunch.connect(deployer).withdrawInvestablePool()
        const treasuryUsdcBalanceAfter = await usdc.balanceOf(treasury.address)
        expect(treasuryUsdcBalanceAfter).to.be.eq(treasuryUsdcBalanceBefore.add(investAmount))
    })

    it('Withdraw Launch Token', async () => {
        const frockBalanceOfSaleContractBefore = await frock.balanceOf(fairLaunch.address)
        const frockBalanceOfdeployerBefore = await frock.balanceOf(deployer.address)
        
        await fairLaunch.connect(deployer).withdrawLaunchtoken(frockBalanceOfSaleContractBefore)

        const frockBalanceOfSaleContractAfter = await frock.balanceOf(fairLaunch.address)        
        const frockBalanceOfdeployerAfter = await frock.balanceOf(deployer.address)

        expect(frockBalanceOfSaleContractAfter).to.be.eq(0)
        expect(frockBalanceOfdeployerAfter).to.be.eq(
            frockBalanceOfdeployerBefore.add(frockBalanceOfSaleContractBefore)
        )

    })


});
