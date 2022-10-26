import { ethers } from"ethers"
// import { merkletree } from"merkletreejs"
import { request, gql } from"graphql-request"
const Web3 = require("web3")
import { Interface } from '@ethersproject/abi'
import { END_TIME, GAMUT_SUBGRAPH, GOERLI_MULTICALL, MINT_ADDRESS, POOL_LIST, POOL_TOKEN_PRICE, RPC_URL, START_TIME } from "./config/constants"
import {MINT_ABI} from "./config/abi/Mint"
import {MULTICALL_ABI} from "./config/abi/Multicall"
import fs from "fs"

const web3 = new Web3(RPC_URL)

const mint = new web3.eth.Contract(MINT_ABI, MINT_ADDRESS)
const multicall = new web3.eth.Contract(MULTICALL_ABI, GOERLI_MULTICALL)
const MINT_INTERFACE = new Interface(MINT_ABI)

const {keccak256} = ethers.utils

interface Pool {
    id: string
}

interface JoinExitPool {
    id: string
    timestamp: number
    sender: string
    pool: Pool
    liquidity: number
}

interface PoolDayData {
    id: string
    date: number
    liquidity: number
    liquidityUSD: number
}

interface JoinResponse {
    joins: JoinExitPool[]
}

interface ExitResponse {
    exits: JoinExitPool[]
}

interface PoolDayDataResponse {
    poolDayDatas: PoolDayData[]
}

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

interface UserData {
    address: string
    liquidity: number[]
    registration: boolean
    multiplier: number
    airdropAmount: number
}

const getJoinPools = async () => {
    let first_id = "0"
    let join: JoinExitPool[] = []
    while(true) {
        const getJoinPoolsQuery = gql`
            {
                joins(
                    first: 1000
                    where: {
                        id_gt: "${first_id}"
                        timestamp_lte: "${END_TIME}"
                    }
                    orderBy: id
                    orderDirection: asc
                ) {
                    id
                    timestamp
                    sender
                    pool {
                        id
                    }
                    liquidity
                }
            }
        `
        const newJoin: JoinResponse = await request(GAMUT_SUBGRAPH, getJoinPoolsQuery)
        if (join.length) join = join.concat(newJoin.joins)
        else join = newJoin.joins
        if (newJoin.joins.length < 1000) break
        first_id = join[join.length - 1].id
    }
    return join.sort((a, b) => a.timestamp - b.timestamp)
}

const getExitPools = async () => {
    let first_id = "0"
    let exit: JoinExitPool[] = []
    while(true) {
        const getExitPoolsQuery = gql`
            {
                exits(
                    first: 1000
                    where: {
                        id_gt: "${first_id}"
                        timestamp_lte: "${END_TIME}"
                    }
                    orderBy: id
                    orderDirection: asc
                ) {
                    id
                    timestamp
                    sender
                    pool {
                        id
                    }
                    liquidity
                }
            }
        `
        const newExit: ExitResponse = await request(GAMUT_SUBGRAPH, getExitPoolsQuery)
        if (exit.length) exit = exit.concat(newExit.exits)
        else exit = newExit.exits
        if (newExit.exits.length < 1000) break
        first_id = exit[exit.length - 1].id
    }
    exit = exit.map(each => {
        each.liquidity = each.liquidity * -1
        return each
    })
    return exit.sort((a, b) => a.timestamp - b.timestamp)
}

const getPoolDayDatas = async () => {
    let poolDayDatas: PoolDayData[] = []
    let first_time = START_TIME > 0 ? START_TIME - 1 : 0
    while(true) {
        const getPoolDayDatasQuery = gql`
            {
                poolDayDatas (
                    first: 1000
                    where: {
                        date_gt: "${first_time}"
                        date_lte: "${END_TIME}"
                    }
                    orderBy: date
                    orderDirection: asc
                ) {
                    id
                    date
                    liquidity
                    liquidityUSD
                }
            }
        `
        const newPoolDayDatas: PoolDayDataResponse = await request(GAMUT_SUBGRAPH, getPoolDayDatasQuery)
        if (poolDayDatas.length) poolDayDatas = poolDayDatas.concat(newPoolDayDatas.poolDayDatas)
        else poolDayDatas = newPoolDayDatas.poolDayDatas
        if (newPoolDayDatas.poolDayDatas.length < 1000) break
        first_time = poolDayDatas[poolDayDatas.length - 1].date
    }
    return poolDayDatas
}

