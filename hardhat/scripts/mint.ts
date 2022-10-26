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
  const startTime = latestBlock.timestamp + 5 * 60 // start mint after 5 minutes
  const endTime = startTime + 30 * 60 * 60 // end mint after 30 minutes from start
  
  const result1 = await deploy("RegistrationToken", {
    from: deployer,
    args: ["RegistrationToken", "RegistrationToken"],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Registration Token is deployed to ${result1.address}`)

  const result2 = await deploy("Mint", {
    from: deployer,
    args: [merkleRoot, startTime, endTime, result1.address],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Mint Contract is deployed to ${result2.address}`)

  const registrationToken = await ethers.getContractAt('RegistrationToken', result1.address)
  await registrationToken.transferOwnership(result2.address)

  console.log(`Transfer ownership of Registration Token to Mint contract`)
}

deployFunction.dependencies = []

deployFunction.tags = ["Lock"]

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
