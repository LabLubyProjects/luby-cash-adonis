import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import PixTransaction from 'App/Models/PixTransaction'
import { produce } from 'App/Messaging/kafka'

export default class PixController {
  public async statement({ params, response, request, auth }: HttpContextContract) {
    const clientId = params.id

    if (auth.user?.id !== clientId && !(await auth.user?.isAdmin()))
      return response.forbidden({ message: 'You are not allowed to view this bank statement' })

    const { page, perPage, ...inputs } = request.qs()

    try {
      if (page || perPage) {
        const pixTransactions = await PixTransaction.query()
          .where('source_user_id', clientId)
          .orWhere('target_user_id', clientId)
          .orderBy('created_at', 'desc')
          .filter(inputs)
          .paginate(page || 1, perPage || 10)

        return response.ok(pixTransactions)
      }

      const pixTransactions = await PixTransaction.query()
        .where('source_user_id', clientId)
        .orWhere('target_user_id', clientId)
        .orderBy('created_at', 'desc')
        .filter(inputs)

      return response.ok(pixTransactions)
    } catch (error) {
      return response.badRequest({ statusCode: 400, message: 'Error fetching bank statement' })
    }
  }

  public async store({ request, response, auth }: HttpContextContract) {
    const sourceUserId = auth.user?.id
    const { targetCpfNumber, amount } = request.only(['targetCpfNumber', 'amount'])

    if (!(await auth.user?.isClient()))
      return response.forbidden({ message: 'You are not an eligible client' })

    const targetUser = await User.findBy('cpf_number', targetCpfNumber)

    if (sourceUserId === targetUser!.id)
      return response.badRequest({ message: "You can't send money to yourself" })

    if (!(await targetUser!.isClient()))
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
      targetUserId: targetUser!.id,
      amount,
    })

    if (transactionResponse.status !== 200)
      return response.internalServerError({ message: 'Internal Server Error' })
    try {
      await PixTransaction.create({
        sourceUserId,
        targetUserId: targetUser!.id,
        value: amount,
      })
      await produce(
        {
          sourceUserName: auth.user?.fullName,
          email: auth.user?.email,
          targetUserName: targetUser!.fullName,
        },
        'new-pix-sent'
      )
      await produce(
        {
          sourceUserName: auth.user?.fullName,
          targetUserName: targetUser!.fullName,
          email: targetUser!.email,
        },
        'new-pix-received'
      )
    } catch (error) {
      return response.badRequest({ message: 'Failed performing transaction' })
    }
    return response.created({ message: 'Transaction performed successfully' })
  }

  public async show({ params, response }: HttpContextContract) {
    const pixTransactionId = params.id
    const pixTransaction = await PixTransaction.find(pixTransactionId)

    if (!pixTransaction) return response.notFound({ message: 'Pix transaction not found' })

    return response.ok(pixTransaction)
  }
}
