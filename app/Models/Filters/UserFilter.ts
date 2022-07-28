import { BaseModelFilter } from '@ioc:Adonis/Addons/LucidFilter'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'

export default class UserFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof User, User>

  public status(value: string): void {
    this.$query.where('status', value)
  }

  public fromDate(value: string): void {
    this.$query.where('created_at', '>=', value)
  }

  public toDate(value: string): void {
    this.$query.where('created_at', '<=', value)
  }
}
