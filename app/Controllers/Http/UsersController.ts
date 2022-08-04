import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from '../../Models/User'
import Database from '@ioc:Adonis/Lucid/Database'
import Role from 'App/Models/Role'
import { consume, produce } from 'App/Messaging/kafka'
import StoreAdminValidator from 'App/Validators/User/StoreAdminValidator'
import StoreClientValidator from 'App/Validators/User/StoreClientValidator'
import Status from 'App/Models/Status'
import UpdateAdminValidator from 'App/Validators/User/UpdateAdminValidator'
import UpdateClientValidator from 'App/Validators/User/UpdateClientValidator'

export default class UsersController {
  public async index({ request, response }: HttpContextContract) {
    const { page, perPage, ...inputs } = request.qs()

    try {
      if (page || perPage) {
        const users = await User.query()
          .preload('roles', (role) => role.select('name', 'description').where('name', 'client'))
          .filter(inputs)
          .paginate(page || 1, perPage || 10)

        return response.ok(users)
      }

      const users = await User.query()
        .preload('roles', (role) => role.select('name', 'description').where('name', 'client'))
        .filter(inputs)

      return response.ok(users)
    } catch (error) {
      return response.badRequest({ statusCode: 400, message: 'Error fetching users' })
    }
  }

  public async show({ params, response }: HttpContextContract) {
    const userId = params.id
    const user = await User.find(userId)

    if (!user) return response.notFound({ message: 'User not found' })

    return response.ok(user)
  }

  public async storeAdmin({ request, response }: HttpContextContract) {
    await request.validate(StoreAdminValidator)
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
    await request.validate(StoreClientValidator)
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

    const userByCpf = await User.findBy('cpf_number', clientBody.cpfNumber)

    if (userByCpf && (await userByCpf.isClient()))
      return response.unprocessableEntity({ message: 'Already a client' })

    if (userByCpf && (await userByCpf.isDisapproved()))
      return response.badRequest({
        message: 'Unfortunately you already tried and you are not eligible to be a client',
      })

    clientBody.state = clientBody.state.toUpperCase()

    let newClient

    if (userByCpf && (await userByCpf.isAdmin())) {
      newClient = userByCpf
    } else {
      const transaction = await Database.transaction()

      try {
        newClient = new User()
        newClient.useTransaction(transaction)
        const { fullName, cpfNumber, email, password } = clientBody
        newClient.fill({ fullName, cpfNumber, email, password })
        const pendingStatus = await Status.findByOrFail('value', 'pending')
        await newClient.related('status').associate(pendingStatus)
        await newClient.save()
      } catch (error) {
        await transaction.rollback()
        return response.badRequest({ message: 'Error creating client' })
      }
      await transaction.commit()
    }

    delete clientBody.password
    await produce({ id: newClient.id, ...clientBody }, 'store-client')
    consume(['update-client-status'])
    return response.ok({ message: 'You will receive an email informing about your situation' })
  }

  public async updateAdmin({ request, response, params, auth }: HttpContextContract) {
    await request.validate(UpdateAdminValidator)
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
      if (await updatedAdmin.isClient()) await produce(updatedAdmin, 'update-client')
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

  public async updateClient({ request, response, params, auth }: HttpContextContract) {
    await request.validate(UpdateClientValidator)
    const clientId = params.id
    if (clientId !== auth.user?.id && !(await auth.user?.isAdmin()))
      return response.forbidden({ message: 'You are not allowed to update this client' })

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

    await produce({ id: clientId, ...clientBody }, 'update-client')

    let updatedClient

    const transaction = await Database.transaction()

    try {
      updatedClient = await User.find(clientId)
      updatedClient.useTransaction(transaction)
      await updatedClient.merge(clientBody).save()
    } catch (error) {
      await transaction.rollback()
      return response.badRequest({ statusCode: 400, message: 'Error updating client' })
    }
    await transaction.commit()
    let clientFind
    try {
      clientFind = await User.find(clientId)
    } catch (error) {
      return response.notFound({ statusCode: 404, message: 'Error finding client' })
    }

    return response.ok(clientFind)
  }

  public async destroy({ params, response }: HttpContextContract) {
    const userId = params.id
    const user = await User.find(userId)

    if (!user) return response.notFound({ message: 'User not found' })

    if (await user.isClient()) await produce({ clientId: userId }, 'delete-client')

    await user.delete()
    return response.ok(user)
  }
}
