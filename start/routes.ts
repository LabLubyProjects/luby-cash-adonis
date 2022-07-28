import Route from '@ioc:Adonis/Core/Route'

Route.where('id', Route.matchers.uuid())

// API VERSION 1.0
Route.group(() => {}).prefix('api/v1')
