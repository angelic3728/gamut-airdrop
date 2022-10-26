import { ethers } from"ethers"
import { MerkleTree } from"merkletreejs"
import { request, gql } from"graphql-request"
import axios from "axios"
import fs from "fs"

const {keccak256} = ethers.utils

interface UserAddress {
    id: string
  }
  
  interface Response {
    users: UserAddress[]
  }
  
  enum DexList {
    CURVE = 'Curve',
    BALANCERV1 = 'BalancerV1',
    BALANCERV2 = 'BalancerV2',
    UNISWAPV1 = 'UniswapV1',
    UNISWAPV2 = 'UniswapV2',
    UNISWAPV3 = 'UniswapV3'
  }
  
  enum state {
    FETCHING,
    UPLOADING,
    FINISHED
  }
  
  const dexList = [
    DexList.CURVE,
    DexList.BALANCERV1,
    DexList.BALANCERV2,
    DexList.UNISWAPV1,
    DexList.UNISWAPV2,
    DexList.UNISWAPV3
  ]
  
  const dexURL = {
    [DexList.CURVE]: 'https://api.thegraph.com/subgraphs/name/blocklytics/curve',
    [DexList.BALANCERV1]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer',
    [DexList.BALANCERV2]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    [DexList.UNISWAPV1]: 'https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap',
    [DexList.UNISWAPV2]: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    [DexList.UNISWAPV3]: 'https://api.thegraph.com/subgraphs/name/enjoydream420/uniswapv3'
  }
  
  // for test
  // const dexUsers = {
  //   [DexList.CURVE]: [
  //     '0x0000000000000000000000000000000000000000',
  //     '0x0000000000000000000000000000000000000001',
  //     '0x0000000000000000000000000000000000000002',
  //     '0x0000000000000000000000000000000000000003',
  //     '0x8082DF9449fa8945e677621cb3A6BEAD210CcC0d',
  //     '0x0000000000000000000000000000000000000004',
  //     '0x0000000000000000000000000000000000000005',
  //   ],
  //   [DexList.BALANCERV1]: [
  //     '0x0000000000000000000000000000000000000000',
  //     '0x0000000000000000000000000000000000000001',
  //     '0x0000000000000000000000000000000000000010',
  //     '0x0000000000000000000000000000000000000011',
  //     '0x0000000000000000000000000000000000000012',
  //     '0x0000000000000000000000000000000000000013',
  //     '0x0000000000000000000000000000000000000014',
  //     '0x0000000000000000000000000000000000000016',
  //   ],
  //   [DexList.BALANCERV2]: [],
  //   [DexList.UNISWAPV1]: [
  //     '0x0000000000000000000000000000000000000000',
  //     '0x0000000000000000000000000000000000000003',
  //     '0x0000000000000000000000000000000000000004',
  //     '0x0000000000000000000000000000000000000006',
  //     '0x0000000000000000000000000000000000000007',
  //     '0x0000000000000000000000000000000000000009',
  //     '0x0000000000000000000000000000000000000020',
  //     '0x0000000000000000000000000000000000000030',
  //   ],
  //   [DexList.UNISWAPV2]: [
  //     '0x0000000000000000000000000000000000000008',
  //     '0x0000000000000000000000000000000000000010',
  //     '0x0000000000000000000000000000000000000015',
  //     '0x0000000000000000000000000000000000000016',
  //     '0x0000000000000000000000000000000000000017',
  //     '0x0000000000000000000000000000000000000020',
  //     '0x0000000000000000000000000000000000000030',
  //     '0x0000000000000000000000000000000000000040',
  //     '0x8082DF9449fa8945e677621cb3A6BEAD210CcC0d',
  //   ],
  //   [DexList.UNISWAPV3]: [
  //     '0x0000000000000000000000000000000000000003',
  //     '0x0000000000000000000000000000000000000004',
  //     '0x0000000000000000000000000000000000000006',
  //     '0x0000000000000000000000000000000000000008',
  //     '0x0000000000000000000000000000000000000010',
  //     '0x0000000000000000000000000000000000000018',
  //     '0x0000000000000000000000000000000000000028',
  //     '0xd545a7f27eF82b003147D3bEc69DB1FDE3C518E8',
  //     '0xBB0382438E50fd3c1CF4feFEBc5F4A8E24bf9006',
  //   ]
  // }
  

  async function fetchAllUsers() {
    let allUsers : string[][] = []
    let users : string[] = []
    for (const [key, value] of Object.entries(dexURL)) {
        console.log(`Fetching user data from ${key}`)
        users = []
        try {
            const data = await fs.readFileSync(`./data/${key}.json`, {encoding:'utf8', flag:'r'})
            users = JSON.parse(data)
        } catch (e) {
            const APIURL = value
            let startAddress = '0x0000000000000000000000000000000000000000'
            while (true) {
              const userListQuery1 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                  ) {
                    id
                  }
                }
              `
              const userListQuery2 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                    skip: 1000
                  ) {
                    id
                  }
                }
              `
              const userListQuery3 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                    skip: 2000
                  ) {
                    id
                  }
                }
              `
              const userListQuery4 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                    skip: 3000
                  ) {
                    id
                  }
                }
              `
              const userListQuery5 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                    skip: 4000
                  ) {
                    id
                  }
                }
              `
              const userListQuery6 = gql`
                {
                  users(
                    where: {
                      id_gt: "${startAddress}"
                    }
                    orderBy: id
                    orderDirection: asc
                    first: 1000
                    skip: 5000
                  ) {
                    id
                  }
                }
              `
              const data: Response[] = await Promise.all([
                request(APIURL, userListQuery1),
                request(APIURL, userListQuery2),
                request(APIURL, userListQuery3),
                request(APIURL, userListQuery4),
                request(APIURL, userListQuery5),
                request(APIURL, userListQuery6)
              ])
              let newUsers1 = data[0].users.map(each => each.id.toLowerCase())
              let newUsers2 = data[1].users.map(each => each.id.toLowerCase())
              let newUsers3 = data[2].users.map(each => each.id.toLowerCase())
              let newUsers4 = data[3].users.map(each => each.id.toLowerCase())
              let newUsers5 = data[4].users.map(each => each.id.toLowerCase())
              let newUsers6 = data[5].users.map(each => each.id.toLowerCase())
              if (users.length) users = users.concat(newUsers1).concat(newUsers2).concat(newUsers3).concat(newUsers4).concat(newUsers5).concat(newUsers6)
              else users = newUsers1.concat(newUsers2).concat(newUsers3).concat(newUsers4).concat(newUsers5).concat(newUsers6)
              console.log(users.length)
              if (newUsers6.length < 1000) break
              else startAddress = newUsers6[newUsers6.length - 1]
              // console.log(startAddress)
            }
            fs.writeFileSync(`./data/${key}.json`, JSON.stringify(users))
        }
        allUsers.push(users)
        console.log(Date.now())
    }

    // for test
    // for (const [key, value] of Object.entries(dexUsers)) {
    //   users = value.sort().map((user: string) => user.toLowerCase())
    //   allUsers.push(users)
    // }
    
    return mergeUsers(allUsers)
  }

  function calculateMerkleRootHash (users: string[]): string {
    // console.log(users)
    const leaves = users.map((user: string) => keccak256(user))
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })

    // save this value to smart contract
    const _merkleRootHash = merkleTree.getHexRoot()
    return _merkleRootHash
  }

  function mergeUsers(users: string[][]): string[] {
      console.log(`merging users lists`)
    let usersLength = users.map(each => each.length)
    let result: string[] = []
    let length = 0
    while(true) {
        let check = 0
        for(let i = 0; i < usersLength.length; i++){
            if (usersLength[i] > 0) check++
        }
        if (check < 2) break
        let firstElements = users.map(each => each[0])
        let smallestOne = firstElements.sort()[0]
        result.push(smallestOne)
        for(let j = 0; j < users.length; j++) {
            if (users[j][0] == smallestOne) {
                users[j].shift()
                usersLength[j] = usersLength[j] - 1
            }
        }
        length++
        if (length % 1000 == 0) console.log(length)
    }
    for(let k = 0; k < users.length; k++) {
        result = result.concat(users[k])
    }
    console.log(`total users: ${result.length}`)
    return result
  }

  async function uploadUsersList(users: string[]) {
    const response = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyM2YyOTc4MS00ZDBjLTQxZTctYWMyOS1hYzkwZjZhYThkODEiLCJlbWFpbCI6ImNvc21vZHJlYW05M0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmU1NjYzMjUwZWU4YmQ2Njk5ZWMiLCJzY29wZWRLZXlTZWNyZXQiOiI3NzRlZjgzMzAxNTBiNzRjNWZhYzEzZjMwMmViY2E1ZjJmYzA2ZDMyZTQxMWMzMmQxMzI5MTA2Yjc4OWJhYTYwIiwiaWF0IjoxNjY1ODM5ODgzfQ.DF3Kg52rK3Lb6Eq1_UzK1V9juGnWHpQwLKYgjJ_SLjE'
      },
      data: JSON.stringify(users)
    })
    return response.data.IpfsHash
  } 

  async function main () {
    fetchAllUsers().then((users) => {
        fs.writeFileSync(`./data/All.json`, JSON.stringify(users))
        const _merkleRootHash = calculateMerkleRootHash(users)
        console.log(`merkleRootHash: ${_merkleRootHash}`)
        // uploadUsersList(users).then((path) => {
        //     console.log(`ipfs path: ${`https://gateway.pinata.cloud/ipfs/${path}`}`)
        // })
      })
  }
  main()