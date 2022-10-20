import {useWeb3React} from "@web3-react/core"
import React from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import whitelist from "../../config/whitelist.json"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS, GOERLIINFURA, MINTCONTRACTABI, MINTCONTRACTADDRESS } from "../../config/constants/constants"


const {keccak256} = ethers.utils

const fetchMintState = async (account, library, mintStarted, mintEnded) => {
    if (!account || !library) return
    const web3 = new Web3(library.provider)
    const mintContract = new web3.eth.Contract(MINTCONTRACTABI, MINTCONTRACTADDRESS)
    const response = await Promise.all([
        mintContract.methods.userInfo(account).call(),
        mintContract.methods.getUserMultiplier(account).call(),
    ])
    return {
        minted: response[0].minted,
        withdrawed: response[0].withdrawed,
        userMultiplier: response[1][0],
        totalMultiplier: response[1][1]
    }
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
    const airdrop = async () => {
        const web3 = new Web3(library.provider)
        const airdropContract = new web3.eth.Contract(AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS)
        const res = await airdropContract.methods.withdraw().send({from: account})
        if (res.status) mintState.refetch()
    }
    return (
        <div>
            {checkUser.isLoading && <p>verifing you are in whitelist</p>}
            {checkUser.isFetched && (
                checkUser.data ? <p>you are in whitelist</p> : <p>you are not in whitelist</p>
            )}
            {
                mintState.isFetched && (
                    mintState.data.minted ? (
                        <>
                            <p>You have minted</p>
                            {
                                mintState.data.withdrawed && <p>You have withdrawed</p>
                            }
                            {
                                mintState.data.userMultiplier && <p>your multiplier: {mintState.data.userMultiplier}</p>
                            }
                            <p>total multiplier: {mintState.data.totalMultiplier}</p>
                        </>
                    ) : (
                        checkUser.data && (
                            <>
                                <p>You have not minted</p>
                                <p>total multiplier: {mintState.data.totalMultiplier}</p>
                            </>
                        )
                    )
                )
            }
            {
                checkUser.isFetched && mintState.isFetched && checkUser.data && !(mintState.data.minted) && (
                    <button onClick={tokenMint}>Mint</button>
                )
            }
            {
                mintState.isFetched && mintState.data.minted && !mintState.data.withdrawed && airdropStarted && (
                    <button onClick={airdrop}>Airdrop</button>
                )
            }
        </div>
    )
}

export default Mint
