import { DateTime } from 'luxon'
import {
  BaseModel,
  beforeCreate,
  beforeSave,
  BelongsTo,
  belongsTo,
  column,
  ManyToMany,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Hash from '@ioc:Adonis/Core/Hash'
import { compose } from '@ioc:Adonis/Core/Helpers'
import * as crypto from 'crypto'
import Status from './Status'
import Role from './Role'
import { Filterable } from '@ioc:Adonis/Addons/LucidFilter'
import UserFilter from './Filters/UserFilter'

export default class User extends compose(BaseModel, Filterable) {
  public static $filter = () => UserFilter

  @column({ isPrimary: true })
  public id: string

  @column()
  public fullName: string

  @column()
  public cpfNumber: string

  @column()
  public statusId: string

  @belongsTo(() => Status)
  public status: BelongsTo<typeof Status>

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column({ serializeAs: null })
  public passwordRecoverToken?: string

  @column({ serializeAs: null })
  public passwordRecoverTokenExpiration?: DateTime

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @manyToMany(() => Role, {
    pivotTable: 'user_roles',
  })
  public roles: ManyToMany<typeof Role>

  @beforeCreate()
  public static assignUuid(user: User) {
    user.id = crypto.randomUUID()
  }

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) user.password = await Hash.make(user.password)
  }

  public async isAdmin() {
    const userWithRoles = await User.query().where('id', this.id).preload('roles').first()
    return userWithRoles?.roles.some((role) => role.name === 'admin')
  }

  public async isClient() {
    const userWithRoles = await User.query().where('id', this.id).preload('roles').first()
    return userWithRoles?.roles.some((role) => role.name === 'client')
  }

  public async isDisapproved() {
    const userWithStatus = await User.query().where('id', this.id).preload('status').first()
    return userWithStatus?.status.value === 'disapproved'
  }
}
