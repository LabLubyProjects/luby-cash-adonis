import { schema, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CustomMessages from '../CustomMessages'

export default class StoreValidator extends CustomMessages {
  constructor(protected ctx: HttpContextContract) {
    super()
  }
  public schema = schema.create({
    targetCpfNumber: schema.string({}, [
      rules.regex(/^\d{3}.\d{3}.\d{3}-\d{2}$/),
      rules.exists({ table: 'users', column: 'cpf_number' }),
    ]),
    amount: schema.number([rules.unsigned()]),
  })
}
