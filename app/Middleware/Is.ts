import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'

export default class Is {
  public async handle(
    { auth, response }: HttpContextContract,
    next: () => Promise<void>,
    guards?: string[]
  ) {
    const userId = auth.user?.id

    if (userId && guards) {
      const user = await User.query().where('id', userId).preload('roles').first()
      const isAllowed = user?.roles.some((role) =>
        guards.map((guard) => guard.toLowerCase()).includes(role.name.toLowerCase())
      )
      if (isAllowed) return next()
    }

    return response.forbidden({ statusCode: 403, message: 'Access denied' })
  }
}
