const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const DAY = 86400;
const RATE = 1000n;

describe("SafeVault", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const vault = await (await ethers.getContractFactory("SafeVault")).deploy(
      await token.getAddress(),
      RATE
    );
    const amount = ethers.parseEther("1000");
    await token.transfer(alice.address, amount);
    await token.connect(alice).approve(await vault.getAddress(), amount);
    return { owner, alice, bob, token, vault, amount };
  }

  const expectedReward = (amount, seconds) =>
    (amount * RATE * BigInt(seconds)) / (10000n * BigInt(365 * DAY));

  describe("constructor", function () {
    it("rejects a zero token address and a too-high rate", async function () {
      const Vault = await ethers.getContractFactory("SafeVault");
      await expect(Vault.deploy(ethers.ZeroAddress, 1000)).to.be.revertedWith("Invalid token");
      await expect(Vault.deploy(ethers.Wallet.createRandom().address, 10001)).to.be.revertedWith("Rate too high");
    });
  });

  describe("locking", function () {
    it("allows a user to lock tokens", async function () {
      const { alice, token, vault, amount } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).lockTokens(amount, 3600)).to.emit(vault, "TokensLocked");
      const c = await vault.getCompartment(alice.address);
      expect(c.amount).to.equal(amount);
      expect(c.active).to.equal(true);
      expect(await token.balanceOf(await vault.getAddress())).to.equal(amount);
    });

    it("keeps each user's compartment separate", async function () {
      const { alice, bob, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 3600);
      const b = await vault.getCompartment(bob.address);
      expect(b.amount).to.equal(0);
      expect(b.active).to.equal(false);
    });

    it("rejects zero amounts, zero durations and durations above the maximum", async function () {
      const { alice, vault, amount } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).lockTokens(0, 3600)).to.be.revertedWith("Amount must be positive");
      await expect(vault.connect(alice).lockTokens(amount, 0)).to.be.revertedWith("Duration must be positive");
      await expect(vault.connect(alice).lockTokens(amount, 366 * DAY)).to.be.revertedWith("Duration too long");
    });

    it("prevents a second active compartment for the same user", async function () {
      const { alice, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount / 2n, 3600);
      await expect(vault.connect(alice).lockTokens(amount / 2n, 3600)).to.be.revertedWith("Compartment active");
    });
  });

  describe("rewards", function () {
    it("returns zero when the user has no compartment", async function () {
      const { bob, vault } = await loadFixture(deployFixture);
      expect(await vault.calculateReward(bob.address)).to.equal(0);
    });

    it("calculates the exact reward at a given block without moving funds", async function () {
      const { alice, token, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 30 * DAY);
      const start = (await vault.getCompartment(alice.address)).startTime;

      await time.increaseTo(start + BigInt(DAY));
      const block = await ethers.provider.getBlockNumber();

      expect(await vault.calculateReward(alice.address, { blockTag: block })).to.equal(expectedReward(amount, DAY));
      expect(await token.balanceOf(await vault.getAddress())).to.equal(amount);
      expect((await vault.getCompartment(alice.address)).amount).to.equal(amount);
    });

    it("stops accruing reward at the unlock time", async function () {
      const { alice, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 30 * DAY);
      await time.increase(90 * DAY);
      const block = await ethers.provider.getBlockNumber();
      expect(await vault.calculateReward(alice.address, { blockTag: block })).to.equal(expectedReward(amount, 30 * DAY));
    });
  });

  describe("unlocking", function () {
    it("prevents unlocking before the lock expires", async function () {
      const { alice, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 3600);
      await expect(vault.connect(alice).unlockTokens()).to.be.revertedWith("Still locked");
    });

    it("rejects unlocking without an active compartment", async function () {
      const { bob, vault } = await loadFixture(deployFixture);
      await expect(vault.connect(bob).unlockTokens()).to.be.revertedWith("No active compartment");
    });

    it("returns tokens after expiry", async function () {
      const { alice, token, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 3600);
      await time.increase(3601);
      await expect(vault.connect(alice).unlockTokens()).to.emit(vault, "TokensUnlocked").withArgs(alice.address, amount);
      const c = await vault.getCompartment(alice.address);
      expect(c.amount).to.equal(0);
      expect(c.active).to.equal(false);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("allows locking again after unlocking", async function () {
      const { alice, token, vault, amount } = await loadFixture(deployFixture);
      await vault.connect(alice).lockTokens(amount, 3600);
      await time.increase(3601);
      await vault.connect(alice).unlockTokens();
      await token.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).lockTokens(amount, 3600);
      expect((await vault.getCompartment(alice.address)).active).to.equal(true);
    });
  });
});
