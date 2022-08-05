import { BaseModelFilter } from '@ioc:Adonis/Addons/LucidFilter'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import PixTransaction from 'App/Models/PixTransaction'
import { DateTime } from 'luxon'

export default class PixTransactionFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof PixTransaction, PixTransaction>

  public fromDate(value: string): void {
    const convertedDate = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm:ss').toString()
    this.$query.where('created_at', '>=', convertedDate)
  }

  public toDate(value: string): void {
    const convertedDate = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm:ss').toString()
    this.$query.where('created_at', '<=', convertedDate)
  }
}
