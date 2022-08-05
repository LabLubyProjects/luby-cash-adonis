import { updateClientStatus } from 'App/Services/update-client-status'
import { Consumer, Kafka, Producer } from 'kafkajs'
import Env from '@ioc:Adonis/Core/Env'

const kafka = new Kafka({
  clientId: 'luby-cash',
  brokers: [Env.get('KAFKA_CONNECTION')],
})

const subscribedTopics: string[] = []

export class KafkaSingleton {
  private static _consumer: Consumer | null = null
  private static _producer: Producer | null = null

  public static async getConsumer() {
    if (this._consumer) return this._consumer
    this._consumer = kafka.consumer({ groupId: 'api-cash' })
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

function isAlreadySubscribed(topic: string): boolean {
  return subscribedTopics.includes(topic)
}

export async function consume(topics: string[]) {
  const consumer = await KafkaSingleton.getConsumer()
  topics.forEach((topic) => {
    if (!isAlreadySubscribed(topic)) {
      subscribedTopics.push(topic)
      consumer.subscribe({ topics })
    }
  })
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
    acks: 0,
    messages: [{ value: JSON.stringify(message) }],
  })
}
