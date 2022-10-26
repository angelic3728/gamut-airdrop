import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from 'merkletreejs'

const {keccak256} = ethers.utils

interface AirdropList {
  address: string,
  registration: number,
  snapshots: number[][],
  averageLiquidity: number[],
  averageDollarValue: number,
  multiplier: number,
  percent: number,
  amount: string
}

function calculateMultiplier(airdropList: AirdropList[], liquidityTokenPrices: number[], airdropAmount: number) {
  let totalMultiplier = 0
  for (let i = 0; i < airdropList.length; i++) {
    for (let j = 0; j < airdropList[i].snapshots.length; j++) {
      for (let k = 0; k < liquidityTokenPrices.length; k++) {
        airdropList[i].averageLiquidity[k] += airdropList[i].snapshots[j][k] / airdropList[i].snapshots.length
        airdropList[i].averageDollarValue += airdropList[i].snapshots[j][k] / airdropList[i].snapshots.length * liquidityTokenPrices[k]
      }
    }
    if (airdropList[i].registration == 1) {
      airdropList[i].multiplier = airdropList[i].averageDollarValue ? Math.log2(airdropList[i].averageDollarValue) / Math.log2(5) + 1 : 1
      totalMultiplier += airdropList[i].multiplier
    }
  }
  for (let l = 0; l < airdropList.length; l++) {
    airdropList[l].percent = 100 * airdropList[l].multiplier / totalMultiplier
    airdropList[l].amount = Math.floor(airdropAmount * airdropList[l].multiplier / totalMultiplier).toString()
  }
  return airdropList
}

function convertToUint256(data: string) {
  const hexValue = Number(data).toString(16)
  const zeroLength = 64 - hexValue.length
  // console.log(zeroLength)
  let newData = hexValue
  for(let i = 0; i < zeroLength; i++) {
    newData = "0" + newData
  }
  return newData
}

