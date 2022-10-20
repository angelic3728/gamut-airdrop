import { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import axios from 'axios'
import './App.css'
import { request, gql } from 'graphql-request'

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
  [DexList.UNISWAPV3]: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'
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
//

function App() {
  const [currentState, updateState] = useState<number>(state.FETCHING)
  const [currentDex, updateDex] = useState<string>(dexList[0])
  const [merkleRootHash, updateMerkleRootHash] = useState<string>('')
  const [ipfsPath, updateIpfsPath] = useState<string>('')
  useMemo(() => {
    fetchAllUsers().then((users) => {
      const _merkleRootHash = calculateMerkleRootHash(users)
      updateMerkleRootHash(_merkleRootHash)
      updateState(state.UPLOADING)
      uploadUsersList(users).then((path) => {
        updateIpfsPath(path)
        updateState(state.FINISHED)
      })
    })
  }, [])

  async function fetchAllUsers() {
    updateState(state.FETCHING)
    let users1 : string[] = []
    let users2 : string[] = []
    console.log(Date.now())
    for (const [key, value] of Object.entries(dexURL)) {
      updateDex(key)
      const APIURL = value
      let startAddress = '0x0000000000000000000000000000000000000000'
      users2 = []
      while (true) {
        const userListQuery = gql`
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
        const data: Response = await request(APIURL, userListQuery)
        let newUsers = data.users.map(each => each.id)
        newUsers = newUsers.map(user => user.toLowerCase())
        if (users2.length) users2 = users2.concat(newUsers)
        else users2 = newUsers
        console.log(users2.length)
        if (newUsers.length < 1000) break
        else startAddress = newUsers[newUsers.length - 1]
        // console.log(startAddress)
      }
      if (users1.length === 0) users1 = users2
      else users1 = mergeUsers(users1, users2)
      console.log(Date.now())
    }
    // for test
    // for (const [key, value] of Object.entries(dexUsers)) {
    //   updateDex(key)
    //   users2 = value.sort().map((user: string) => user.toLowerCase())
    //   if (users1.length === 0) users1 = users2
    //   else users1 = mergeUsers(users1, users2)
    // }
    
    return users1
  }

  function calculateMerkleRootHash (users: string[]): string {
    console.log(users)
    const leaves = users.map((user: string) => keccak256(user))
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })

    // save this value to smart contract
    const _merkleRootHash = merkleTree.getHexRoot()
    return _merkleRootHash
  }

  function mergeUsers(users1: string[], users2: string[]): string[] {
    let users : string[] = []
    while(users1.length > 0 && users2.length > 0) {
      if (users1[0] === users2[0]) {
        let user = users1.shift()
        if (user) users.push(user)
        users2.shift()
      }
      if (users1[0] < users2[0]) {
        let user = users1.shift()
        if (user) users.push(user)
      }
      if (users2[0] < users1[0]) {
        let user = users2.shift()
        if (user) users.push(user)
      }
    }
    if (users1.length > 0) users = users.concat(users1)
    if (users2.length > 0) users = users.concat(users2)
    return users
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

  return (
    <div className='App'>
      <h1>IPFS Example</h1>
      {
        currentState === state.FETCHING && 
        <h2>
          Fetching users' list from {currentDex}
        </h2>
      }
      {
        merkleRootHash &&
        <h2>
          MerkleRootHash: {merkleRootHash}
        </h2>
      }
      {
        currentState === state.UPLOADING &&
        <h2>
          Uploading users' list to IPFS
        </h2>
      }
      {
        ipfsPath &&
        <h2>
          Ipfs Url: {`https://gateway.pinata.cloud/ipfs/${ipfsPath}`}
        </h2>
      }
    </div>
  );
}

export default App;
