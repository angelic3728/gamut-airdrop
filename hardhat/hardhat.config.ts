import { HardhatUserConfig } from "hardhat/config"
import "dotenv/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-deploy"
import "hardhat-gas-reporter"
import "hardhat-watcher"
import "solidity-coverage"

const accounts = {
  mnemonic: process.env.MNEMONIC || 'test test test test test test test test test test test junk',
  accountsBalance: '990000000000000000000',
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
          enabled: false,
          runs: 200
      }
    }
  },  
  defaultNetwork: 'hardhat',
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      default: 1,
    },
    alice: {
      default: 2,
    },
    bob: {
      default: 3,
    },
    carol: {
      default: 4,
    },
    dave: {
      default: 5,
    },
    eve: {
      default: 6,
    },
    feeTo: {
      default: 7,
    },
  },
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
    },
    hardhat: {
      blockGasLimit: 10000000,
      chainId: 31337,
      accounts,
      live: false,
      saveDeployments: true,
      tags: ['test', 'local'],
    },
    mainnet: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
        accounts,
        chainId: 1,
        forking: {
            enabled: process.env.FORKING === 'true',
            url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: 11829739,
        },
    },
    goerli: {
        url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
        accounts,
        chainId: 5,
        live: true,
        saveDeployments: true,
        tags: ['staging'],
        blockGasLimit: 30000000,
        gas: 3000000
    },
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts'],
      verbose: true,
    },
  },
  paths: {
      artifacts: 'artifacts',
      cache: 'cache',
      deploy: 'deploy',
      deployments: 'deployments',
      imports: 'imports',
      sources: 'contracts',
      tests: 'test',
  }
}

export default config
