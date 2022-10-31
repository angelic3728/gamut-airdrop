const Web3 = require("web3")
const fs = require("fs")
const { KAVA_RPC_URL, EACH_FETCHING_COUNT } = require("./config")

const web3 = new Web3(KAVA_RPC_URL)

const getLatestBlockNumber = async () => {
    return await web3.eth.getBlockNumber()
}

const getNewUsers = async (usersList, contractsList, _newUsers) => {
    const newData = []
    const newList = []
    const newContractsList = []
    for(let i = 0; i <= _newUsers.length; i++) {
        if (!_newUsers[i]) continue
        const index1 = usersList.indexOf(_newUsers[i])
        const index2 = contractsList.indexOf(_newUsers[i])
        const index3 = newData.indexOf(_newUsers[i])
        if (index1 === -1 && index2 === -1 && index3 === -1) newData.push(_newUsers[i])
    }
    console.log(`newData: ${newData}`)
    const codes = await Promise.all(newData.map(each => web3.eth.getCode(each)))
    codes.map((each, index) => {
        if (each === "0x") {
            newList.push(newData[index])
            usersList.push(newData[index])
        } else {
            newContractsList.push(newData[index])
            contractsList.push(newData[index])
        }
    })
    console.log(`content: ${newList}`)
    return {newList, newContractsList}
}

const main = async () => {
    let lastFetchedBlockNumber = fs.readFileSync("./fetched/LastFetchedBlockNumber.txt", {encoding: 'utf-8'})
    lastFetchedBlockNumber = Number(lastFetchedBlockNumber)
    let usersList = fs.readFileSync("./fetched/UsersList.txt", {encoding: 'utf-8'})
    usersList = usersList.split(/\r?\n/)
    let contractsList = fs.readFileSync("./fetched/ContractsList.txt", {encoding: 'utf-8'})
    contractsList = contractsList.split(/\r?\n/)
    while(true) {
        // test
        const time = Date.now()
        const lastBlockNumber = await getLatestBlockNumber()
        // test
        const fetchingLastBlockTime = ((Date.now() - time) / 1000).toFixed(2)
        const syncedPercent = (lastFetchedBlockNumber * 100 / lastBlockNumber).toFixed(2)
        console.log(`Current Block: ${lastFetchedBlockNumber}, Last Block: ${lastBlockNumber}, synced ${syncedPercent}%`)
        const fetchingBlocksCount = lastBlockNumber - lastFetchedBlockNumber > EACH_FETCHING_COUNT ? EACH_FETCHING_COUNT : lastBlockNumber - lastFetchedBlockNumber
        if (fetchingBlocksCount === 0) continue
        console.log(`fetching ${fetchingBlocksCount} blocks`)
        const fetchingBlocks = await Promise.all([...Array(fetchingBlocksCount).keys()].map(each => web3.eth.getBlock(lastFetchedBlockNumber + each + 1)))
        // test
        const fetchingBlocksTime = ((Date.now() - time) / 1000 - fetchingLastBlockTime).toFixed(2)
        const transactions = fetchingBlocks.map(each => each.transactions).reduce((a, b) => a.concat(b), [])
        let newUsers = []
        let newContracts = []
        if (transactions.length > 0) {
            let index = 0
            while(transactions.length > index) {
                const fetchingTransactionsCount = transactions.length - index > 100 ? 100 : transactions.length - index
                const transactionDetails = await Promise.all(transactions.slice(index, fetchingTransactionsCount).map(each => web3.eth.getTransaction(each)))
                let _newUsers = transactionDetails.map(each => each.from).concat(transactionDetails.map(each => each.to))
                const result = await getNewUsers(usersList, contractsList, _newUsers)
                newUsers = newUsers.concat(result.newList)
                newContracts = newContracts.concat(result.newContractsList)
                index += fetchingTransactionsCount
            }
        }
        // test
        const fetchingTransactionsTime = ((Date.now() - time) / 1000 - fetchingBlocksTime - fetchingLastBlockTime).toFixed(2)
        if (newUsers.length > 0) {
            let writeContent = newUsers.reduce((a,b) => a + b + "\r\n", "")
            fs.appendFileSync("./fetched/UsersList.txt", writeContent, {encoding: 'utf-8'})
        }
        if (newContracts.length > 0) {
            let writeContent = newContracts.reduce((a,b) => a + b + "\r\n", "")
            fs.appendFileSync("./fetched/ContractsList.txt", writeContent, {encoding: 'utf-8'})
        }
        lastFetchedBlockNumber += EACH_FETCHING_COUNT
        fs.writeFileSync("./fetched/LastFetchedBlockNumber.txt", lastFetchedBlockNumber.toString(), {encoding: 'utf-8'})
        // test
        const writeFileTime = ((Date.now() - time) / 1000 - fetchingTransactionsTime - fetchingBlocksTime - fetchingLastBlockTime).toFixed(2)
        console.log(`Total: ${((Date.now() - time) / 1000).toFixed(2)}s, last block: ${fetchingLastBlockTime}s, get blocks: ${fetchingBlocksTime}s, get transactions ${fetchingTransactionsTime}s, write file: ${writeFileTime}s`)
    }
    
}

main()

// const test = async () => {
//     console.log(await web3.eth.getCode("0x7Bbf300890857b8c241b219C6a489431669b3aFA") === "0x")
// }

// test()

// const test = async () => {
//     const time = Date.now()
//     const blockNumber = fs.readFileSync("./fetched/LastFetchedBlockNumber.txt", {encoding: 'utf-8'})
//     console.log(blockNumber)
//     console.log(`${((Date.now() - time) / 1000).toFixed(2)}s`)
//     let users = fs.readFileSync("./fetched/UsersList.txt", {encoding: 'utf-8'})
//     users = users.split(/\r?\n/)
//     console.log(users)
//     console.log(`${((Date.now() - time) / 1000).toFixed(2)}s`)
//     let newUsers = [
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C",
//         "0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C"
//     ]
//     let writeContent = newUsers.reduce((a,b) => a + b + "\r\n", "")
//     fs.appendFileSync("./fetched/UsersList.txt", writeContent, {
//         encoding: 'utf-8'
//     })
//     console.log(`${((Date.now() - time) / 1000).toFixed(2)}s`)
// }

// test()