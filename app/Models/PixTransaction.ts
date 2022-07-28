import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import { compose } from '@ioc:Adonis/Core/Helpers'
import User from './User'
import { Filterable } from '@ioc:Adonis/Addons/LucidFilter'
import PixTransactionFilter from './Filters/PixTransactionFilter'

export default class PixTransaction extends compose(BaseModel, Filterable) {
  public static $filter = () => PixTransactionFilter

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
