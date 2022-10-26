import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import hre from "hardhat"

const main = async function () {
  deployFunction(hre)
}

const deployFunction: DeployFunction = async function ({
  deployments,
  getChainId,
  getNamedAccounts,
  ethers
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments
  const chainId = parseInt(await getChainId())
  const { deployer } = await getNamedAccounts()
  console.log(chainId, deployer)

  const latestBlock = await hre.ethers.provider.getBlock("latest")

  const merkleRoot = "0x2a8c2da021f5f916b19975c27e2ce245517cc4d69949362f6e9ad001316a85d7"
  const startTime = latestBlock.timestamp + 1 * 60 * 60
  const endTime = startTime + 1 * 60 * 60
  const periodPerSnapShot = 10 * 60 // per 12s -> 20min
  
  const result1 = await deploy("RegistrationToken", {
    from: deployer,
    args: ["RegistrationToken", "RegistrationToken"],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Registration Token is deployed to ${result1.address}`)

  const result2 = await deploy("Mint", {
    from: deployer,
    args: [merkleRoot, startTime, endTime, periodPerSnapShot, result1.address],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Mint Contract is deployed to ${result2.address}`)

  const result3 = await deploy("Airdrop", {
    from: deployer,
    args: ["0xe70722418800921831b4f0E74d5a6FE187a35099", result2.address],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Airdrop Contract is deployed to ${result3.address}`)

  const registrationToken = await ethers.getContractAt('RegistrationToken', result1.address)
  await registrationToken.transferOwnership(result2.address)

  console.log(`Transfer ownership of Registration Token to Mint contract`)

  const mintContract = await ethers.getContractAt('Mint', result2.address)
  await mintContract.setAirdropContract(result3.address)

  console.log(`Set airdrop contract to mint contract`)
}

deployFunction.dependencies = []

deployFunction.tags = ["Lock"]

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
