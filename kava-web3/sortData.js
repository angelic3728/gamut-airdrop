const fs = require("fs")

const main = async () => {
    let data = fs.readFileSync("./fetched/UsersList.txt", {encoding: 'utf-8'})
    data = data.split(/\r?\n/)
    data.pop()
    data = data.map(each => each.toLowerCase())
    data = data.sort()
    let writeContent = data.reduce((a,b) => a + b + "\r\n", "")
    fs.writeFileSync("./fetched/SortedUsersList.txt", writeContent, {encoding: 'utf-8'})
}

main()