import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class PixController {
  public async index({}: HttpContextContract) {}

  public async store({ request, response, auth }: HttpContextContract) {
    const sourceUserId = auth.user?.id
    // const { targetUserId, value } = request.only(['targetUserId', 'value'])
  }

  public async show({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
