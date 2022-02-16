import { config as dotEnvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/types';

import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import '@asheliahut/hardhat-react';
import '@openzeppelin/hardhat-upgrades';
// TODO: reenable solidity-coverage when it works
// import "solidity-coverage";
import './hardhat-tasks';

dotEnvConfig({ path: '../../.env' });

const {
  PRIVATE_KEY_0 = "",
} = process.env;


const { OPTIMIZER_DISABLED = false, OPTIMIZER_RUNS = '200' } = process.env;


const solcSettings = {
  optimizer: {
    enabled: !OPTIMIZER_DISABLED,
    runs: +OPTIMIZER_RUNS,
  },
  outputSelection: {
    '*': {
      '*': ['storageLayout'],
    },
  },
};

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.5',
        settings: solcSettings,
      },
    ],
  },
  networks: {
    hardhat: {
      tags: ['test', 'local'],
      chainId: 250,
      forking: {        
        url: 'https://nd-248-371-542.p2pify.com/cbfc247834023d478a85c3565f4ffc06',
        blockNumber: 30188747,
      },
    },
    localhost: {
      tags: ['local'],
      timeout: 60_000,
    },
    fantom: {
      tags: ['test'],      
      url : 'https://speedy-nodes-nyc.moralis.io/40036aec0d5bfd15ac6417d6/fantom/mainnet',
      accounts: [
        PRIVATE_KEY_0
      ],
    },
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
  mocha: {
    timeout: 60_000,
  },
  etherscan: {
    apiKey: "ZAUUEEN3BB9BM4W2DX1EMBQF3QX34PS8QP",
  },
  paths: {
    deployments: "../contracts/deployments",
    react: "../react-app/src/generated",
  },
  typechain: {
    target: "ethers-v5",
    outDir: "../react-app/src/generated/typechain",
    externalArtifacts: ["../contracts/deployments/external/*.json"],
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    wrongAdmin: {
      default : '0x976EA74026E726554dB657fA54763abd0C3a0aa9'
    },    
    usdcHolder: {
      default : '0x93c08a3168fc469f3fc165cd3a471d19a37ca19e',
      fantom : '0x93c08a3168fc469f3fc165cd3a471d19a37ca19e'
    },  
    dividenDistributor: {
      default : '0x627306090abaB3A6e1400e9345bC60c78a8BEf57'
    },
    treasury: {
      default : '0x0b7b7AE45bC137Ea0A36422eaC5Bc52e7657A225'
    },
    marketing: {
      default : '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
    },
    wftmHolder: {
      default : '0x93c08a3168fc469f3fc165cd3a471d19a37ca19e'
    },
    snapshoter: {
      default: 19
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    user3: {
      default: 3,
    },
    user4: {
      default: 4,
    },
    user5: {
      default: 5,
    },
    user6: {
      default: 6,
    },
    user7: {
      default: 7,
    },
    user8: {
      default: 8,
    },
    user9: {
      default: 9,
    },
    user10: {
      default: 10,
    },
    user11: {
      default: 11,
    },
    user12: {
      default: 12,
    },
    user13: {
      default: 13,
    },
    user14: {
      default: 14,
    },
    user15: {
      default: 15,
    },
    user16: {
      default: 16,
    },
    user17: {
      default: 17,
    },
    notInvestor: {
      default: 18,
    },        
  },
  react: {
    providerPriority: ["web3modal", "fantom", "hardhat"],
    fallbackProvider: "fantom",
  },
};

export default config;
