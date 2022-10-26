import {useWeb3React} from "@web3-react/core"
import React from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import airdropList from "../../config/airdropList.json"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS } from "../../config/constants/constants"


const {keccak256} = ethers.utils

const fetchAirdropState = async (account, library) => {
    if (!account || !library) return
    const web3 = new Web3(library.provider)
    const airdropContract = new web3.eth.Contract(AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS)
    const response = await airdropContract.methods.airdropStates(account).call()
    return response
}

const checkUserState = (account) => {
    const index = airdropList.findIndex(each => each.address == account.toLowerCase())
    if (index == -1) return false
    return airdropList[index].amount > 0
}

function convertToUint256(data) {
    let newData = data
    if (data.slice(0,2) == "0x") newData = data.slice(2)
    const zeroLength = 64 - newData.length
    // console.log(zeroLength)
    for(let i = 0; i < zeroLength; i++) {
      newData = `0${newData}`
    }
    console.log(newData)
    return newData
}

const Airdrop = (props) => {
    const {airdropState} = props
    const {account, library} = useWeb3React();
    const checkUser = useQuery(["checkUser", account], () => checkUserState(account))
    const alreadyAirdrop = useQuery(["airdropState", account], () => fetchAirdropState(account, library), {refetchInterval: 60000});
    const leaves = airdropList.map((user) => keccak256(user.address + convertToUint256(user.amount)))
    // const multiplierData = useQuery(["userMultiplier", account], () => fetchUserMultiplier(account, library), {refetchInterval: 1800000});
    const airdrop = async () => {
        const web3 = new Web3(library.provider)
        const airdropContract = new web3.eth.Contract(AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS)
        const leaves = airdropList.map((user) => keccak256(user.address + convertToUint256(user.amount)))
        console.log(leaves)
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
        const userIndex = airdropList.findIndex(each => each.address == account.toLowerCase())
        if(userIndex == -1) return

        const hexProof = merkleTree.getHexProof(keccak256(airdropList[userIndex].address + convertToUint256(airdropList[userIndex].amount)))
        const res = await airdropContract.methods.airdrop(airdropList[userIndex].amount, hexProof).send({from: account})
        if (res.status) airdropState.refetch()
    }
    return (
        <div>
            {checkUser.isLoading && <p>verifing you are in airdropList</p>}
            {checkUser.isFetched && (
                checkUser.data ? <p>you are in airdropList</p> : <p>you are not in airdropList</p>
            )}
            {
                alreadyAirdrop.data && (
                    <p>You have airdroped already</p>
                )
            }
            {
                checkUser.isFetched && alreadyAirdrop.isFetched && checkUser.data && !alreadyAirdrop.data && (
                    <button onClick={airdrop}>Airdrop</button>
                )
            }
        </div>
    )
}

export default Airdrop
