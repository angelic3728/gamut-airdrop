import { useWeb3React } from "@web3-react/core"
import React, { useState, useEffect } from "react"
import {useQuery} from "react-query"
import Web3 from "web3"
import Mint from "../components/Mint/Mint"
import { AIRDROPCONTRACTABI, AIRDROPCONTRACTADDRESS, RPC_URL, MINTCONTRACTABI, MINTCONTRACTADDRESS } from "../config/constants/constants"

const Main = () => {
    const {account} = useWeb3React()
    const {data, error, isLoading, isFetched} = useQuery(["blockState"], () => fetchInitialState(), {refetchInterval: 30000});
    const [currentTime, setCurrentTime] = useState(0)

    const fetchInitialState = async () => {
        const web3 = new Web3(RPC_URL)
        console.log(await web3.eth.getBlock("latest"));
        const mintContract = new web3.eth.Contract(MINTCONTRACTABI, MINTCONTRACTADDRESS)
        const response = await Promise.all([mintContract.methods.isStarted().call(), mintContract.methods.isEnded().call(), mintContract.methods.startTime().call(), mintContract.methods.endTime().call(), web3.eth.getBlock("latest")])
        return {
            isStarted: response[0],
            isEnded: response[1],
            startTime: response[2],
            endTime: response[3],
            currentTime: response[4].timestamp,
        }
    }

    
    useEffect(() => {
        if (!data?.currentTime) return
        let time = currentTime ? currentTime : data.currentTime + 12
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
                    </div>
                </>
            }
            {
            !account
                ? 'Please connect wallet'
                : <Mint mintStarted={data.isStarted} mintEnded={data.isEnded} />
            }
        </div>
    )
}

export default Main