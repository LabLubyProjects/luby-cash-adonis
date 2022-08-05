import { BaseModelFilter } from '@ioc:Adonis/Addons/LucidFilter'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import { DateTime } from 'luxon'

export default class UserFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof User, User>

  public status(value: string): void {
    this.$query.preload('status', (status) => status.where('value', value))
  }

  public fromDate(value: string): void {
    const convertedDate = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm:ss').toString()
    this.$query.where('created_at', '>=', convertedDate)
  }

  public toDate(value: string): void {
    const convertedDate = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm:ss').toString()
    this.$query.where('created_at', '<=', convertedDate)
  }
}
