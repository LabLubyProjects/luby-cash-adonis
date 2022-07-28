import { BaseModelFilter } from '@ioc:Adonis/Addons/LucidFilter'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import PixTransaction from 'App/Models/PixTransaction'

export default class PixTransactionFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof PixTransaction, PixTransaction>

  public fromDate(value: string): void {
    this.$query.where('created_at', '>=', value)
  }

  public toDate(value: string): void {
    this.$query.where('created_at', '<=', value)
  }
}
