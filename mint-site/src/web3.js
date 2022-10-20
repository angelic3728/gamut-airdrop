import Web3 from "web3"
import {
    Multicall
  } from 'ethereum-multicall';

import lockerContractAbi from "./locker_abi.json"
import erc20Abi from "./erc20_abi.json"

// const lockerAddress = "0x9D1018Cf42c12D78D073C38A79eCaB18A4FDc2A5";
const lockerAddress = "0x7E73A50B8F78F8Ad584d86Aab0ba966d1BE33bf1";

export const deposit = async (provider, token, amount, date, account) => {
    let unlockDate = new Date(date);
    let UTCTimestamp = Math.round(unlockDate.getTime() / 1000)
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(lockerContractAbi, lockerAddress);
    let result = await contract.methods["depositToken"](token.address, BigInt(amount), UTCTimestamp).send({from: account});
    return result.status;
}

export const withdraw = async (provider, token, amount, account) => {
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(lockerContractAbi, lockerAddress);
    let result = await contract.methods["withdrawToken"](token, BigInt(amount)).send({from: account});
    return result.status;
}

export const approve = async (provider, token, account) => {
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(erc20Abi, token.address);
    let result = await contract.methods["approve"](lockerAddress, web3.utils.toBN("115792089237316195423570985008687907853269984665640564039457584007913129639935")).send({from: account});
    return result.status;
}

export const allowance = async (provider, token, account) => {
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(erc20Abi, token.address);
    let result = await contract.methods["allowance"](account, lockerAddress).call();
    return result;
}

export const getTokenBalance = async (provider, token, account) => {
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(erc20Abi, token.address);
    let result = await contract.methods["balanceOf"](account).call();
    return result;
}

export const getUserData = async (provider, account) => {
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(lockerContractAbi, lockerAddress);
    let length = await contract.methods["lockedTokensLength"]().call();
    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });
    if (length > 0) {
        let contractCallContext = [];
        for (let i = 0; i < length; i++) {
            contractCallContext.push({
                reference: i.toString(),
                contractAddress: lockerAddress,
                abi: lockerContractAbi,
                calls: [{ reference: 'lockedTokensCall', methodName: 'lockedTokens', methodParameters: [i] }]
            })
        }
        let response = await multicall.call(contractCallContext);
        let lockedTokenLists = [];
        for (const [key, value] of Object.entries(response.results)) {
            lockedTokenLists.push(value.callsReturnContext[0]["returnValues"][0]);
        }
        contractCallContext = [];
        for (let i = 0; i < length; i++) {
            contractCallContext.push({
                reference: i,
                contractAddress: lockerAddress,
                abi: lockerContractAbi,
                calls: [{ reference: 'lockedTokensCall', methodName: 'getUserTokenInfo', methodParameters: [lockedTokenLists[i], account] }]
            })
        }
        response = await multicall.call(contractCallContext);
        let userInfo = [];
        for (const [key, value] of Object.entries(response.results)) {
            if (web3.utils.hexToNumberString(value.callsReturnContext[0].returnValues[2].hex) == '0') continue;
            userInfo.push({token: lockedTokenLists[key], deposited: web3.utils.hexToNumberString(value.callsReturnContext[0].returnValues[0].hex), withdrawed: web3.utils.hexToNumberString(value.callsReturnContext[0].returnValues[1].hex), vestLength: web3.utils.hexToNumberString(value.callsReturnContext[0].returnValues[2].hex)})
        }
        if (!userInfo.length) return [];
        contractCallContext = [];
        for (let i = 0; i < userInfo.length; i++) {
            let context = {
                reference: i,
                contractAddress: lockerAddress,
                abi: lockerContractAbi,
                calls: []
            }
            for (let j = 0; j < userInfo[i]["vestLength"]; j++) {
                context.calls.push({ reference: 'getUserVestingAtIndexCall', methodName: 'getUserVestingAtIndex', methodParameters: [userInfo[i].token, account, j] });
            }
            contractCallContext.push(context)
        }
        response = await multicall.call(contractCallContext);
        for (const [key, value] of Object.entries(response.results)) {
            userInfo[key]["vesting"] = value.callsReturnContext.map(each => {
                return each.returnValues.map(data => {
                    return web3.utils.hexToNumberString(data.hex)
                })
            })
        }
        contractCallContext = [];
        for (let i = 0; i < userInfo.length; i++) {
            let context = {
                reference: i,
                contractAddress: userInfo[i]["token"],
                abi: erc20Abi,
                calls: [{ reference: 'decimalsCall', methodName: 'decimals' }, { reference: 'symbolCall', methodName: 'symbol'}]
            }
            contractCallContext.push(context);
        }
        response = await multicall.call(contractCallContext);
        for (const [key, value] of Object.entries(response.results)) {
            userInfo[key]["decimals"] = value.callsReturnContext[0]["returnValues"][0];
            userInfo[key]["symbol"] = value.callsReturnContext[1]["returnValues"][0];
        }
        let currentTime = Math.round(Date.now() / 1000);
        // console.log(userInfo)
        userInfo = userInfo.map(each => {
            console.log(each);
            let withdrawable = web3.utils.toBN(0);
            each.vesting.map((eachVest) => {
                if (Number(eachVest[0]) < currentTime) withdrawable = withdrawable.add(web3.utils.toBN(eachVest[1]));
            })
            withdrawable = withdrawable.sub(web3.utils.toBN(each.withdrawed));
            each.withdrawable = withdrawable.toString();
            return each;
        })

        return userInfo;
        // const returnValues = results.results[0].map(each => each.callsReturnContext[0]["returnValues"][0]);
    }
    return [];
}

export const checkWalletAddress = (provider, walletAddress) => {
    let web3 = new Web3(provider);
    return web3.utils.isAddress(walletAddress);
}