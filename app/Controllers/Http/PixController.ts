import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import PixTransaction from 'App/Models/PixTransaction'
import { produce } from 'App/Messaging/kafka'

export default class PixController {
  public async index({}: HttpContextContract) {}

  public async store({ request, response, auth }: HttpContextContract) {
    const sourceUserId = auth.user?.id
    const { targetUserId, amount } = request.only(['targetUserId', 'amount'])

    if (!(await auth.user?.isClient()))
      return response.forbidden({ message: 'You are not an eligible client' })

    if (sourceUserId === targetUserId)
      return response.badRequest({ message: "You can't send money to yourself" })

    const targetUser = await User.find(targetUserId)
    if (!targetUser) return response.notFound({ message: 'Target user not found' })
    if (!(await targetUser.isClient()))
      return response.forbidden({ message: 'Target user is not an eligible client' })

    const sourceUserFromMicroServiceResponse = await axios.get(
      `${Env.get('MS_CLIENTS_BASE_URL')}/clients/${sourceUserId}`
    )
    if (sourceUserFromMicroServiceResponse.status !== 200)
      return response
        .status(sourceUserFromMicroServiceResponse.status)
        .json({ message: sourceUserFromMicroServiceResponse.data.message })

    if (sourceUserFromMicroServiceResponse.data.currentBalance < amount)
      return response.badRequest({ message: 'You current balance is lower than the amount' })

    const transactionResponse = await axios.post(`${Env.get('MS_CLIENTS_BASE_URL')}/transaction`, {
      sourceUserId,
      targetUserId,
      amount,
    })

    if (transactionResponse.status !== 200)
      return response.internalServerError({ message: 'Internal Server Error' })
    try {
      await PixTransaction.create({
        sourceUserId,
        targetUserId,
        value: amount,
      })
      await produce(
        {
          sourceUserName: auth.user?.fullName,
          sourceUserEmail: auth.user?.email,
          targetUserName: targetUser.fullName,
          targetUserEmail: targetUser.email,
        },
        'new-pix-transaction'
      )
    } catch (error) {
      return response.badRequest({ message: 'Failed performing transaction' })
    }
    return response.created({ message: 'Transaction performed successfully' })
  }

  public async show({}: HttpContextContract) {}
}
