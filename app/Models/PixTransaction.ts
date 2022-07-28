import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import User from './User'

export default class PixTransaction extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @belongsTo(() => User)
  public sourceUserId: BelongsTo<typeof User>

  @belongsTo(() => User)
  public targetUserId: BelongsTo<typeof User>

  @column()
  public value: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime
}
