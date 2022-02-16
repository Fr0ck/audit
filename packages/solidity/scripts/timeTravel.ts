import { network, ethers } from 'hardhat';

/**
 * @dev to run this function :  yarn solidity run-local scripts/timeTravel.ts --time [time_in_timestamp]
 * @dev example :  yarn solidity run-local scripts/timeTravel.ts --time 1644681601
 * @dev You cannot time travel to time that already passed, only able time travel to future time
 */
async function main() {
  console.log("Let's Time Travel")
  var args = process.argv.slice(2);
  if(args && args[0] === "--time" && args[1]) {
    const timeDestination = parseInt(args[1])    
    const latestBlock = await ethers.provider.getBlock("latest")
    const latestTimestamp = latestBlock.timestamp

    if(timeDestination > latestTimestamp) {
      await network.provider.send('evm_setNextBlockTimestamp', [timeDestination]);
      await network.provider.send('evm_mine');
      console.log(`You're Time Travel to ${timeDestination}`)
    } else {
      console.log(`You Cannot Time Travel to Past Time`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
