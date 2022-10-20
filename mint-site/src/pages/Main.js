import { useWeb3React } from "@web3-react/core"
import React, { useState, useEffect } from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import Mint from "../components/Mint/Mint"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS, GOERLIINFURA, MINTCONTRACTABI, MINTCONTRACTADDRESS } from "../config/constants/constants"

const Main = () => {
    const {account} = useWeb3React()
    const {data, error, isLoading, isFetched} = useQuery(["blockState"], () => fetchInitialState(), {refetchInterval: 30000});
    const [currentTime, setCurrentTime] = useState(0)

    const fetchInitialState = async () => {
        const web3 = new Web3(GOERLIINFURA)
        const mintContract = new web3.eth.Contract(MINTCONTRACTABI, MINTCONTRACTADDRESS)
        const airdropContract = new web3.eth.Contract(AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS)
        const response = await Promise.all([mintContract.methods.isStarted().call(), mintContract.methods.isEnded().call(), mintContract.methods.startTime().call(), mintContract.methods.endTime().call(), web3.eth.getBlock("latest"), mintContract.methods.periodPerSnapshot().call(), airdropContract.methods.airdropState().call()])
        return {
            isStarted: response[0],
            isEnded: response[1],
            startTime: response[2],
            endTime: response[3],
            currentTime: response[4].timestamp,
            periodPerSnapshot: response[5],
            airdropStarted: response[6]
        }
    }

    
    useEffect(() => {
        if (!data?.currentTime || currentTime) return
        let time = data.currentTime + 12
        setCurrentTime(time)
        const interval = setInterval(() => {
            time++
            setCurrentTime(time)
        }, 1000)
        return () => clearInterval(interval)
    },[data])
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
                        <h2>Mint State</h2>
                        <p>Start state: {data.isStarted ? "started" : "not started"}</p>
                        <p>End state: {data.isEnded ? "ended" : "not ended"}</p>
                        <p>StartTime: {data.startTime}</p>
                        <p>EndTime: {data.endTime}</p>
                        <p>CurrentTime: {currentTime}</p>
                        <p>periodPerSnapshot: {data.periodPerSnapshot}</p>
                    </div>
                    <div>
                        <h2>Airdrop State</h2>
                        <p>{data.airdropStarted ? "Airdrop started": "Airdrop isn't started"}</p>
                    </div>
                </>
            }
            {
            !account
                ? 'Please connect wallet'
                : <Mint mintStarted={data.isStarted} mintEnded={data.isEnded} airdropStarted={data.airdropStarted} />
            }
        </div>
    )
}

export default Main