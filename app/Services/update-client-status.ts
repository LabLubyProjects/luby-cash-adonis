import Role from 'App/Models/Role'
import Status from 'App/Models/Status'
import User from 'App/Models/User'

export interface UpdateUserStatusInput {
  userId: string
  statusValue: string
}

export async function updateClientStatus(input: string): Promise<void> {
  try {
    const inputPayload: UpdateUserStatusInput = JSON.parse(input)
    const newStatus = await Status.findByOrFail('value', inputPayload.statusValue)
    const client = await User.findOrFail(inputPayload.userId)
    await client.related('status').associate(newStatus)
    if (inputPayload.statusValue === 'approved') {
      const clientRole = await Role.findByOrFail('name', 'client')
      await client.related('roles').attach([clientRole.id])
    }
  } catch (error) {
    console.log(error)
  }
}
