const fs = require('fs')

function mergeUsers(users) {
    console.log(`merging users lists`)
  let usersLength = users.map(each => each.length)
  let result = []
  let length = 0
  while(true) {
      let check = 0
      for(let i = 0; i < usersLength.length; i++){
          if (usersLength[i] > 0) check++
      }
      if (check < 2) break
      let firstElements = users.map(each => each[0])
      let smallestOne = firstElements.sort()[0]
      result.push(smallestOne)
      for(let j = 0; j < users.length; j++) {
          if (users[j][0] == smallestOne) {
              users[j].shift()
              usersLength[j] = usersLength[j] - 1
          }
      }
      length++
      if (length % 1000 == 0) console.log(length)
  }
  for(let k = 0; k < users.length; k++) {
      result = result.concat(users[k])
  }
  console.log(`total users: ${result.length}`)
  return result
}

const main = async () => {
    const data = fs.readFileSync(`./mergeDataWithOtherDex/dexUsersList.json`, {encoding:'utf8', flag:'r'})
    const dexUsers = JSON.parse(data)
    const kavaData = fs.readFileSync("./fetched/SortedUsersList.txt", {encoding: 'utf-8'})
    const kavaUsers = kavaData.split(/\r?\n/)
    kavaUsers.pop()
    const totalUsers = mergeUsers([dexUsers, kavaUsers])
    fs.writeFileSync(`./mergeDataWithOtherDex/All.json`, JSON.stringify(totalUsers))
}

main()
