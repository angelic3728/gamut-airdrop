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

  const merkleRoot = "0xf591294140b4f5c6beafbfbb338996f141276705edefcc9a92089775a8d42c89"
  const airdropToken = "0xe70722418800921831b4f0E74d5a6FE187a35099"

  const result3 = await deploy("Airdrop", {
    from: deployer,
    args: [merkleRoot, airdropToken],
    log: true,
    deterministicDeployment: false,
  })

  console.log(`Airdrop Contract is deployed to ${result3.address}`)
}

deployFunction.dependencies = []

deployFunction.tags = ["Lock"]

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
