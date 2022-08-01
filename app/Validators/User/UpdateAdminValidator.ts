import { schema, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CustomMessages from '../CustomMessages'

export default class UpdateAdminValidator extends CustomMessages {
  constructor(protected ctx: HttpContextContract) {
    super()
  }

  public refs = schema.refs({
    id: this.ctx.params.id,
  })

  public schema = schema.create({
    fullName: schema.string.optional({ trim: true }, [
      rules.maxLength(50),
      rules.minLength(3),
      rules.regex(/^[a-zA-ZÀ-ÿ\s\u00f1\u00d1]*$/g),
    ]),
    cpfNumber: schema.string.optional({}, [
      rules.regex(/^\d{3}.\d{3}.\d{3}-\d{2}$/),
      rules.unique({
        table: 'users',
        column: 'cpf_number',
        whereNot: {
          id: this.refs.id,
        },
      }),
    ]),
    email: schema.string.optional({ trim: true }, [
      rules.maxLength(50),
      rules.minLength(3),
      rules.email(),
      rules.unique({
        table: 'users',
        column: 'email',
        whereNot: {
          id: this.refs.id,
        },
        caseInsensitive: true,
      }),
    ]),
    password: schema.string.optional({}, [rules.maxLength(50)]),
  })
}
