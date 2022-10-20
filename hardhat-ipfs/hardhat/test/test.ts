import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from 'merkletreejs'

const {keccak256} = ethers.utils

describe("Test three contracts", () => {

  async function beforeTest () {
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
  
    // set start time, end time, periodPerSnapshot
      const ONE_DAY_IN_SECS = 1 * 24 * 60 * 60
      const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60
      const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60
  
      const startTime = (await time.latest() + ONE_WEEK_IN_SECS)
      const endTime = startTime + ONE_MONTH_IN_SECS
      const periodPerSnapshot = ONE_DAY_IN_SECS
  
    // deploy mint contract
    const Mint = await ethers.getContractFactory("Mint")
    const mint = await Mint.deploy(hexRoot, startTime, endTime, periodPerSnapshot, registration.address)
  
    // transfer registration token ownership
    await registration.transferOwnership(mint.address)
  
    //deploy usdt token
    const Usdt = await ethers.getContractFactory("USDT")
    const usdt = await Usdt.deploy("USD Token", "USDT", "100000000000000000000000000000000")
  
    // deploy airdrop contract
    const Airdrop = await ethers.getContractFactory("Airdrop")
    const airdrop = await Airdrop.deploy(usdt.address, mint.address)
  
    // set airdrop address in mint contract
    await mint.setAirdropContract(airdrop.address)
    return {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop}
  }

  describe('Registration token', () => {
    it("registration token ownership", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await registration.owner()).to.equal(mint.address)
    })
    it("check transfer is not working", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await expect(registration.transfer(signer1.address, "1000000")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
    })
  })
  describe('Mint contract', () => {
    it("test startTime", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await mint.startTime()).to.equal(startTime)
    })
    it("test endTime", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await mint.endTime()).to.equal(endTime)
    })
    it("test peoriodPerSnapshot", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await mint.periodPerSnapshot()).to.equal(periodPerSnapshot)
    })
    it("test owership", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await mint.owner()).to.equal(owner.address)
    })
    it("test airdrop contract", async() => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await mint.airdropContract()).to.equal(airdrop.address)
    })
    it("Should revert to mint with not started", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "Not started"
      )
    })
    it("Should revert to mint with ended", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(endTime + 1)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "Ended"
      )
    })
    it("Should revert to mint with invalid proof", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(nonSigner1.address)
      const hexProof = merkleTree.getHexProof(leave)
      await expect(mint.connect(nonSigner1).mint(hexProof)).to.be.revertedWith(
        "INVALID_PROOF"
      )
    })
    it("Should mint", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      expect(await mint.mint(hexProof)).not.to.be.reverted
    })
    it("Should revert to mint with already minted", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      await expect(mint.mint(hexProof)).to.be.revertedWith(
        "AlREADY_MINTED"
      )
    })
    it("Check user info", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      const userInfo = await mint.userInfo(owner.address)
      expect(userInfo.minted).to.be.equal(true)
      expect(userInfo.mintedTime).to.be.equal(startTime + 1)
      expect(userInfo.withdrawed).to.be.equal(false)
    })
    it("Check user multiplier", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      expect((await mint.getUserMultiplier(owner.address))[0]).to.be.equal(1)
      await time.increaseTo(startTime + periodPerSnapshot)
      expect((await mint.getUserMultiplier(owner.address))[0]).to.be.equal(1)
      await time.increaseTo(startTime + periodPerSnapshot + 1)
      expect((await mint.getUserMultiplier(owner.address))[0]).to.be.equal(2)
      await time.increaseTo(endTime)
      expect((await mint.getUserMultiplier(owner.address))[0]).to.be.equal(30)
      await time.increaseTo(endTime + 1)
      expect((await mint.getUserMultiplier(owner.address))[0]).to.be.equal(30)
    })
    it("check total multiplier with 1 user", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      expect(await mint.getTotalpoint()).to.be.equal(1)
      await time.increaseTo(startTime + periodPerSnapshot)
      expect(await mint.getTotalpoint()).to.be.equal(1)
      await time.increaseTo(startTime + periodPerSnapshot + 1)
      expect(await mint.getTotalpoint()).to.be.equal(2)
      await time.increaseTo(endTime)
      expect(await mint.getTotalpoint()).to.be.equal(30)
      await time.increaseTo(endTime + 1)
      expect(await mint.getTotalpoint()).to.be.equal(30)
    })
    it("check total multiplier with several users", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime)
      const leave = keccak256(owner.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.mint(hexProof)
      expect(await mint.getTotalpoint()).to.be.equal(1)
      await time.increaseTo(startTime + 10)
      const leave1 = keccak256(signer1.address)
      const hexProof1 = merkleTree.getHexProof(leave1)
      await mint.connect(signer1).mint(hexProof1)
      expect(await mint.getTotalpoint()).to.be.equal(2)
      await time.increaseTo(startTime + periodPerSnapshot)
      expect(await mint.getTotalpoint()).to.be.equal(2)
      await time.increaseTo(startTime + periodPerSnapshot + 10)
      expect(await mint.getTotalpoint()).to.be.equal(4)
      await time.increaseTo(startTime + periodPerSnapshot * 2 + 10)
      expect(await mint.getTotalpoint()).to.be.equal(6)
      const leave2 = keccak256(signer2.address)
      const hexProof2 = merkleTree.getHexProof(leave2)
      await mint.connect(signer2).mint(hexProof2)
      expect(await mint.getTotalpoint()).to.be.equal(7)
      await time.increaseTo(startTime + periodPerSnapshot * 3 + 5)
      const leave3 = keccak256(signer3.address)
      const hexProof3 = merkleTree.getHexProof(leave3)
      await mint.connect(signer3).mint(hexProof3)
      expect(await mint.getTotalpoint()).to.be.equal(11)
      await time.increaseTo(startTime + periodPerSnapshot * 4 + 10)
      expect(await mint.getTotalpoint()).to.be.equal(15)
      await time.increaseTo(endTime)
      expect(await mint.getTotalpoint()).to.be.equal(115)
      await time.increaseTo(endTime + periodPerSnapshot * 10 + 10)
      expect(await mint.getTotalpoint()).to.be.equal(115)
      expect(Number((await mint.getUserMultiplier(owner.address))[0]) + Number((await mint.getUserMultiplier(signer1.address))[0]) + Number((await mint.getUserMultiplier(signer2.address))[0]) + Number((await mint.getUserMultiplier(signer3.address))[0])).to.be.equal(115)
    })
  })
  describe('Airdrop contract', () => {
    it("check airdrop token", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await airdrop.airdropToken()).to.equal(usdt.address)
    })
    it("check mint contract", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await airdrop.mintContract()).to.equal(mint.address)
    })
    it("check airdrop state", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      expect(await airdrop.airdropState()).to.equal(false)
    })
    it("start airdrop", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await expect(airdrop.startAirdrop("0")).to.be.revertedWith(
        "Token amount must be greater than 0"
      )
      await expect(airdrop.startAirdrop("1000000000000000000")).to.be.revertedWith(
        "Mint is not ended"
      )
      await time.increaseTo(endTime + 1)
      await expect(airdrop.startAirdrop("1000000000000000000")).to.be.revertedWith(
        "ERC20: insufficient allowance"
      )
      await usdt.approve(airdrop.address, "1000000000000000000")
      await expect(airdrop.startAirdrop("1000000000000000000")).not.to.be.reverted
      expect(await airdrop.airdropState()).to.equal(true)
    })
    it("check addToken", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await expect(airdrop.addToken("1000000000000000000")).to.be.revertedWith(
        "Airdrop is not started"
      )
      await time.increaseTo(endTime + 1)
      await usdt.approve(airdrop.address, "2000000000000000000")
      await airdrop.startAirdrop("1000000000000000000")
      await expect(airdrop.addToken("1000000000000000000")).not.to.be.reverted
    })
    it("check withdraw without mint", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await expect(airdrop.withdraw()).to.be.revertedWith(
        "Airdrop is not started"
      )
      await time.increaseTo(endTime + 1)
      await usdt.approve(airdrop.address, "2000000000000000000")
      await airdrop.startAirdrop("1000000000000000000")
      await expect(airdrop.withdraw()).to.be.revertedWith(
        "No minted token"
      )
    })
    it("check withdraw with 1 user", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime + 1)
      const leave = keccak256(signer1.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.connect(signer1).mint(hexProof)

      await time.increaseTo(endTime + 1)
      await usdt.approve(airdrop.address, "2000000000000000000")
      await airdrop.startAirdrop("1000000000000000000")
      await airdrop.connect(signer1).withdraw()
      expect(await usdt.balanceOf(signer1.address)).to.equal("1000000000000000000")
      expect(await mint.getTotalpoint()).to.equal(0)
      const userData = await mint.userInfo(signer1.address)
      expect(userData.minted).to.equal(true)
      expect(userData.withdrawed).to.equal(true)
      const [userMultiplier, totalPoint] = await mint.getUserMultiplier(signer1.address)
      expect(userMultiplier).to.equal(0)
      expect(totalPoint).to.equal(0)
    })
    it("check withdraw with several users", async () => {
      const {owner, signer1, signer2, signer3, nonSigner1, userList, merkleTree, startTime, endTime, periodPerSnapshot, registration, mint, usdt, airdrop} = await beforeTest()
      await time.increaseTo(startTime + 1)
      const leave = keccak256(signer1.address)
      const hexProof = merkleTree.getHexProof(leave)
      await mint.connect(signer1).mint(hexProof)

      await time.increaseTo(startTime + periodPerSnapshot * 2)
      const leave2 = keccak256(signer2.address)
      const hexProof2 = merkleTree.getHexProof(leave2)
      await mint.connect(signer2).mint(hexProof2)

      await time.increaseTo(endTime + 1)
      await usdt.approve(airdrop.address, "2000000000000000000")
      await airdrop.startAirdrop("1000000000000000000")
      const [userMultiplier1, totalPoint1] = await mint.getUserMultiplier(signer1.address)
      await airdrop.connect(signer1).withdraw()
      expect(await usdt.balanceOf(signer1.address)).to.equal(BigInt(1000000000000000000) * BigInt(userMultiplier1) / BigInt(totalPoint1))
      expect(await mint.getTotalpoint()).to.equal(28)
      await airdrop.connect(signer2).withdraw()
      expect(await usdt.balanceOf(signer2.address)).to.equal(BigInt(1000000000000000000) - BigInt(1000000000000000000) * BigInt(userMultiplier1) / BigInt(totalPoint1))
      expect(await usdt.balanceOf(airdrop.address)).to.equal(0)
      expect(await mint.getTotalpoint()).to.equal(0)
    })
  })

  // Lock.connect(signer1).withdraw()
  // await time.increateTo()


  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // async function deployOneMonthLockFixture() {
  //   const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60;
  //   const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60;

  //   const startTime = (await time.latest() + ONE_WEEK_IN_SECS);
  //   const unlockTime = startTime + ONE_MONTH_IN_SECS;

  //   // Contracts are deployed using the first signer/account by default
  //   const [owner, otherAccount] = await ethers.getSigners();

  //   const Lock = await ethers.getContractFactory("Lock");
  //   const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  //   return { lock, unlockTime, lockedAmount, owner, otherAccount };
  // }

  // describe("Deploy Registration", function () {
  //   it("Deploy RegistrationToken", async function() {
  //     const Registration = await ethers.getContractFactory("RegistrationToken");
  //     const registration = await Registration.deploy("RegistrationToken", "RegistrationToken");
  //     it("Check registration token name", async function () {
  //       expect(await registration.name()).to.equal("RegistrationToken");
  //     })
  //     expect(await registration.symbol()).to.equal("RegistrationToken");
  //     expect(await registration.owner()).to.equal((await getUsers()).owner.address);
  //   })
  //   it("Should set the right unlockTime", async function () {
  //     const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

  //     expect(await lock.unlockTime()).to.equal(unlockTime);
  //   });

  //   it("Should set the right owner", async function () {
  //     const { lock, owner } = await loadFixture(deployOneYearLockFixture);

  //     expect(await lock.owner()).to.equal(owner.address);
  //   });

  //   it("Should receive and store the funds to lock", async function () {
  //     const { lock, lockedAmount } = await loadFixture(
  //       deployOneYearLockFixture
  //     );

  //     expect(await ethers.provider.getBalance(lock.address)).to.equal(
  //       lockedAmount
  //     );
  //   });

  //   it("Should fail if the unlockTime is not in the future", async function () {
  //     // We don't use the fixture here because we want a different deployment
  //     const latestTime = await time.latest();
  //     const Lock = await ethers.getContractFactory("Lock");
  //     await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
  //       "Unlock time should be in the future"
  //     );
  //   });
  // });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });
});