describe("Test three contracts", () => {

  async function beforeMint() {
    // get users
    const [owner, signer1, signer2, signer3, nonSigner1] = await ethers.getSigners()
    // console.log(signer1)
    let userList = [owner.address, signer1.address, signer2.address, signer3.address]
    userList.sort()
  
    // deploy registration token
    const Registration = await ethers.getContractFactory("RegistrationToken")
    const registration = await Registration.deploy("RegistrationToken", "RegistrationToken")
  
    // calculate merkletreeRoot
    const leaves = userList.map((user) => keccak256(user))
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const hexRoot = merkleTree.getHexRoot()
  
    // set start time, end time
      const ONE_DAY_IN_SECS = 1 * 24 * 60 * 60
      const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60
  
      const startTime = (await time.latest() + ONE_DAY_IN_SECS)
      const endTime = startTime + ONE_WEEK_IN_SECS
  
    // deploy mint contract
    const Mint = await ethers.getContractFactory("Mint")
    const mint = await Mint.deploy(hexRoot, startTime, endTime, registration.address)
  
    // transfer registration token ownership
    await registration.transferOwnership(mint.address)


    return {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint}
  }

  async function beforeAirdrop() {
    // get users
    const [owner, signer1, signer2, signer3, nonSigner1] = await ethers.getSigners()
    //deploy usdt token
    const Usdt = await ethers.getContractFactory("USDT")
    const usdt = await Usdt.deploy("USD Token", "USDT", "100000000000000000000000000000000")

    // address, snapshot1, snapshot2, snapshot3, average liquidity, multiplier, average percent, airdrop amount
    let airdropList: AirdropList[] = [
      {
        address: owner.address,
        registration: 1,
        snapshots: [
          [100, 0, 5000, 0, 0],
          [400, 100, 7000, 0, 0],
          [15000, 500, 0, 10, 400],
        ],
        averageLiquidity: [3875, 150, 3000, 2.5, 100],
        averageDollarValue: 21687.75,
        multiplier: 7.203720434,
        percent: 30.6684,
        amount: "0x40F15F79DE875A700000"
      },
      {
        address: signer1.address,
        registration: 1,
        snapshots: [
          [8000, 1000, 5000, 10000, 0],
          [25000, 3000, 1000, 5000, 5000],
          [21000, 3000, 2000, 6000, 7000]
        ],
        averageLiquidity: [18000, 2333.333333333, 2666.666666667, 7000, 4000],
        averageDollarValue: 429366.666666667,
        multiplier: 9.058755441,
        percent: 38.5659,
        amount: "0x51AA9DC4A70BB50C0000"
      },
      {
        address: signer2.address,
        registration: 1,
        snapshots: [
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0]
        ],
        averageLiquidity: [0, 0, 0, 0, 0],
        averageDollarValue: 0,
        multiplier: 1,
        percent: 4.2573,
        amount: "0x903E30F729431140000"
      },
      {
        address: signer3.address,
        registration: 1,
        snapshots: [
          [5000, 0, 0, 0, 0],
          [7000, 0, 0, 0, 0],
          [15000, 0, 0, 0, 0]
        ],
        averageLiquidity: [9000, 0, 0, 0],
        averageDollarValue: 4500,
        multiplier: 6.226565505,
        percent: 26.5084,
        amount: "0x38223B80D4C660700000"
      }
    ]
    const liquidityTokenPrices = [0.5, 5, 3, 0.1, 100]
    const airdropAmount = 1000000 * 1000000000000000000

    const _airdropList: AirdropList[] = [
      {
        "address": "0x8082df9449fa8945e677621cb3a6bead210ccc0d",
        "registration": 1,
        "snapshots": [
          [100, 0, 5000, 0, 0],
          [400, 100, 7000, 0, 0],
          [15000, 500, 0, 10, 400]
        ],
        "averageLiquidity": [3875, 150, 3000, 2.5, 100],
        "averageDollarValue": 21687.75,
        "multiplier": 7.203720434,
        "percent": 30.6684,
        "amount": "306684000000000000000000"
      },
      {
        "address": "0xbb0382438e50fd3c1cf4fefebc5f4a8e24bf9006",
        "registration": 1,
        "snapshots": [
          [8000, 1000, 5000, 10000, 0],
          [25000, 3000, 1000, 5000, 5000],
          [21000, 3000, 2000, 6000, 7000]
        ],
        "averageLiquidity": [18000, 2333.333333333, 2666.666666667, 7000, 4000],
        "averageDollarValue": 429366.666666667,
        "multiplier": 9.058755441,
        "percent": 38.5659,
        "amount": "385659000000000000000000"
      },
      {
        "address": "0xd545a7f27ef82b003147d3bec69db1fde3c518e8",
        "registration": 1,
        "snapshots": [
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0]
        ],
        "averageLiquidity": [0, 0, 0, 0, 0],
        "averageDollarValue": 0,
        "multiplier": 1,
        "percent": 4.2573,
        "amount": "42573000000000000000000"
      },
      {
        "address": "0x0000000000000000000000000000000000000013",
        "registration": 1,
        "snapshots": [
          [5000, 0, 0, 0, 0],
          [7000, 0, 0, 0, 0],
          [15000, 0, 0, 0, 0]
        ],
        "averageLiquidity": [9000, 0, 0, 0],
        "averageDollarValue": 4500,
        "multiplier": 6.226565505,
        "percent": 26.5084,
        "amount": "265084000000000000000000"
      }
    ]
    _airdropList.sort((a,b) => a.address > b.address ? 1 : 0)
    const _leaves = _airdropList.map((each) => keccak256(each.address + convertToUint256(each.amount)))
    const _merkleTree = new MerkleTree(_leaves, keccak256, { sortPairs: true })
    const _hexRoot = _merkleTree.getHexRoot()

    // airdropList = calculateMultiplier(airdropList, liquidityTokenPrices, airdropAmount)
    airdropList.sort((a,b) => a.address > b.address ? 1 : 0)
    // console.log(airdropList)
    
    // calculate merkletreeRoot
    const leaves = airdropList.map((each) => keccak256(each.address + convertToUint256(each.amount)))
    // console.log(leaves)
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const hexRoot = merkleTree.getHexRoot()
    // console.log(hexRoot)
  
    // deploy airdrop contract
    const Airdrop = await ethers.getContractFactory("Airdrop")
    const airdrop = await Airdrop.deploy(hexRoot, usdt.address)

    return {owner, signer1, signer2, signer3, nonSigner1, usdt, airdrop, airdropList, merkleTree, _hexRoot}
 }

  describe('Registration token', () => {
    it("registration token ownership", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      expect(await registration.owner()).to.equal(mint.address)
    })
    it("check transfer is not working", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await expect(registration.transfer(signer1.address, "1000000")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
    })
  })
  describe('Mint contract', () => {
    it("test startTime", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      expect(await mint.startTime()).to.equal(startTime)
    })
    it("test endTime", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      expect(await mint.endTime()).to.equal(endTime)
    })
    it("test owership", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      expect(await mint.owner()).to.equal(owner.address)
    })
    it("Should revert to mint with not started", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "Not started"
      )
    })
    it("Should revert to mint with ended", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(endTime + 1)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "Ended"
      )
    })
    it("Should revert to mint with invalid proof", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(nonSigner1.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.connect(nonSigner1).mint(hexProof)).to.be.revertedWith(
        "INVALID_PROOF"
      )
    })
    it("Should mint", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      expect(await mint.mint(hexProof)).not.to.be.reverted
    })
    it("Should revert to mint with already minted", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "AlREADY_MINTED"
      )
    })
    it("Check user info", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      const userInfo = await mint.userInfo(owner.address)
      expect(userInfo).to.be.equal(startTime + 1)
    })
    it("Check users", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      expect(await mint.totalUsers()).to.be.equal(1)
      expect(await mint.users(0)).to.be.equal(owner.address)
    })
    it("Check totalUsers", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, registration, mint} = await beforeMint()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      const totalUsers = await mint.totalUsers()
      expect(totalUsers).to.be.equal(1)
    })
  })
  describe('Airdrop contract', () => {
    it("check airdrop token", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, usdt, airdrop, airdropList, merkleTree} = await beforeAirdrop()
      expect(await airdrop.airdropToken()).to.equal(usdt.address)
      expect(await usdt.balanceOf(airdrop.address)).to.equal("0")
    })
    it("check airdrop state", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, usdt, airdrop, airdropList, merkleTree} = await beforeAirdrop()
      expect(await airdrop.airdropStarted()).to.equal(false)
    })
    it("start airdrop", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, usdt, airdrop, airdropList, merkleTree} = await beforeAirdrop()
      await expect(airdrop.startAirdrop("1000000000000000000000000")).to.be.revertedWith(
        "Airdrop Token doesn't allowed"
      )
      await usdt.approve(airdrop.address, "1000000000000000000000000")
      await airdrop.startAirdrop("1000000000000000000000000")
      expect(await usdt.balanceOf(airdrop.address)).to.equal("1000000000000000000000000")
      expect(await airdrop.airdropStarted()).to.equal(true)
    })
    it("airdrop", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, usdt, airdrop, airdropList, merkleTree} = await beforeAirdrop()
      await usdt.approve(airdrop.address, "1000000000000000000000000")
      await airdrop.startAirdrop("1000000000000000000000000")
      const airdropData = airdropList.find(each => each.address == owner.address.toLowerCase())
      if (!airdropData) return console.log("User is not in the list")
      const amount = airdropData.amount
      const leave = keccak256(owner.address + convertToUint256(amount))
      const hexProof = merkleTree.getHexProof(leave)
      await expect(airdrop.airdrop(amount + 1, hexProof)).to.be.revertedWith(
        "Validation failed"
      )
      expect(await airdrop.airdrop(amount, hexProof)).not.to.be.reverted
      expect(await airdrop.airdropStates(owner.address)).to.be.equal(true)
      await expect(airdrop.airdrop(amount, hexProof)).to.be.revertedWith(
        "Airdrop permitted once"
      )
    })
  })
});