const getRegisteredUsers = async () => {
    const totalUsers = await mint.methods.totalUsers().call()
    let calls = [...Array(totalUsers).keys()].map(each => (
        [MINT_ADDRESS, MINT_INTERFACE.encodeFunctionData('users', [each])]
    ))
    let registeredUsers: string[] = []
    while(true) {
        const _calls = calls.slice(0, 100)
        const {blockNumber, returnData} = await multicall.methods.aggregate(_calls).call()
        registeredUsers = registeredUsers.concat(returnData.map((each: string) => each.slice(0, 2) + each.slice(26)))
        calls = calls.slice(100)
        if (calls.length == 0) break
    }
    return registeredUsers
}

function getLiquidityOwnersList(joinExitPools: JoinExitPool[], registeredUsers: string[]) {
    const snapshots: number[][] = [
        [...Array(POOL_LIST.length).keys()].map(each => 0)
    ]
    const averageLiquidity: number[] = []
    const users: AirdropList[] = registeredUsers.map(each => {
        return {
            address: each,
            registration: 1,
            snapshots: snapshots,
            averageLiquidity: averageLiquidity,
            averageDollarValue: 0,
            multiplier: 0,
            percent: 0,
            amount: "0"
        }
    })
    let currentTime = START_TIME
    let arrayIndex = 0
    for(let i = 0; i < joinExitPools.length; i++) {
        let index = users.findIndex(each => each.address == joinExitPools[i].sender)
        if (index == -1) {
            index = users.length
            users.push({
                address: joinExitPools[i].sender,
                registration: 0,
                snapshots: [...Array(arrayIndex + 1).keys()].map(eachIndex => {
                    return [...Array(POOL_LIST.length).keys()].map(each => 0)
                }),
                averageLiquidity: averageLiquidity,
                averageDollarValue: 0,
                multiplier: 0,
                percent: 0,
                amount: "0"
            })
        }
        const time = joinExitPools[i].timestamp
        if (time > currentTime) {
            const step = Math.ceil((time - currentTime) / 86400)
            currentTime += step * 86400
            if (currentTime > END_TIME) {
                ([...Array((END_TIME - currentTime) / 86400).keys()].map(each => {
                    users.map(eachUser => eachUser.snapshots.push(eachUser.snapshots[arrayIndex]))
                }))
                break
            }
            ([...Array(step).keys()].map(each => {
                users.map(eachUser => eachUser.snapshots.push(eachUser.snapshots[arrayIndex]))
            }))
            arrayIndex += step
        }
        const poolIndex = POOL_LIST.findIndex(each => each == joinExitPools[i].pool.id)
        users[index].snapshots[arrayIndex][poolIndex] = users[index].snapshots[arrayIndex][poolIndex] + Number(joinExitPools[i].liquidity)
    }

    return users
}

function calculateMultiplier(airdropList: AirdropList[], liquidityTokenPrices: number[]) {
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
    //   airdropList[l].amount = Math.floor(airdropAmount * airdropList[l].multiplier / totalMultiplier).toString()
    }
    return airdropList
  }

async function main() {
    const joinPools = await getJoinPools()
    const exitPools = await getExitPools()
    const joinExitPools = joinPools.concat(exitPools).sort((a,b) => a.timestamp - b.timestamp)
    const registeredUsers = await getRegisteredUsers()
    let liquidityOwnersList = getLiquidityOwnersList(joinExitPools, registeredUsers)
    liquidityOwnersList = calculateMultiplier(liquidityOwnersList, POOL_TOKEN_PRICE)
    fs.writeFileSync("./data/airdropList.json", JSON.stringify(liquidityOwnersList))
}

main()