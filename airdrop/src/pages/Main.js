import { useWeb3React } from "@web3-react/core"
import React from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import Airdrop from "../components/Airdrop/Airdrop"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS, RPC_URL } from "../config/constants/constants"

const Main = () => {
    const {account} = useWeb3React()
    const {data, error, isLoading, isFetched} = useQuery(["blockState"], () => fetchInitialState(), {refetchInterval: 30000});

    const fetchInitialState = async () => {
        const web3 = new Web3(RPC_URL)
        const airdropContract = new web3.eth.Contract(AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS)
        const response = await airdropContract.methods.airdropStarted().call()
        return response
    }

    return (
        <div>
            {
                (error) && <div>Error during fetching..</div>
            }
            {
                (isLoading) && <div>Loading</div>
            }
            { (isFetched) &&
                <>
                    <div>
                        <h2>Airdrop</h2>
                        <p>Airdrop state: {data ? "started" : "not started"}</p>
                    </div>
                </>
            }
            {
            !account
                ? 'Please connect wallet'
                : <Airdrop airdropState={data} />
            }
        </div>
    )
}

export default Main