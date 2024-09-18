// This is will deposit our token for WETH token
const { getNamedAccounts, ethers } = require("hardhat")
const AMOUNT = ethers.parseEther("0.02")

async function getWeth() {
  const [deployer] = await ethers.getSigners()
  // const { deployer } = await getNamedAccounts() // In order to intract with the contract with we need an account.
  // call deposit function on the WETH contract - we need the ABI and the contract address but we used interfaces instead
  // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
  const iWeth = await ethers.getContractAt(
    // This line means let's get this iWeth contract with the ABI of IWeth at the address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) connected to the deployer
    "IWeth",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // forking here - Interacting with the mainnet locally.
    deployer,
  )
  const tx = await iWeth.deposit({ value: AMOUNT }) // Here, we deposit ETH to get ERC20 token version
  await tx.wait(1)
  const wethBalance = await iWeth.balanceOf(deployer)
  console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT }
