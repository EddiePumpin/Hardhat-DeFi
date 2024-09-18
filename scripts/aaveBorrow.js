const { getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")
const { ethers } = require("ethers")

async function main() {
  // Protocol treats everything has ERC20 token
  await getWeth() // This means we already have token(WETH) in this contract
  const { deployer } = await getNamedAccounts()
  // We want to interact with the aave protocol, we need the ABI and the address

  // Lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  // We will get the lending pool from the lending pool provider
  const lendingPool = await getLendingPool(deployer) // The LendingPool contract is the main contract of the protocol. It exposes all the user-oriented actions that can be invoked
  console.log(`LendingPool address: ${lendingPool.address}`)

  //deposit
  const wethTokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  //appove
  // Anytime a contract wants to interact with your token you have to approve the contract to do so.
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer) // We are giving the lendingPool the approval to pour out the WETH token from the our account
  console.log("Depositing......")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0) // The deployer here is `onBehalfOf`. The onBehalfOf parameter typically refers to an address on whose behalf a certain action or transaction is being performed
  console.log("Deposited!")

  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer,
  )

  const daiPrice = await getDaiPrice() // Since getDaiPrice() returns price that means price is stored in the variable daiPrice
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()) // This means you can borrow 95% (o.95) and not all
  console.log(`You can borrow ${amountDaiToBorrow} DAI`)
  const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString())
  // Borrow
  // We need to know how much have borrowed,how much we have in collateral and how much we can borrow
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  // const ethTokenAddress = "0x..eth CONTRACT address"
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
  await getBorrowUserData(lendingPool, deployer)
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
  // await repay(amountDaiToBorrowWei, ethTokenAddress, lendingPool, deployer)
  await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveErc20(daiAddress, lendingPool.address, account)
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1)
  console.log("Repaid")
}

// This will repay in ETH instead of DAI
// async function repay(amount, ethAddress, lendingPool, account) {
//   await approveErc20(ethAddress, lendingPool.address, account)
//   await lendingPool.repay(ethAddress, amount, 1, account)
//   await repayTx.wait(1)
//   console.log("Debt has been repaid")
// }

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account,
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountToBorrow,
    1,
    0,
    account,
  )
  await borrowTx.wait(1)
  console.log("You've borrowed!")
}

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616e4d11a78f511299002da57a0a94577f1f4", // DAI/ETH contract address
  ) // We don't need to connect to "account" because we are sending any transaction. Reading we don't need a signer, signing we need a signer.
  const price = (await daiEthPriceFeed.latestRoundData())[1] // latestRoundData returns latest price round, including the price, timestamp, and round ID.
  // The function returns an array-like structure (a tuple), and [1] accesses the second element in the tuple. In this case, it returns answer which is the price.
  console.log(`The DAI/ETH price is ${price.toString()}`)
  return price
}

// totalCollateral- how much we have in collateral , totalDebt-How much you have borrowed, availableBorrowsETH- how much we can borrow
async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
  console.log(`You have ${totalDebtETH} worth of ETH.`)
  console.log(`You can borrow ${availableBorrowsETH} worth ETH.`)
  return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider", // This is the interface
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", // The interface conntract address
    account,
  )
  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account,
  )
  return lendingPool
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account,
) {
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
  const tx = await erc20Token.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("Approve!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
