/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class ExceptionHandler extends HttpExceptionHandler {
  constructor() {
    super(Logger)
  }

  public async handle(error: any, ctx: HttpContextContract) {
    if (error.code === 'E_UNAUTHORIZED_ACCESS')
      return ctx.response.unauthorized({ statusCode: 401, message: 'Invalid credentials' })
    if (error.code === 'E_ROUTE_NOT_FOUND')
      return ctx.response.badRequest({ statusCode: 404, message: 'Route not found' })
    if (error.code === 'E_VALIDATION_FAILURE') return ctx.response.status(422).send(error.messages)

    return ctx.response.internalServerError({ statusCode: 500, message: 'Internal Server Error' })
  }
}
