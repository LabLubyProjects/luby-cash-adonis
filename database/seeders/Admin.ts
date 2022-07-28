import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Role from 'App/Models/Role'
import User from 'App/Models/User'
import Status from 'App/Models/Status'

export default class extends BaseSeeder {
  public async run() {
    let admin = await User.findBy('email', 'admin@admin.com')

    if (!admin) {
      admin = await User.create({
        fullName: 'Admin',
        cpfNumber: '000.000.000-00',
        email: 'admin@admin.com',
        password: 'admin123',
      })
      const roleAdmin = await Role.findBy('name', 'admin')
      const roleClient = await Role.findBy('name', 'player')
      const statusApproved = await Status.findBy('value', 'approved')

      if (roleAdmin) await admin.related('roles').attach([roleAdmin.id])
      if (roleClient) await admin.related('roles').attach([roleClient.id])
      if (statusApproved) await statusApproved.related('users').associate(admin)
    }
  }
}
