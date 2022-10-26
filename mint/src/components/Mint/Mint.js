import {useWeb3React} from "@web3-react/core"
import React from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import whitelist from "../../config/whitelist.json"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS, MINTCONTRACTABI, MINTCONTRACTADDRESS } from "../../config/constants/constants"


const {keccak256} = ethers.utils

const fetchMintState = async (account, library, mintStarted, mintEnded) => {
    if (!account || !library) return
    const web3 = new Web3(library.provider)
    const mintContract = new web3.eth.Contract(MINTCONTRACTABI, MINTCONTRACTADDRESS)
    const response = await mintContract.methods.userInfo(account).call()
    return response
}

const checkUserState = (account) => {
    let j = 0;
    for (let i = 0; i < 10000000; i++) {
        j++
    }
    return whitelist.includes(account.toLowerCase())
}

const Mint = (props) => {
    const {mintStarted, mintEnded, airdropStarted} = props
    const {account, library} = useWeb3React();
    const checkUser = useQuery(["checkUser", account], () => checkUserState(account))
    const mintState = useQuery(["mintState", account], () => fetchMintState(account, library, mintStarted, mintEnded), {refetchInterval: 60000});
    // const multiplierData = useQuery(["userMultiplier", account], () => fetchUserMultiplier(account, library), {refetchInterval: 1800000});
    const tokenMint = async () => {
        const web3 = new Web3(library.provider)
        const mintContract = new web3.eth.Contract(MINTCONTRACTABI, MINTCONTRACTADDRESS)
        const leaves = whitelist.map((user) => keccak256(user))
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })

        const hexProof = merkleTree.getHexProof(keccak256(account))
        const res = await mintContract.methods.mint(hexProof).send({from: account})
        if (res.status) mintState.refetch()
    }
    return (
        <div>
            {checkUser.isLoading && <p>verifing you are in whitelist</p>}
            {checkUser.isFetched && (
                checkUser.data > 0 ? <p>you are in whitelist</p> : <p>you are not in whitelist</p>
            )}
            {
                mintState.data > 0 && (
                    <p>You have minted in {mintState.data}</p>
                )
            }
            {
                checkUser.isFetched && mintState.isFetched && checkUser.data && mintState.data == 0 && (
                    <button onClick={tokenMint}>Mint</button>
                )
            }
        </div>
    )
}

export default Mint
