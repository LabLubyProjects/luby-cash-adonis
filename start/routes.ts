import Route from '@ioc:Adonis/Core/Route'

Route.where('id', Route.matchers.uuid())

// API VERSION 1.0
Route.group(() => {
  // Public routes
  Route.group(() => {
    Route.post('clients', 'UsersController.storeClient')
  })

  // Authentication routes
  Route.group(() => {
    Route.post('login', 'AuthController.login')
    Route.post('forgot-password', 'AuthController.forgotPassword')
    Route.post('reset-password', 'AuthController.resetPassword')
  }).prefix('auth')

  // Client or Admin routes
  Route.group(() => {
    Route.get('clients/:id/statement', 'PixController.statement')
    Route.put('users/:id', 'UsersController.update')
    Route.get('users/:id', 'UsersController.show')
    Route.resource('pix-transactions', 'PixController').only(['store', 'show'])
  }).middleware(['auth', 'is:client,admin'])

  // Admin routes
  Route.group(() => {
    Route.post('admins', 'UsersController.storeAdmin')
    Route.put('admins/:id', 'UsersController.updateAdmin')
    Route.get('clients', 'UsersController.index')
    Route.delete('clients/:id', 'UsersController.destroy')
  }).middleware(['auth', 'is:admin'])
}).prefix('api/v1')
