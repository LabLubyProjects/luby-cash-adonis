import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Status from 'App/Models/Status'

export default class extends BaseSeeder {
  public async run() {
    const uniqueKey = 'value'

    await Status.updateOrCreateMany(uniqueKey, [
      {
        value: 'approved',
      },
      {
        value: 'disapproved',
      },
      {
        value: 'pending',
      },
    ])
  }
}
