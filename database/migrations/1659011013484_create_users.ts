import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('full_name', 50).notNullable()
      table.string('cpf_number', 14).unique().notNullable()
      table
        .uuid('status')
        .references('id')
        .inTable('status')
        .notNullable()
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('email', 50).unique().notNullable()
      table.string('password').notNullable()
      table.string('password_recover_token', 40)
      table.timestamp('password_recover_token_expiration', { useTz: true })
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
