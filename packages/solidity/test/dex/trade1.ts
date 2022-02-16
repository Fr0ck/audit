import { deployments, ethers, upgrades } from 'hardhat';
import { SpookyFactory, SpookyRouter, FrockTokenV1, FrockProxy, WFTM, UniswapV2Pair } from '@project/contracts/typechain/generated';
import { SignerWithAddress } from '../utils/interfaces';
import { abi as abiPair } from "../../../contracts/deployments/external/UniswapV2Pair.json"
import { expect, use } from 'chai';


/*
Buy Frock Token 
With ERC20 to ERC20 Pair
*/
describe("Trade 1", async () => {
    let pancakeFactory: SpookyFactory;
    let pancakeRouter: SpookyRouter;
    let liquidityPool: UniswapV2Pair
    let frockToken: FrockTokenV1
    let frockProxy: FrockProxy
    let WFTMToken: WFTM
    let wftmHolder: SignerWithAddress
    let deployer: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress

    before(async () => {
        await deployments.fixture(['Frock'], {
            keepExistingDeployments: true,
        });
        
        pancakeFactory = await ethers.getContract<SpookyFactory>('SpookyFactory');
        pancakeRouter = await ethers.getContract<SpookyRouter>('SpookyRouter');

        frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
        frockToken = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);
        WFTMToken = await ethers.getContract<WFTM>('WFTM');

        ({
            wftmHolder,
            deployer,
            user1,
            user2
        } = await ethers.getNamedSigners())
        
        // Cek Token and Transfer Token to Deployer
        await WFTMToken.connect(wftmHolder).transfer(deployer.address, ethers.utils.parseUnits("200", 18))                       
        // Transfer Token to User
        await frockToken.connect(deployer).transfer(user1.address, ethers.utils.parseUnits("100", 6))        
        await WFTMToken.connect(wftmHolder).transfer(user1.address, ethers.utils.parseUnits("100", 18))        
        await frockToken.connect(deployer).transfer(user2.address, ethers.utils.parseUnits("100", 6))        
        await WFTMToken.connect(wftmHolder).transfer(user2.address, ethers.utils.parseUnits("100", 18))

    })

    it('Make Liquidity Pool with WFTM', async() => {
        await pancakeFactory.connect(deployer).createPair(frockToken.address, WFTMToken.address);

        const pairAddress = await pancakeFactory.getPair(frockToken.address, WFTMToken.address);
        const pairAddressReverse = await pancakeFactory.getPair(WFTMToken.address, frockToken.address, );        

        liquidityPool = new ethers.Contract(pairAddress, abiPair, ethers.provider) as UniswapV2Pair;

        // Add Liquidity
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp        
        await frockToken.connect(deployer).approve(pancakeRouter.address, ethers.utils.parseUnits("100", 6));
        await WFTMToken.connect(deployer).approve(pancakeRouter.address, ethers.utils.parseUnits("100", 18));
        await pancakeRouter.connect(deployer).addLiquidity(
            frockToken.address, WFTMToken.address,
            ethers.utils.parseUnits("100", 6), ethers.utils.parseUnits("100", 18),
            ethers.BigNumber.from("0"),ethers.BigNumber.from("0"), 
            deployer.address, 
            currentTimestamp+100
        )
        
        // Check Reserve
        const reserve = await liquidityPool.getReserves();
        expect(reserve[0]).to.be.eq(ethers.utils.parseUnits("100", 6));
        expect(reserve[1]).to.be.eq(ethers.utils.parseUnits("100", 18));        
    })

    it('Make User 1 as Free Fee Account', async () => {
        // Set User1 as free fee account
        await expect(frockToken.connect(deployer).excludeFromFees(user1.address, true))
        .to.emit(frockToken, 'ExcludeFromFees')
        .withArgs(user1.address, true);
    })

    it('Trade by Free Fee Account with WFTM (swapExactTokensForTokens)', async() => {            
        // Value Before Transaction
        const WFTMUser1Before = await WFTMToken.balanceOf(user1.address);
        const FrockUser1Before = await frockToken.balanceOf(user1.address);

        // Wanna Buy FROCK Token
        const amountIn = ethers.utils.parseUnits("10", 18);
        const amountsOut = (await pancakeRouter.getAmountsOut(amountIn, [
            WFTMToken.address, frockToken.address
        ]))[1];
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp
        await WFTMToken.connect(user1).approve(pancakeRouter.address, amountIn);
        await pancakeRouter.connect(user1).swapExactTokensForTokens(
            amountIn, // In => WFTM
            amountsOut,  // Out => Frock
            [
                WFTMToken.address, frockToken.address
            ], 
            user1.address, 
            currentTimestamp+10000
        )

            
        // Value After Transaction
        const WFTMUser1After = await WFTMToken.balanceOf(user1.address);
        const FrockUser1After = await frockToken.balanceOf(user1.address);
        const reserve = await liquidityPool.getReserves();     

        expect(WFTMUser1After).to.be.eq(WFTMUser1Before.sub(amountIn))
        expect(FrockUser1After).to.be.eq(FrockUser1Before.add(amountsOut))
        expect(reserve[0]).to.be.eq(ethers.utils.parseUnits("100", 6).sub(amountsOut));
        expect(reserve[1]).to.be.eq(ethers.utils.parseUnits("100", 18).add(amountIn));
        
    })

    it('Trade by Free Fee Account with WFTM (swapTokensForExactTokens)', async() => {        
        
        // Value Before Transaction
        const WFTMUser1Before = await WFTMToken.balanceOf(user1.address);
        const FrockUser1Before = await frockToken.balanceOf(user1.address);

        // Wanna Buy FROCK Token
        const amountOut = ethers.utils.parseUnits("10", 6);
        const amountsInMax = (await pancakeRouter.getAmountsIn(amountOut, [
            WFTMToken.address, frockToken.address
        ]))[0];        
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp
        await WFTMToken.connect(user1).approve(pancakeRouter.address, amountsInMax);
        await pancakeRouter.connect(user1).swapTokensForExactTokens(
            amountOut, // Out => Frock
            amountsInMax,  // In => WFTM
            [
                WFTMToken.address, frockToken.address
            ], 
            user1.address, 
            currentTimestamp+10000
        )

            
        // Value After Transaction
        const WFTMUser1After = await WFTMToken.balanceOf(user1.address);
        const FrockUser1After = await frockToken.balanceOf(user1.address);        

        expect(WFTMUser1After).to.eq(WFTMUser1Before.sub(amountsInMax))
        expect(FrockUser1After).to.eq(FrockUser1Before.add(amountOut))          
    })

    it('Trade by NON Free Fee Account with WFTM (swapExactTokensForTokensSupportingFeeOnTransferTokens)', async() => {            
        // Value Before Transaction
        const WFTMUser2Before = await WFTMToken.balanceOf(user2.address);
        const FrockUser2Before = await frockToken.balanceOf(user2.address);
        const reserveBefore = await liquidityPool.getReserves();     
    
        // Wanna Buy FROCK Token
        const amountIn = ethers.utils.parseUnits("1", 18);
        const amountsOutMin = (await pancakeRouter.getAmountsOut(amountIn, [
            WFTMToken.address, frockToken.address
        ]))[1].mul(78).div(100);
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp
        await WFTMToken.connect(user2).approve(pancakeRouter.address, amountIn);
        await pancakeRouter.connect(user2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountIn, // In => WFTM
            amountsOutMin,  // Out => Frock
            [
                WFTMToken.address, frockToken.address
            ], 
            user2.address, 
            currentTimestamp+10000
        )    
            
        // Value After Transaction
        const WFTMUser2After = await WFTMToken.balanceOf(user2.address);
        const FrockUser2After = await frockToken.balanceOf(user2.address);
        const reserveAfter = await liquidityPool.getReserves();     
    
        expect(WFTMUser2After).to.be.eq(WFTMUser2Before.sub(amountIn))
        expect(FrockUser2After).to.be.gte(FrockUser2Before.add(amountsOutMin))
        expect(reserveAfter[0]).to.be.lte(reserveBefore[0].sub(amountsOutMin));
        expect(reserveAfter[1]).to.be.eq(reserveBefore[1].add(amountIn));                
    })


    it('Blacklist DEX and Disable to trade', async() => {            
        // Blacklist
        const pairAddress = await pancakeFactory.getPair(frockToken.address, WFTMToken.address);
        await frockToken.connect(deployer).setBlacklist(pairAddress, true);                
        // Wanna Buy FROCK Token
        const amountIn = ethers.utils.parseUnits("1", 18);
        const amountsOutMin = (await pancakeRouter.getAmountsOut(amountIn, [
            WFTMToken.address, frockToken.address
        ]))[1].mul(78).div(100);
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp
        await WFTMToken.connect(user2).approve(pancakeRouter.address, amountIn);
        await expect(
            pancakeRouter.connect(user2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn, // In => WFTM
                amountsOutMin,  // Out => Frock
                [
                    WFTMToken.address, frockToken.address
                ], 
                user2.address, 
                currentTimestamp+10000
            )   
        ).to.be.revertedWith('UniswapV2: TRANSFER_FAILED');                 
    })


    it('Remove Blacklist DEX and Enable to trade', async() => {            
        // Blacklist
        const pairAddress = await pancakeFactory.getPair(frockToken.address, WFTMToken.address);
        await frockToken.connect(deployer).setBlacklist(pairAddress, false);                
        // Wanna Buy FROCK Token
        // Value Before Transaction
        const WFTMUser2Before = await WFTMToken.balanceOf(user2.address);
        const FrockUser2Before = await frockToken.balanceOf(user2.address);
        const reserveBefore = await liquidityPool.getReserves();     
    
        // Wanna Buy FROCK Token
        const amountIn = ethers.utils.parseUnits("1", 18);
        const amountsOutMin = (await pancakeRouter.getAmountsOut(amountIn, [
            WFTMToken.address, frockToken.address
        ]))[1].mul(78).div(100);
        const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp
        await WFTMToken.connect(user2).approve(pancakeRouter.address, amountIn);
        await pancakeRouter.connect(user2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountIn, // In => WFTM
            amountsOutMin,  // Out => Frock
            [
                WFTMToken.address, frockToken.address
            ], 
            user2.address, 
            currentTimestamp+10000
        )    
            
        // Value After Transaction
        const WFTMUser2After = await WFTMToken.balanceOf(user2.address);
        const FrockUser2After = await frockToken.balanceOf(user2.address);
        const reserveAfter = await liquidityPool.getReserves();     
    
        expect(WFTMUser2After).to.be.eq(WFTMUser2Before.sub(amountIn))
        expect(FrockUser2After).to.be.gte(FrockUser2Before.add(amountsOutMin))
        expect(reserveAfter[0]).to.be.lte(reserveBefore[0].sub(amountsOutMin));
        expect(reserveAfter[1]).to.be.eq(reserveBefore[1].add(amountIn));                        
    })
    
});