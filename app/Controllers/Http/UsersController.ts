import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from '../../Models/User'
import Database from '@ioc:Adonis/Lucid/Database'
import Role from 'App/Models/Role'
import { produce } from 'App/messaging/kafka'

export default class UsersController {
  public async index({ response }: HttpContextContract) {
    const users = await User.all()
    if (users.length === 0) return response.notFound({ message: 'No users found' })
    return response.ok(users)
  }

  public async show({ params, response }: HttpContextContract) {
    const userId = params.id
    const user = await User.find(userId)

    if (!user) return response.notFound({ message: 'User not found' })

    return response.ok(user)
  }

  public async storeAdmin({ request, response }: HttpContextContract) {
    const adminBody = request.only(['fullName', 'cpfNumber', 'email', 'password'])
    const transaction = await Database.transaction()

    let newAdmin = new User()
    try {
      newAdmin.useTransaction(transaction)
      newAdmin.fill(adminBody)
      await newAdmin.save()
      const adminRole = await Role.findByOrFail('name', 'admin')
      await newAdmin.related('roles').attach([adminRole.id], transaction)
    } catch (error) {
      await transaction.rollback()
      return response.badRequest({ message: 'Error creating admin' })
    }

    await transaction.commit()

    let adminFind

    try {
      adminFind = await User.query()
        .where('id', newAdmin.id)
        .preload('roles', (rolesQuery) => rolesQuery.select('name', 'description'))
        .first()
    } catch (error) {
      return response.notFound({ message: 'Admin not found' })
    }

    return response.created(adminFind)
  }

  public async storeClient({ request, response }: HttpContextContract) {
    const clientBody = request.only([
      'fullName',
      'cpfNumber',
      'email',
      'password',
      'phone',
      'averageSalary',
      'city',
      'state',
      'zipcode',
    ])
    clientBody.state = clientBody.state.toUpperCase()
    const transaction = await Database.transaction()

    let newClient = new User()
    try {
      newClient.useTransaction(transaction)
      newClient.merge(clientBody)
      const clientRole = await Role.findByOrFail('name', 'client')
      await newClient.related('roles').attach([clientRole.id], transaction)
      await newClient.save()
    } catch (error) {
      await transaction.rollback()
      return response.badRequest({ message: 'Error creating client' })
    }

    await transaction.commit()

    await produce(clientBody, 'store-client')
    return response.ok({ message: 'You will receive an email informing about your situation' })
  }

  public async updateAdmin({ request, response, params, auth }: HttpContextContract) {
    const adminId = params.id

    if (adminId !== auth.user?.id)
      return response.forbidden({ message: 'You are not allowed to update this admin' })

    const adminBody = request.only(['fullName', 'cpfNumber', 'email', 'password'])
    const transaction = await Database.transaction()
    let updatedAdmin
    try {
      updatedAdmin = await User.find(adminId)
      updatedAdmin.useTransaction(transaction)
      await updatedAdmin.merge(adminBody).save()
    } catch (error) {
      await transaction.rollback()
      return response.badRequest({ message: 'Error updating admin' })
    }

    await transaction.commit()

    let adminFind

    try {
      adminFind = await User.query()
        .where('id', updatedAdmin.id)
        .preload('roles', (rolesQuery) => rolesQuery.select('name', 'description'))
        .first()
    } catch (error) {
      return response.notFound({ message: 'Admin not found' })
    }

    return response.ok(adminFind)
  }

  public async destroy({ params, response }: HttpContextContract) {
    const userId = params.id
    const user = await User.find(userId)

    if (!user) return response.notFound({ message: 'User not found' })

    await user.delete()
    return response.ok(user)
  }
}
