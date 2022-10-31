// get all users list from kava chain
    in fetched folder
        change data to 0 in LastFetchedBlockNumber.txt
        delete data in UsersList.txt and ContractsList.txt
    node index.js

// sort kava users list
    node sortData.js

// merge kava users with dex users
    copy and past dex users list file from dexUserList/data/All.json to ./mergeDataWithOtherDex/dexUsersList.json
    node mergeDataWithOtherDex/index.js

// final users list
    ./mergeDataWithOtherDex/All.json is the final users list
