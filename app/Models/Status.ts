import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@ioc:Adonis/Lucid/Orm'
import * as crypto from 'crypto'

export default class Status extends BaseModel {
  public static table = 'status'

  @column({ isPrimary: true })
  public id: string

  @column()
  public value: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeCreate()
  public static assignUuid(status: Status) {
    status.id = crypto.randomUUID()
  }
}
