import { updateClientStatus } from 'App/Services/update-client-status'
import { Consumer, Kafka, Producer } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'luby-cash',
  brokers: ['localhost:9092'],
})

export class KafkaSingleton {
  private static _consumer: Consumer | null = null
  private static _producer: Producer | null = null

  public static async getConsumer() {
    if (this._consumer) return this._consumer
    this._consumer = kafka.consumer({ groupId: 'main-api' })
    await this._consumer.connect()
    return this._consumer
  }

  public static async getProducer() {
    if (this._producer) return this._producer
    this._producer = kafka.producer()
    await this._producer.connect()
    return this._producer
  }

  public static async shutdown() {
    if (this._consumer) {
      await this._consumer.disconnect()
      this._consumer = null
    }
    if (this._producer) {
      await this._producer.disconnect()
      this._producer = null
    }
  }
}

export async function consume(topics: string[]) {
  const consumer = await KafkaSingleton.getConsumer()
  await consumer.subscribe({ topics })
  await consumer.run({
    eachMessage: async ({ message, topic }) => {
      switch (topic) {
        case 'update-client-status':
          await updateClientStatus(message.value!.toString())
          break
      }
    },
  })
}

export async function produce(message: any, topic: string): Promise<void> {
  const producer = await KafkaSingleton.getProducer()
  await producer.send({
    topic: topic,
    messages: [{ value: JSON.stringify(message) }],
  })
}
