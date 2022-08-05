import { schema, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CustomMessages from '../CustomMessages'

export default class StoreClientValidator extends CustomMessages {
  constructor(protected ctx: HttpContextContract) {
    super()
  }

  public schema = schema.create({
    fullName: schema.string({ trim: true }, [
      rules.maxLength(50),
      rules.minLength(3),
      rules.regex(/^[a-zA-ZÀ-ÿ\s\u00f1\u00d1]*$/g),
    ]),
    cpfNumber: schema.string({}, [rules.regex(/^\d{3}.\d{3}.\d{3}-\d{2}$/)]),
    email: schema.string({ trim: true }, [rules.maxLength(50), rules.minLength(3), rules.email()]),
    password: schema.string({}, [rules.maxLength(50)]),
    phone: schema.string({ trim: true }, [
      rules.mobile({
        locale: ['pt-BR'],
      }),
    ]),
    averageSalary: schema.number([rules.unsigned()]),
    city: schema.string({ trim: true }, [rules.minLength(2), rules.maxLength(60)]),
    state: schema.string({ trim: true }, [rules.minLength(2), rules.maxLength(2)]),
    zipcode: schema.string({ trim: true }, [rules.regex(/[0-9]{5}-[0-9]{3}/)]),
  })
}
