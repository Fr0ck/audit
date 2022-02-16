import { deployments, ethers, upgrades } from 'hardhat';
import { FrockTokenV1, FrockProxy, ReceiverContract } from '@project/contracts/typechain/generated';
import { SignerWithAddress } from '../utils/interfaces';
import { expect } from 'chai';

describe("EIP1363", async () => {    
    let frockToken: FrockTokenV1
    let frockProxy: FrockProxy    
    let receiverContract: ReceiverContract
    let deployer: SignerWithAddress    
    let user1: SignerWithAddress    

    before(async () => {
        await deployments.fixture(['Frock', "ReceiverContract"], {
            keepExistingDeployments: true,
        });                

        frockProxy = await ethers.getContract<FrockProxy>('FrockProxy');
        frockToken = (await ethers.getContract<FrockTokenV1>('FrockTokenV1')).attach(frockProxy.address);

        receiverContract = await ethers.getContract<ReceiverContract>('ReceiverContract');        

        ({            
            deployer,
            user1,            
        } = await ethers.getNamedSigners())
    })

    it("Transfer From and Call, No Tax Deduction", async() => {
        const transferAmount = ethers.utils.parseUnits("100",6); 
        const senderBalanceBefore = await frockToken.balanceOf(deployer.address)
        const recepientBalanceBefore = await frockToken.balanceOf(receiverContract.address)

        await frockToken.connect(deployer)['transferAndCall(address,uint256)'](receiverContract.address, transferAmount);
        
        const senderBalanceAfter = await frockToken.balanceOf(deployer.address)
        const recepientBalanceAfter = await frockToken.balanceOf(receiverContract.address)

        expect(senderBalanceAfter).to.be.eq(senderBalanceBefore.sub(transferAmount))
        expect(recepientBalanceAfter).to.be.eq(recepientBalanceBefore.add(transferAmount))
    })
    
    it("Transfer From and Call with Tax Deduction", async() => {
        await frockToken.connect(deployer).transfer(user1.address, ethers.utils.parseUnits("100",6));

        const transferAmount = ethers.utils.parseUnits("100",6); 
        const senderBalanceBefore = await frockToken.balanceOf(user1.address)
        const recepientBalanceBefore = await frockToken.balanceOf(receiverContract.address)

        await frockToken.connect(user1)['transferAndCall(address,uint256)'](receiverContract.address, ethers.utils.parseUnits("100",6));        
        
        const senderBalanceAfter = await frockToken.balanceOf(user1.address)
        const recepientBalanceAfter = await frockToken.balanceOf(receiverContract.address)

        const amountAfterTax = transferAmount.mul(78).div(100);
        expect(senderBalanceAfter).to.be.eq(senderBalanceBefore.sub(transferAmount))
        expect(recepientBalanceAfter).to.be.eq(recepientBalanceBefore.add(amountAfterTax))
    })
});