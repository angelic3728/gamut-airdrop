/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts'
import { User } from '../types/schema'

export function createUser(address: Address): void {
  let user = User.load(address.toHexString())
  if (user === null) {
    user = new User(address.toHexString())
    user.save()
  }
}
