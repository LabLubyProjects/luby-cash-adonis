import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from '../../Models/User'
import Database from '@ioc:Adonis/Lucid/Database'
import Role from 'App/Models/Role'
import { consume, produce } from 'App/Messaging/kafka'
import StoreAdminValidator from 'App/Validators/User/StoreAdminValidator'
import StoreClientValidator from 'App/Validators/User/StoreClientValidator'
import Status from 'App/Models/Status'
import UpdateUserValidator from 'App/Validators/User/UpdateUserValidator'

export default class UsersController {
  public async index({ request, response }: HttpContextContract) {
    const { page, perPage, ...inputs } = request.qs()

    try {
      if (page || perPage) {
        const users = await User.query()
          .preload('status')
          .filter(inputs)
          .paginate(page || 1, perPage || 10)
        const { meta, data } = users.serialize()
        const usersToReturn = data.filter((user) => user.status !== null)
        return response.ok({ meta, data: usersToReturn })
      }

      const users = await User.query().preload('status').filter(inputs)
      return response.ok(users.filter((user) => user.status !== null))
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
      const pendingStatus = await Status.findByOrFail('value', 'pending')
      await newAdmin.related('status').associate(pendingStatus)
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

    if (userByCpf?.email !== clientBody.email)
      return response.badRequest({ message: 'Inconsistent fields' })

    if (userByCpf && (await userByCpf.isClient()))
      return response.unprocessableEntity({ message: 'Already a client' })

    if (userByCpf && (await userByCpf.isDisapproved()))
      return response.badRequest({
        message: 'Unfortunately you already tried and you are not eligible to be a client',
      })

    clientBody.state = clientBody.state.toUpperCase()

    let idToProduce

    if (userByCpf && (await userByCpf.isAdmin())) {
      idToProduce = userByCpf.id
    } else {
      const transaction = await Database.transaction()
      let newClient

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
      idToProduce = newClient.id
    }

    delete clientBody.password
    await produce({ id: idToProduce, ...clientBody }, 'store-client')
    consume(['update-client-status'])
    return response.ok({ message: 'You will receive an email informing about your situation' })
  }

  public async update({ request, response, params, auth }: HttpContextContract) {
    await request.validate(UpdateUserValidator)
    const userId = params.id

    if (userId !== auth.user?.id && !(await auth.user?.isAdmin()))
      return response.forbidden({ message: 'You are not allowed to update this user' })

    const userBody = request.only([
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

    if (userBody.state) userBody.state = userBody.state.toUpperCase()

    const transaction = await Database.transaction()
    let updatedUser
    try {
      updatedUser = await User.find(userId)
      updatedUser.useTransaction(transaction)
      const { fullName, cpfNumber, email, password, phone, averageSalary, city, state, zipcode } =
        userBody
      await updatedUser.merge({ fullName, cpfNumber, email, password }).save()
      if (await updatedUser.isClient())
        await produce(
          {
            id: userId,
            fullName,
            cpfNumber,
            email,
            password,
            phone,
            averageSalary,
            city,
            state,
            zipcode,
          },
          'update-client'
        )
    } catch (error) {
      await transaction.rollback()
      return response.badRequest({ message: 'Error updating user' })
    }

    await transaction.commit()

    let userFind

    try {
      userFind = await User.query()
        .where('id', userId)
        .preload('roles', (rolesQuery) => rolesQuery.select('name', 'description'))
        .first()
    } catch (error) {
      return response.notFound({ message: 'User not found' })
    }

    return response.ok(userFind)
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
