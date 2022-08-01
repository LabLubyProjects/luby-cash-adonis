import { schema, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CustomMessages from '../CustomMessages'

export default class ForgotPasswordValidator extends CustomMessages {
  constructor(protected ctx: HttpContextContract) {
    super()
  }
  public schema = schema.create({
    email: schema.string({ trim: true }, [
      rules.maxLength(50),
      rules.minLength(3),
      rules.email(),
      rules.exists({ table: 'users', column: 'email' }),
    ]),
  })
}
